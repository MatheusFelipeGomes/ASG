
-- Fix: search_path on block_mutation
CREATE OR REPLACE FUNCTION public.block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only', TG_TABLE_NAME;
END;
$$;

-- Lock down SECURITY DEFINER functions: triggers run as table owner regardless,
-- so revoke direct EXECUTE from clients.
REVOKE EXECUTE ON FUNCTION public.create_transaction_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_mutation()             FROM PUBLIC, anon, authenticated;

-- Tighten "always true" INSERT policies with minimal but real checks
DROP POLICY IF EXISTS "anon insert pending payment" ON public.payments;
CREATE POLICY "anon insert pending payment"
  ON public.payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND amount_cents > 0
    AND expires_at > now()
    AND paid_at IS NULL
  );

DROP POLICY IF EXISTS "anon insert access log" ON public.access_log;
CREATE POLICY "anon insert access log"
  ON public.access_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    device_id IS NOT NULL
    AND result IN ('granted', 'denied', 'error')
  );
