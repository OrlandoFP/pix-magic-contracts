-- Add quantidade_pessoas column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN quantidade_pessoas integer DEFAULT 1;