-- Add column to track if invoice was issued
ALTER TABLE public.contracts ADD COLUMN nf_emitida boolean NOT NULL DEFAULT false;