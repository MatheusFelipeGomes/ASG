
CREATE POLICY "anon self-register device"
  ON public.devices FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'active' AND device_uid IS NOT NULL AND name IS NOT NULL);
