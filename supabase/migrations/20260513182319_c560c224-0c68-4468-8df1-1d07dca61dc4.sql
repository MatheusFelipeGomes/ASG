
-- =========================================================
-- PIX EMBARCADO — Schema de produção
-- =========================================================

-- Drop legacy demo table if present (replaced by payments)
DROP TABLE IF EXISTS public.pix_charges CASCADE;
DROP TYPE IF EXISTS public.pix_status CASCADE;

-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.payment_status AS ENUM (
  'pending', 'paid', 'expired', 'cancelled', 'failed'
);

CREATE TYPE public.device_status AS ENUM (
  'active', 'inactive', 'maintenance'
);

CREATE TYPE public.transaction_type AS ENUM (
  'payment', 'refund', 'adjustment'
);

CREATE TYPE public.access_result AS ENUM (
  'granted', 'denied', 'error'
);

-- =========================================================
-- DEVICES
-- =========================================================
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uid TEXT NOT NULL UNIQUE,                 -- ID físico do Raspberry (ex.: serial)
  name TEXT NOT NULL,
  location TEXT,
  public_key TEXT,                                 -- ed25519 pubkey for request signing
  status public.device_status NOT NULL DEFAULT 'active',
  firmware_version TEXT,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_status ON public.devices(status);
CREATE INDEX idx_devices_last_seen ON public.devices(last_seen_at DESC);

-- =========================================================
-- PAYMENTS (Pix charges)
-- =========================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txid TEXT NOT NULL UNIQUE,                       -- Pix txid (Efí/Gerencianet)
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status public.payment_status NOT NULL DEFAULT 'pending',
  qr_code TEXT NOT NULL,                           -- copia-e-cola
  qr_code_image TEXT,                              -- base64 / URL
  end_to_end_id TEXT,                              -- E2E ID returned by PSP on payment
  payer_document TEXT,                             -- CPF/CNPJ do pagador (opcional)
  payer_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_device_created ON public.payments(device_id, created_at DESC);
CREATE INDEX idx_payments_status ON public.payments(status) WHERE status = 'pending';
CREATE INDEX idx_payments_status_all ON public.payments(status);
CREATE INDEX idx_payments_expires_at ON public.payments(expires_at) WHERE status = 'pending';
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at DESC) WHERE paid_at IS NOT NULL;
CREATE INDEX idx_payments_e2e ON public.payments(end_to_end_id) WHERE end_to_end_id IS NOT NULL;

-- =========================================================
-- TRANSACTIONS (immutable financial ledger)
-- =========================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
  type public.transaction_type NOT NULL DEFAULT 'payment',
  amount_cents INTEGER NOT NULL,
  end_to_end_id TEXT,
  psp_payload JSONB NOT NULL DEFAULT '{}'::jsonb,  -- raw webhook payload
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_payment ON public.transactions(payment_id);
CREATE INDEX idx_tx_device_occurred ON public.transactions(device_id, occurred_at DESC);
CREATE INDEX idx_tx_e2e ON public.transactions(end_to_end_id) WHERE end_to_end_id IS NOT NULL;
CREATE INDEX idx_tx_type ON public.transactions(type);

-- =========================================================
-- ACCESS LOG (turnstile releases)
-- =========================================================
CREATE TABLE public.access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
  result public.access_result NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_device_occurred ON public.access_log(device_id, occurred_at DESC);
CREATE INDEX idx_access_payment ON public.access_log(payment_id);

-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,                             -- user id, device uid, "system", "webhook"
  action TEXT NOT NULL,                            -- e.g. "payment.create", "device.update"
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor_created ON public.audit_logs(actor, created_at DESC);
CREATE INDEX idx_audit_action_created ON public.audit_logs(action, created_at DESC);

-- =========================================================
-- TRIGGERS — updated_at
-- =========================================================
CREATE TRIGGER trg_devices_updated
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TRIGGER — auto create transaction on payment confirmation
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_transaction_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    INSERT INTO public.transactions (
      payment_id, device_id, type, amount_cents, end_to_end_id, psp_payload, occurred_at
    ) VALUES (
      NEW.id, NEW.device_id, 'payment', NEW.amount_cents, NEW.end_to_end_id,
      COALESCE(NEW.metadata, '{}'::jsonb), NEW.paid_at
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_create_tx
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.create_transaction_on_paid();

-- =========================================================
-- TRIGGER — block updates/deletes on immutable tables
-- =========================================================
CREATE OR REPLACE FUNCTION public.block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_tx_no_update BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();
CREATE TRIGGER trg_tx_no_delete BEFORE DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.devices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;

-- DEVICES: anon may read its own row by device_uid only via server fns.
-- For terminal kiosk (anon), allow read of active devices (no secrets in row).
CREATE POLICY "anon read active devices"
  ON public.devices FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- PAYMENTS: terminals (anon) may insert pending charges and read/update their own.
-- In production, scope by device via server functions; here we allow read/insert
-- and restrict updates to non-paid transitions (final state set by webhook/service-role).
CREATE POLICY "anon read payments"
  ON public.payments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon insert pending payment"
  ON public.payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "anon cancel/expire own pending payment"
  ON public.payments FOR UPDATE
  TO anon, authenticated
  USING (status = 'pending')
  WITH CHECK (status IN ('pending', 'expired', 'cancelled'));

-- TRANSACTIONS: read-only for clients; writes only via service-role (webhook/trigger)
CREATE POLICY "anon read transactions"
  ON public.transactions FOR SELECT
  TO anon, authenticated
  USING (true);

-- ACCESS LOG: terminals may insert their own; everyone may read (no PII)
CREATE POLICY "anon read access log"
  ON public.access_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon insert access log"
  ON public.access_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- AUDIT LOGS: no client read/write. Only service-role (bypasses RLS).
-- (no policies = deny-all for anon/authenticated)

-- =========================================================
-- REALTIME
-- =========================================================
ALTER TABLE public.payments    REPLICA IDENTITY FULL;
ALTER TABLE public.devices     REPLICA IDENTITY FULL;
ALTER TABLE public.access_log  REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_log;
