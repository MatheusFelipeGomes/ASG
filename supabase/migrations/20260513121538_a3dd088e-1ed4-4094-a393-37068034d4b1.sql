-- Status enum
CREATE TYPE public.pix_status AS ENUM ('pending', 'paid', 'expired', 'cancelled');

-- Pix charges table
CREATE TABLE public.pix_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  txid TEXT UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  qr_code TEXT NOT NULL,
  qr_code_image TEXT,
  status public.pix_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pix_charges_device ON public.pix_charges(device_id, created_at DESC);
CREATE INDEX idx_pix_charges_status ON public.pix_charges(status);

ALTER TABLE public.pix_charges ENABLE ROW LEVEL SECURITY;

-- Kiosk terminals are unauthenticated; allow public access scoped by device_id at app layer.
CREATE POLICY "Public can read pix charges"
  ON public.pix_charges FOR SELECT
  USING (true);

CREATE POLICY "Public can insert pix charges"
  ON public.pix_charges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update pix charges"
  ON public.pix_charges FOR UPDATE
  USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pix_charges_updated_at
  BEFORE UPDATE ON public.pix_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.pix_charges REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_charges;