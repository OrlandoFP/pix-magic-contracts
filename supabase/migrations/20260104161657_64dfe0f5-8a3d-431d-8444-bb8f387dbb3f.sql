-- Add acceptance/signature fields to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS acceptance_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS client_ip TEXT,
ADD COLUMN IF NOT EXISTS client_user_agent TEXT;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_contracts_acceptance_token ON public.contracts(acceptance_token);

-- Create RLS policy for public access to contracts via token (for acceptance page)
CREATE POLICY "Public can view contracts by token" 
ON public.contracts 
FOR SELECT 
USING (acceptance_token IS NOT NULL);

CREATE POLICY "Public can update contract acceptance" 
ON public.contracts 
FOR UPDATE 
USING (acceptance_token IS NOT NULL)
WITH CHECK (acceptance_token IS NOT NULL);