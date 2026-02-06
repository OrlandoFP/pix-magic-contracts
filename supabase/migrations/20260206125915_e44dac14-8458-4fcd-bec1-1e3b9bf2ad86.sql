
CREATE TABLE public.app_settings (
  id text PRIMARY KEY DEFAULT 'default',
  contract_terms text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.app_settings FOR UPDATE USING (true);

INSERT INTO public.app_settings (id, contract_terms) VALUES ('default', 'Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.

O valor do Lightning Lane Multi Pass é individual e por parque e será pago diretamente para a Disney (realizamos a compra). Pode variar entre $15 e $40 por dia e por pessoa e só é confirmado no dia da utilização.

O valor do Lightning Lane Single Pass é individual e por parque e será pago diretamente para a Disney (realizamos a compra). Pode variar entre $8 e $35 por dia e por pessoa e só é confirmado no dia da utilização.

Ou seja, o valor do nosso serviço NÃO INCLUI o Lightning Lane Single Pass nem o Lightning Lane Multi Pass, os quais são serviços distintos. Valores do Lightning Lane Multi Pass e do Lightning Lane Single Pass podem variar sem aviso.

3 ou 7 dias antes do primeiro dia de parque, a primeira tentativa de compra do Multi Pass/ Single Pass será feita pelo seu guia. 

Ao chegar no final, se o seu cartão não passar (por qualquer motivo) ou se ele não aparecer como forma de pagamento (pode acontecer), faremos uma compra *assistida.

*Compra assistida: o guia acompanha vocês na compra, mas não podemos pegar seu cartão de crédito. Para sua segurança e da empresa.

Através do WhatsApp criaremos um grupo com no máximo duas pessoas do grupo/família, pois caso uma das pessoas perca o sinal, seguimos com a comunicação. 

Todas as marcações e entradas nas atrações serão comunicadas através do grupo criado no WhatsApp.

O horário de compra do serviço e agendamento das primeiras atrações é sempre (07h00) da manhã, 3 ou 7 dias antes do primeiro dia de parque (03 dias antes para hóspedes externos e 07 dias antes para hóspedes Disney).

OBS 1: O dia de parque já deve estar agendado e todo o grupo deve estar na mesma conta. Não fazemos sincronização de contas quando pessoas do mesmo grupo estão em contas diferentes.

OBS 2: Ao haver cancelamento em até 10 dias antes do serviço, será cobrado uma multa de 50% do valor, após esse período, o valor não será estornado. Pois as datas são muito concorridas e ao cancelar, muitas vezes esse dia fica vago, prejudicando o Guia.

OBS 3: Caso o grupo/família ou algum membro deixe de comparecer ao parque por qualquer motivo, o valor não é estornado, pois deixaremos aquele dia e alguém da nossa equipe disponível para realizar o serviço para você.

NÃO GARANTIMOS NENHUM AGENDAMENTO DE ATRAÇÃO ESPECÍFICA, mas faremos de tudo para conseguir as melhores. As atrações são agendadas sempre conforme a disponibilidade do sistema da Disney.

Agendamento e guiamento serão feitos até o Show de Encerramento.');
