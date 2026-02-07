# Guia de Migração - Contractor Pro → OFP Planejador

## 1. SQL para criar as tabelas no outro projeto

Execute esta migration no projeto OFP Planejador:

```sql
-- =============================================
-- TABELA: contracts
-- =============================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  endereco text NOT NULL,
  cep text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  datas_requeridas text NOT NULL,
  nome_guia text NOT NULL,
  quantidade_dias integer NOT NULL,
  quantidade_pessoas integer DEFAULT 1,
  valor text NOT NULL,
  hospede_disney boolean NOT NULL DEFAULT false,
  comprado boolean NOT NULL DEFAULT false,
  nf_emitida boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  acceptance_token text,
  signature_url text,
  signed_contract_url text,
  payment_receipt_url text,
  client_ip text,
  client_user_agent text,
  umbler_chat_url text
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Policies para uso interno (autenticado)
CREATE POLICY "Anyone can create contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Anyone can update contracts" ON public.contracts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete contracts" ON public.contracts FOR DELETE USING (true);

-- Policies para acesso público (aceite do contrato pelo cliente)
CREATE POLICY "Public can view contracts by token" ON public.contracts FOR SELECT USING (acceptance_token IS NOT NULL);
CREATE POLICY "Public can update contract acceptance" ON public.contracts FOR UPDATE USING (acceptance_token IS NOT NULL) WITH CHECK (acceptance_token IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;

-- =============================================
-- TABELA: app_settings (termos do contrato)
-- =============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id text NOT NULL DEFAULT 'default' PRIMARY KEY,
  contract_terms text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.app_settings FOR UPDATE USING (true);

-- Inserir termos padrão
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

Agendamento e guiamento serão feitos até o Show de Encerramento.')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE: bucket para documentos
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-documents', 'contract-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
CREATE POLICY "Anyone can upload contract documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contract-documents');
CREATE POLICY "Anyone can view contract documents" ON storage.objects FOR SELECT USING (bucket_id = 'contract-documents');
CREATE POLICY "Anyone can update contract documents" ON storage.objects FOR UPDATE USING (bucket_id = 'contract-documents');
CREATE POLICY "Anyone can delete contract documents" ON storage.objects FOR DELETE USING (bucket_id = 'contract-documents');
```

## 2. Arquivos para copiar

### Libs utilitárias (copiar para src/lib/)
- `src/lib/contract-pdf.ts` - Gerador de PDF do contrato
- `src/lib/contract-terms.ts` - Termos padrão do contrato
- `src/lib/contract-validation.ts` - Schema Zod + formatadores (CPF, CEP, telefone)
- `src/lib/pricing.ts` - Tabela de preços, câmbio, parcelamento
- `src/lib/password-generator.ts` - Gerador de senhas para credenciais
- `src/lib/utils.ts` - Utilitário cn() do tailwind (provavelmente já existe no OFP)

### Componentes (copiar para src/components/)
- `src/components/ContractForm.tsx` - Formulário completo de criação de contrato (1079 linhas)
- `src/components/ContractCard.tsx` - Card expandível de contrato na listagem (489 linhas)
- `src/components/ContractEditDialog.tsx` - Dialog de edição de contrato
- `src/components/ContractDeleteDialog.tsx` - Dialog de confirmação de exclusão
- `src/components/ContractExport.tsx` - Exportação para Excel
- `src/components/ContractGuidelinesDialog.tsx` - Editor de termos/diretrizes
- `src/components/ShareContractButton.tsx` - Botão de compartilhamento via WhatsApp
- `src/components/SignaturePad.tsx` - Pad de assinatura digital (canvas)
- `src/components/DocumentUpload.tsx` - Upload de documentos (contrato assinado, comprovante)
- `src/components/ParkDateSelector.tsx` - Seletor de parques e datas
- `src/components/PaymentSelector.tsx` - Seletor de forma de pagamento (à vista/parcelado)
- `src/components/DraggableCalendar.tsx` - Calendário com drag-and-drop
- `src/components/GuideCalendar.tsx` - Calendário do guia com lembretes Multipass (776 linhas)
- `src/components/NavLink.tsx` - NavLink compatível

### Hooks (copiar para src/hooks/)
- `src/hooks/useContractTerms.ts` - Hook para gerenciar termos do contrato

### Páginas (copiar para src/pages/)
- `src/pages/Index.tsx` - Página principal com formulário
- `src/pages/Contratos.tsx` - Dashboard de contratos por guia
- `src/pages/Faturamento.tsx` - Página de faturamento/NF
- `src/pages/AceitarContrato.tsx` - Página pública de aceite do contrato (609 linhas)

### Edge Functions (copiar para supabase/functions/)
- `supabase/functions/parse-contract-data/index.ts` - Parser com IA (Gemini) para preencher formulário
- `supabase/functions/notify-payment-receipt/index.ts` - Notificação por email (Resend) de comprovante
- `supabase/functions/create-user-credentials/index.ts` - Endpoint para receber credenciais

### Estilos e Config
- `src/index.css` - Design system completo (gradientes, fontes, animações)
- `tailwind.config.ts` - Configuração do Tailwind com cores customizadas (gold, navy, cream)

## 3. Rotas para adicionar no App.tsx do OFP

```tsx
import Index from "./pages/Index"; // ou renomear para ContractorIndex
import Contratos from "./pages/Contratos";
import Faturamento from "./pages/Faturamento";
import AceitarContrato from "./pages/AceitarContrato";

// Adicionar estas rotas:
<Route path="/contratos" element={<Index />} /> {/* formulário de criação */}
<Route path="/contratos/:guia" element={<Contratos />} />
<Route path="/faturamento" element={<Faturamento />} />
<Route path="/aceitar/:token" element={<AceitarContrato />} />
```

## 4. Dependências NPM necessárias

```
jspdf
xlsx
zod
react-hook-form
@hookform/resolvers
date-fns
react-day-picker
@fontsource/playfair-display
@fontsource/lato
```

## 5. Secrets necessários no projeto OFP

- `LOVABLE_API_KEY` - Para a edge function parse-contract-data (IA)
- `RESEND_API_KEY` - Para notificações de email

## 6. Config do Supabase (supabase/config.toml)

Adicionar ao config.toml do OFP:

```toml
[functions.parse-contract-data]
verify_jwt = false

[functions.notify-payment-receipt]
verify_jwt = false

[functions.create-user-credentials]
verify_jwt = false
```

## 7. Dados existentes

Para migrar os contratos existentes, exporte os dados deste projeto e importe no OFP.
Você pode usar a exportação Excel já existente no sistema ou pedir para eu gerar um SQL de exportação.

## 8. Adaptações necessárias no OFP

1. **Design System**: Mesclar as variáveis CSS (--gold, --navy, --cream, gradientes) com o design existente do OFP
2. **Webhook URL**: No `ContractForm.tsx`, a URL do webhook aponta para o projeto "Seu Roteiro Orlando" - ajustar se necessário
3. **PIX CNPJ**: Em `AceitarContrato.tsx`, o CNPJ do PIX está hardcoded como `33142150000199` - verificar se precisa alterar
4. **Guias**: Os nomes dos guias (Rafael, Kleber) estão hardcoded em vários componentes - ajustar conforme necessário
