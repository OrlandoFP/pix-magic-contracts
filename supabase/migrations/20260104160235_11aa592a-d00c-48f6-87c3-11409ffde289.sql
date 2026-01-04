-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Add columns for document URLs
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS signed_contract_url TEXT,
ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;

-- Storage policies for contract documents
CREATE POLICY "Anyone can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Anyone can view contract documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-documents');

CREATE POLICY "Anyone can update contract documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contract-documents');

CREATE POLICY "Anyone can delete contract documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contract-documents');