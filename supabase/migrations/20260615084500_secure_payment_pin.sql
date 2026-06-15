-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the trigger function to automatically hash plaintext payment_pin on insert/update
CREATE OR REPLACE FUNCTION public.hash_payment_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_pin IS NOT NULL AND NEW.payment_pin NOT LIKE '$%' AND (TG_OP = 'INSERT' OR OLD.payment_pin IS NULL OR NEW.payment_pin <> OLD.payment_pin) THEN
    -- Hash the PIN using bcrypt from pgcrypto
    NEW.payment_pin := crypt(NEW.payment_pin, gen_salt('bf', 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to public.users table
DROP TRIGGER IF EXISTS trigger_hash_payment_pin ON public.users;
CREATE TRIGGER trigger_hash_payment_pin
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.hash_payment_pin();

-- Hash existing plaintext payment_pins (non-null and not starting with '$')
UPDATE public.users
SET payment_pin = crypt(payment_pin, gen_salt('bf', 8))
WHERE payment_pin IS NOT NULL AND payment_pin NOT LIKE '$%';

-- Create the verify_payment_pin RPC function for server-side verification
CREATE OR REPLACE FUNCTION public.verify_payment_pin(pin_input VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hashed_pin VARCHAR;
BEGIN
  SELECT payment_pin INTO v_hashed_pin
  FROM public.users
  WHERE id = auth.uid();

  IF v_hashed_pin IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_hashed_pin = crypt(pin_input, v_hashed_pin);
END;
$$;

-- Create the has_payment_pin RPC function to securely check if a PIN is set
CREATE OR REPLACE FUNCTION public.has_payment_pin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND payment_pin IS NOT NULL
  );
END;
$$;
