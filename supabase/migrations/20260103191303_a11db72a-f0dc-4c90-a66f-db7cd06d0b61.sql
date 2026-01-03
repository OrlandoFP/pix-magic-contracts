-- Create contracts table to store all generated contracts
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cep TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  datas_requeridas TEXT NOT NULL,
  nome_guia TEXT NOT NULL,
  quantidade_dias INTEGER NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert contracts (public form)
CREATE POLICY "Anyone can create contracts"
ON public.contracts
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view contracts (for now - can add auth later)
CREATE POLICY "Anyone can view contracts"
ON public.contracts
FOR SELECT
USING (true);