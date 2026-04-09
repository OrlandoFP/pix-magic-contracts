ALTER TABLE public.contracts ADD COLUMN pago boolean NOT NULL DEFAULT false;

UPDATE public.contracts SET pago = true WHERE lower(nome_guia) = 'kleber';