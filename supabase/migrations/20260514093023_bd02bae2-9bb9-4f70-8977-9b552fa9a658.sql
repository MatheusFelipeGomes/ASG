-- 1. Remove public SELECT on transactions and access_log (sensitive financial / access data)
DROP POLICY IF EXISTS "anon read transactions" ON public.transactions;
DROP POLICY IF EXISTS "anon read access log" ON public.access_log;

-- 2. Remove dangerous unscoped UPDATE on payments (anyone could cancel/expire any payment)
DROP POLICY IF EXISTS "anon cancel/expire own pending payment" ON public.payments;

-- 3. Column-level restriction on payments: anon/authenticated can only SELECT non-sensitive cols.
--    RLS still passes (policy uses true), but column grants prevent reading payer identity etc.
REVOKE SELECT ON public.payments FROM anon, authenticated;
GRANT SELECT (
  id, txid, device_id, amount_cents, status, qr_code,
  expires_at, paid_at, cancelled_at, created_at, updated_at
) ON public.payments TO anon, authenticated;