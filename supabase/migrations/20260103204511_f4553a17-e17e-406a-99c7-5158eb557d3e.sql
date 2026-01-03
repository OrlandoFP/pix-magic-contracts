-- Add hospede_disney column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN hospede_disney boolean NOT NULL DEFAULT false;