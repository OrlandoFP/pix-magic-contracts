-- Add umbler_chat_url column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN umbler_chat_url TEXT;