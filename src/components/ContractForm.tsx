import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, User, Calendar, Users, Loader2, CheckCircle, Sparkles, Wand2, UserCheck, Castle, Copy, Check, MessageSquare, MessageCircle, Link as LinkIcon, Plus, DollarSign, RefreshCw, Key, ExternalLink, Headset } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { downloadContractPDF } from "@/lib/contract-pdf";
import { supabase } from "@/integrations/supabase/client";
import {
  contractFormSchema,
  type ContractFormData,
  formatCPF,
  formatCEP,
  formatPhone,
} from "@/lib/contract-validation";
import { ParkDateSelector, type ParkSelection, formatParkSelections, PARKS } from "./ParkDateSelector";
import { ContractGuidelinesDialog } from "./ContractGuidelinesDialog";
import { PaymentSelector, type PaymentType } from "./PaymentSelector";
import { calculatePrice, formatPriceBRL, DEFAULT_EXCHANGE_RATE, getCashPrice, calculateInstallmentOptions, getUSDPrice } from "@/lib/pricing";
import { generatePassword, type UserCredentials } from "@/lib/password-generator";
const TEMPLATE_TEXT = `📋 FORMULÁRIO DE RESERVA

DADOS PESSOAIS:
- Nome completo:
- CPF:
- E-mail:
- Telefone:
- Endereço completo:
- CEP:
- Quantidade de pessoas:

PARQUES E DATAS:
- Magic Kingdom:
- EPCOT:
- Hollywood Studios:
- Animal Kingdom:
- Universal Studios:
- Islands of Adventure:
- Epic Universe:

INFORMAÇÕES ADICIONAIS:
- Hóspede Disney? (Sim/Não):
- Nome do guia:`;

const parseISODateOnlyToLocal = (iso: string): Date => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(iso);
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
};

export function ContractForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [rawData, setRawData] = useState("");
  const [parkSelections, setParkSelections] = useState<ParkSelection[]>([]);
  const [datesLater, setDatesLater] = useState(false);
  const [copied, setCopied] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [umblerChatUrl, setUmblerChatUrl] = useState("");
  const [customTerms, setCustomTerms] = useState<string | undefined>(undefined);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [acceptanceToken, setAcceptanceToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [exchangeRateInput, setExchangeRateInput] = useState(String(DEFAULT_EXCHANGE_RATE));
  const [isAutoPrice, setIsAutoPrice] = useState(true);
  const [paymentType, setPaymentType] = useState<PaymentType>('vista');
  const [selectedInstallment, setSelectedInstallment] = useState(0); // 0 = à vista
  // URL fixa do webhook do projeto Seu Roteiro Orlando
  const webhookUrl = "https://qjfhyqjgqutkabxaeopi.supabase.co/functions/v1/create-client";
  const [generatedCredentials, setGeneratedCredentials] = useState<UserCredentials | null>(null);
  const [webhookEnabled, setWebhookEnabled] = useState(true); // Toggle para pausar/ativar webhook
  const [selectedPixKey, setSelectedPixKey] = useState<string>("33142150000199");
  const { toast } = useToast();

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE_TEXT);
      setCopied(true);
      toast({
        title: "Template copiado!",
        description: "Envie para o cliente preencher.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      hospedeDisney: false,
      quantidadePessoas: "1",
    },
  });

  const handleNewContract = () => {
    reset();
    setParkSelections([]);
    setRawData("");
    setObservacao("");
    setUmblerChatUrl("");
    setCustomTerms(undefined);
    setIsGenerated(false);
    setSavedContractId(null);
    setAcceptanceToken(null);
    setLinkCopied(false);
    setDatesLater(false);
    setExchangeRate(DEFAULT_EXCHANGE_RATE);
    setExchangeRateInput(String(DEFAULT_EXCHANGE_RATE));
    setIsAutoPrice(true);
    setPaymentType('vista');
    setSelectedInstallment(0);
    setGeneratedCredentials(null);
    setSelectedPixKey("33142150000199");
  };

  // Function to send credentials to external webhook (Seu Roteiro Orlando)
  const sendCredentialsToWebhook = async (
    credentials: UserCredentials, 
    parkSelectionsData: ParkSelection[],
    formData: ContractFormData
  ) => {
    if (!webhookUrl.trim() || !webhookEnabled) {
      console.log("Webhook disabled or no URL configured, skipping...");
      return;
    }

    // Extract start and end dates from park selections
    const sortedDates = parkSelectionsData
      .filter(p => p.date)
      .map(p => p.date!)
      .sort((a, b) => a.getTime() - b.getTime());
    
    const startDate = sortedDates.length > 0 
      ? sortedDates[0].toISOString().split('T')[0] 
      : null;
    const endDate = sortedDates.length > 0 
      ? sortedDates[sortedDates.length - 1].toISOString().split('T')[0] 
      : null;

    // Build parks array with proper format
    const parks = parkSelectionsData
      .filter(p => p.date)
      .map(p => ({
        date: p.date!.toISOString().split('T')[0],
        park: p.parkName,
        time_start: "08:00", // Default time
        time_end: "22:00",   // Default time
        notes: formData.hospedeDisney ? "Hóspede Disney" : undefined
      }));

    const payload = {
      // Credenciais de acesso
      email: credentials.email,
      password: credentials.password,
      
      // Dados pessoais completos
      nome_completo: credentials.nome_completo,
      cpf: credentials.cpf,
      telefone: credentials.telefone,
      endereco: formData.endereco,
      cep: formData.cep,
      
      // Dados do contrato
      contract_id: credentials.contract_id,
      nome_guia: formData.nomeGuia,
      valor: formData.valor,
      quantidade_pessoas: formData.quantidadePessoas || 1,
      quantidade_dias: parkSelectionsData.filter(p => p.date).length,
      hospede_disney: formData.hospedeDisney || false,
      
      // Datas da viagem
      start_date: startDate,
      end_date: endDate,
      
      // Parques detalhados
      parks: parks
    };

    console.log("=== WEBHOOK PAYLOAD ENVIADO ===");
    console.log("Payload completo:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZmh5cWpncXV0a2FieGFlb3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDk1NDAsImV4cCI6MjA4Mjk4NTU0MH0.vzx_iOf-eadW6Gojpl1mgLKaJA53k-Vfdi_0bzuxCqo"
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log("Credentials sent to webhook successfully:", payload);
        toast({
          title: "Credenciais enviadas!",
          description: "As credenciais foram enviadas para Seu Roteiro Orlando.",
        });
      } else {
        const errorText = await response.text();
        console.error("Webhook response error:", errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error("Error sending webhook:", error);
      toast({
        title: "Aviso",
        description: "Não foi possível enviar as credenciais para o webhook.",
        variant: "destructive",
      });
    }
  };

  // Watch quantidadePessoas for pricing
  const quantidadePessoas = watch("quantidadePessoas");

  // Auto-calculate price based on park selections, exchange rate, and selected installment
  const handleInstallmentSelect = (installments: number, totalValue: number) => {
    setSelectedInstallment(installments);
    setIsAutoPrice(true);
    if (paymentType === 'dolar') {
      setValue("valor", `$ ${totalValue.toFixed(2)}`, { shouldValidate: true });
    } else {
      setValue("valor", formatPriceBRL(totalValue), { shouldValidate: true });
    }
  };

  // Auto-calculate price when days, exchange rate, or number of people changes (maintains selected payment type)
  useEffect(() => {
    if (!isAutoPrice) return;
    
    const days = datesLater ? 0 : parkSelections.length;
    const numberOfPeople = parseInt(quantidadePessoas || "1") || 1;
    
    if (days === 0) {
      // When no parks selected or dates later, set a valid default
      setValue("valor", "0,00", { shouldValidate: true });
      return;
    }
    
    if (days > 0) {
      const extraPeopleCount = Math.max(0, numberOfPeople - 8);
      const extraPeopleChargeBRL = extraPeopleCount * days * 20 * exchangeRate;

      if (paymentType === 'dolar') {
        const usdTotal = getUSDPrice(days, numberOfPeople);
        setValue("valor", `$ ${usdTotal.toFixed(2)}`, { shouldValidate: true });
      } else if (paymentType === 'vista') {
        const baseCashPrice = getCashPrice(days, exchangeRate);
        setValue("valor", formatPriceBRL(baseCashPrice + extraPeopleChargeBRL), { shouldValidate: true });
      } else {
        const options = calculateInstallmentOptions(days, exchangeRate, numberOfPeople);
        const selectedOption = options.find(o => o.installments === selectedInstallment) || options[0];

        // O extra também entra no cálculo com a mesma taxa do cartão
        const totalWithExtra = selectedOption.totalValue + (extraPeopleChargeBRL * (1 + selectedOption.rate));
        setValue("valor", formatPriceBRL(totalWithExtra), { shouldValidate: true });
      }
    }
  }, [parkSelections.length, exchangeRate, datesLater, isAutoPrice, paymentType, selectedInstallment, quantidadePessoas, setValue]);
  
  // Número de pessoas para outros componentes
  const numberOfPeople = parseInt(quantidadePessoas || "1") || 1;

  const hospedeDisney = watch("hospedeDisney");

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue("cpf", formatted);
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setValue("cep", formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue("telefone", formatted);
  };

  const handleParseWithAI = async () => {
    if (!rawData.trim()) {
      toast({
        title: "Cole os dados do cliente",
        description: "A caixa de texto está vazia.",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-contract-data", {
        body: { rawText: rawData },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const parsed = data?.data;
      if (parsed) {
        if (parsed.nomeCompleto) setValue("nomeCompleto", parsed.nomeCompleto);
        if (parsed.email) setValue("email", parsed.email);
        if (parsed.cpf) setValue("cpf", formatCPF(parsed.cpf));
        if (parsed.telefone) setValue("telefone", formatPhone(parsed.telefone));
        if (parsed.cep) setValue("cep", formatCEP(parsed.cep));
        if (parsed.endereco) setValue("endereco", parsed.endereco);
        if (parsed.quantidadePessoas) setValue("quantidadePessoas", String(parsed.quantidadePessoas));
        
        // Parse park dates from AI response
        if (parsed.parkDates && Array.isArray(parsed.parkDates)) {
          const newSelections: ParkSelection[] = [];
          parsed.parkDates.forEach((pd: { parkId: string; date: string }) => {
            const park = PARKS.find((p) => p.id === pd.parkId);
            if (park && pd.date) {
              newSelections.push({
                parkId: pd.parkId,
                parkName: park.name,
                // IMPORTANT: avoid timezone shift when parsing YYYY-MM-DD
                date: parseISODateOnlyToLocal(pd.date),
              });
            }
          });
          if (newSelections.length > 0) {
            setDatesLater(false);
            setParkSelections(newSelections);
          }
        }

        toast({
          title: "Dados preenchidos!",
          description: "Verifique os campos e as datas dos parques.",
        });
      }
    } catch (error) {
      console.error("AI parsing error:", error);
      toast({
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Não foi possível interpretar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const onSubmit = async (data: ContractFormData) => {
    // Validate park selections (only if not "dates later" mode)
    if (!datesLater) {
      if (parkSelections.length === 0) {
        toast({
          title: "Selecione os parques",
          description: "Selecione pelo menos um parque ou marque 'Definir datas depois'.",
          variant: "destructive",
        });
        return;
      }

      const hasAllDates = parkSelections.every((s) => s.date);
      if (!hasAllDates) {
        toast({
          title: "Datas incompletas",
          description: "Selecione a data para todos os parques selecionados.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsGenerating(true);
    
    const datasRequeridas = formatParkSelections(parkSelections, datesLater);
    const quantidadeDias = datesLater ? 0 : parkSelections.length;
    
    try {
      // Generate acceptance token
      const newToken = crypto.randomUUID().replace(/-/g, "").substring(0, 24);
      
      // Save contract to database with token
      const { data: insertedData, error: dbError } = await supabase.from("contracts").insert([{
        nome_completo: data.nomeCompleto,
        cpf: data.cpf,
        endereco: data.endereco,
        cep: data.cep,
        email: data.email,
        telefone: data.telefone,
        datas_requeridas: datasRequeridas,
        nome_guia: data.nomeGuia,
        quantidade_dias: quantidadeDias,
        quantidade_pessoas: parseInt(data.quantidadePessoas || "1"),
        valor: data.valor,
        hospede_disney: data.hospedeDisney,
        acceptance_token: newToken,
        umbler_chat_url: umblerChatUrl.trim() || null,
        pix_key: paymentType !== 'dolar' ? selectedPixKey : null,
      }]).select("id").single();

      if (dbError) {
        console.error("Error saving contract:", dbError);
        throw new Error("Erro ao salvar contrato no banco de dados");
      }
      
      // Store contract ID and token for sharing
      setSavedContractId(insertedData.id);
      setAcceptanceToken(newToken);
      
      // Build payment method description
      const formaPagamento = paymentType === 'vista' 
        ? 'À Vista / Pix / Boleto' 
        : paymentType === 'dolar'
        ? 'Pagamento em Dólar (Wise)'
        : `Parcelado (${selectedInstallment}x no Cartão)`;

      // Generate and download PDF
      downloadContractPDF({
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        endereco: data.endereco,
        cep: data.cep,
        email: data.email,
        telefone: data.telefone,
        datasRequeridas: datasRequeridas,
        nomeGuia: data.nomeGuia,
        quantidadeDias: String(quantidadeDias),
        quantidadePessoas: data.quantidadePessoas || "1",
        valor: data.valor,
        observacao: observacao || undefined,
        customTerms: customTerms,
        formaPagamento: formaPagamento,
      });
      
      // Generate user credentials and send to webhook
      const password = generatePassword(10);
      const credentials: UserCredentials = {
        email: data.email,
        password: password,
        nome_completo: data.nomeCompleto,
        cpf: data.cpf,
        telefone: data.telefone,
        contract_id: insertedData.id,
      };
      
      setGeneratedCredentials(credentials);
      
      // Send credentials to webhook if URL is configured and enabled
      if (webhookUrl.trim() && webhookEnabled) {
        await sendCredentialsToWebhook(credentials, parkSelections, data);
      }
      
      setIsGenerated(true);
      toast({
        title: "Contrato gerado com sucesso!",
        description: webhookEnabled 
          ? "O contrato foi salvo e as credenciais foram enviadas para o Planejador OFP." 
          : "O contrato foi salvo. Integração com Planejador OFP está pausada.",
      });
    } catch (error) {
      console.error("Contract generation error:", error);
      toast({
        title: "Erro ao gerar contrato",
        description: error instanceof Error ? error.message : "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* AI Auto-Fill Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Preenchimento Automático</h2>
              <p className="text-sm text-muted-foreground">Cole os dados brutos do cliente</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyTemplate}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar Template
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <Textarea
            placeholder={`Cole aqui os dados do cliente como você recebeu, por exemplo:

Nome completo: João da Silva
E-mail: joao@email.com
CPF: 123.456.789-00
Telefone: (11) 99999-9999
CEP: 01234-567
Endereço: Rua das Flores 123
Datas: 7/jan - Magic Kingdom, 8/jan - Animal Kingdom...`}
            className="min-h-[180px] resize-none pr-4"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleParseWithAI}
          disabled={isParsing || !rawData.trim()}
          className="w-full border-violet-500/30 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950"
        >
          {isParsing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando com IA...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Preencher Formulário Automaticamente
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou preencha manualmente</span>
        </div>
      </div>

      {/* Personal Data Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Dados Pessoais</h2>
            <p className="text-sm text-muted-foreground">Informações do contratante</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nomeCompleto">Nome Completo *</Label>
            <Input
              id="nomeCompleto"
              placeholder="Digite seu nome completo"
              {...register("nomeCompleto")}
            />
            {errors.nomeCompleto && (
              <p className="text-sm text-destructive">{errors.nomeCompleto.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              {...register("cpf")}
              onChange={handleCPFChange}
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="endereco">Endereço Completo *</Label>
            <Input
              id="endereco"
              placeholder="Rua, número, complemento, bairro, cidade - UF"
              {...register("endereco")}
            />
            {errors.endereco && (
              <p className="text-sm text-destructive">{errors.endereco.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              placeholder="00000-000"
              {...register("cep")}
              onChange={handleCEPChange}
              maxLength={9}
            />
            {errors.cep && (
              <p className="text-sm text-destructive">{errors.cep.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              {...register("telefone")}
              onChange={handlePhoneChange}
              maxLength={15}
            />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Service Details Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg gradient-gold flex items-center justify-center">
            <Calendar className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Detalhes do Serviço</h2>
            <p className="text-sm text-muted-foreground">Informações sobre o guiamento</p>
          </div>
        </div>

        <div className="space-y-6">
          <ParkDateSelector
            value={parkSelections}
            onChange={setParkSelections}
            datesLater={datesLater}
            onDatesLaterChange={setDatesLater}
          />

          {/* Pricing Section */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">Opções de Pagamento</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="exchangeRate" className="text-sm text-muted-foreground">Câmbio:</Label>
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-xs">
                    R$
                  </span>
                  <Input
                    id="exchangeRate"
                    type="text"
                    inputMode="decimal"
                    value={exchangeRateInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      setExchangeRateInput(e.target.value);
                      const value = parseFloat(raw);
                      if (!isNaN(value) && value > 0) {
                        setExchangeRate(value);
                      }
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <PaymentSelector
              days={datesLater ? 0 : parkSelections.length}
              exchangeRate={exchangeRate}
              numberOfPeople={numberOfPeople}
              paymentType={paymentType}
              selectedInstallment={selectedInstallment}
              onPaymentTypeChange={setPaymentType}
              onInstallmentSelect={handleInstallmentSelect}
            />

            {/* PIX Key Selector - only for BRL payments */}
            {paymentType !== 'dolar' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chave PIX para o link de aceite</Label>
                <Select value={selectedPixKey} onValueChange={setSelectedPixKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="33142150000199">33.142.150/0001-99 (CNPJ atual)</SelectItem>
                    <SelectItem value="55513365000101">55.513.365/0001-01 (CNPJ novo)</SelectItem>
                    <SelectItem value="contato@orlandofastpass.com.br">contato@orlandofastpass.com.br (E-mail)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manual value override */}
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="valor" className="text-sm">Valor Final do Contrato {paymentType === 'dolar' ? '($)' : '(R$)'} *</Label>
                    {isAutoPrice && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                        {paymentType === 'dolar' ? '$' : 'R$'}
                      </span>
                      <Input
                        id="valor"
                        placeholder="0,00"
                        className="pl-10"
                        {...register("valor")}
                        onChange={(e) => {
                          setIsAutoPrice(false);
                          setValue("valor", e.target.value, { shouldValidate: true });
                        }}
                      />
                    </div>
                    {!isAutoPrice && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs whitespace-nowrap"
                        onClick={() => {
                          setIsAutoPrice(true);
                          const days = datesLater ? 0 : parkSelections.length;
                          if (days > 0) {
                            const extraPeopleCount = Math.max(0, numberOfPeople - 8);
                            const extraPeopleChargeBRL = extraPeopleCount * days * 20 * exchangeRate;

                            if (paymentType === 'dolar') {
                              const usdTotal = getUSDPrice(days, numberOfPeople);
                              setValue("valor", `$ ${usdTotal.toFixed(2)}`, { shouldValidate: true });
                            } else if (paymentType === 'vista') {
                              const baseCashPrice = getCashPrice(days, exchangeRate);
                              setValue("valor", formatPriceBRL(baseCashPrice + extraPeopleChargeBRL), { shouldValidate: true });
                            } else {
                              const options = calculateInstallmentOptions(days, exchangeRate, numberOfPeople);
                              const selectedOption = options.find(o => o.installments === selectedInstallment) || options[0];
                              const totalWithExtra = selectedOption.totalValue + (extraPeopleChargeBRL * (1 + selectedOption.rate));
                              setValue("valor", formatPriceBRL(totalWithExtra), { shouldValidate: true });
                            }
                          }
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restaurar
                      </Button>
                    )}
                  </div>
                  {errors.valor && (
                    <p className="text-sm text-destructive">{errors.valor.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nomeGuia">Nome do Guia *</Label>
              <Select onValueChange={(value) => setValue("nomeGuia", value)}>
                <SelectTrigger id="nomeGuia">
                  <SelectValue placeholder="Selecione o guia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kleber">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Kleber
                    </div>
                  </SelectItem>
                  <SelectItem value="Rafael">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Rafael
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.nomeGuia && (
                <p className="text-sm text-destructive">{errors.nomeGuia.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidadePessoas">Qtd. Pessoas *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                </span>
                <Input
                  id="quantidadePessoas"
                  type="number"
                  min="1"
                  placeholder="1"
                  className="pl-12"
                  {...register("quantidadePessoas")}
                />
              </div>
              {errors.quantidadePessoas && (
                <p className="text-sm text-destructive">{errors.quantidadePessoas.message}</p>
              )}
            </div>
          </div>

          {/* Disney Guest Switch */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Castle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="hospedeDisney" className="text-base font-medium cursor-pointer">
                    Hóspede Disney
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {hospedeDisney 
                      ? "Multipass com D-7 (7 dias antes)" 
                      : "Multipass com D-3 (3 dias antes)"}
                  </p>
                </div>
              </div>
              <Switch
                id="hospedeDisney"
                checked={hospedeDisney}
                onCheckedChange={(checked) => setValue("hospedeDisney", checked)}
              />
            </div>
          </div>

          {/* Webhook Integration Toggle */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${webhookEnabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                  <ExternalLink className={`h-5 w-5 ${webhookEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <Label htmlFor="webhookEnabled" className="text-base font-medium cursor-pointer">
                    Integração Planejador OFP
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {webhookEnabled 
                      ? "Envia credenciais automaticamente para Seu Roteiro Orlando" 
                      : "Integração pausada - credenciais não serão enviadas"}
                  </p>
                </div>
              </div>
              <Switch
                id="webhookEnabled"
                checked={webhookEnabled}
                onCheckedChange={setWebhookEnabled}
              />
            </div>
          </div>

          {/* Umbler Chat URL Field (Internal - not visible to client) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Headset className="h-4 w-4 text-purple-600" />
              <Label htmlFor="umblerChatUrl">Link Umbler (interno)</Label>
            </div>
            <Input
              id="umblerChatUrl"
              type="url"
              placeholder="https://app-utalk.umbler.com/chats/..."
              value={umblerChatUrl}
              onChange={(e) => setUmblerChatUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Link do chat do cliente na Umbler. Não é visível para o cliente.
            </p>
          </div>

          {/* Observação Field */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="observacao">Observação</Label>
            </div>
            <Textarea
              id="observacao"
              placeholder="Adicione observações ou solicitações específicas do cliente que serão incluídas no contrato..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esta observação será exibida na seção 4 do contrato.
            </p>
          </div>

          {/* Contract Guidelines Button */}
          <div className="flex items-center justify-between pt-2">
            <ContractGuidelinesDialog onTermsChange={setCustomTerms} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
        <Button
          type="submit"
          variant="gold"
          size="xl"
          className="flex-1"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Gerando Contrato...
            </>
          ) : isGenerated ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Contrato Gerado!
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              Gerar Contrato em PDF
            </>
          )}
        </Button>
      </div>

      {isGenerated && acceptanceToken && (
        <div className="animate-slide-up rounded-xl bg-primary/5 border border-primary/20 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                Contrato pronto! Envie para o cliente assinar
              </h3>
              <p className="text-muted-foreground text-sm">
                O link de aceite foi gerado automaticamente. Envie ao cliente para que ele visualize e assine o contrato.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Link de Aceite</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/aceitar/${acceptanceToken}`}
                className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-md"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/aceitar/${acceptanceToken}`);
                  setLinkCopied(true);
                  toast({ title: "Link copiado!" });
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Generated Credentials Display */}
          {generatedCredentials && (
            <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Credenciais Geradas</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Login:</span>
                  <code className="bg-background px-2 py-1 rounded text-xs font-mono">{generatedCredentials.email}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Senha:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-xs font-mono">{generatedCredentials.password}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedCredentials.password);
                        toast({ title: "Senha copiada!" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Enviado para: Seu Roteiro Orlando
              </p>
            </div>
          )}

          <Button
            type="button"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              const link = `${window.location.origin}/aceitar/${acceptanceToken}`;
              const clientName = watch("nomeCompleto") || "Cliente";
              const clientPhone = watch("telefone") || "";
              const message = encodeURIComponent(
                `Olá ${clientName}! 👋\n\n` +
                `Segue o link para visualizar e aceitar o contrato de guiamento Disney:\n\n` +
                `${link}\n\n` +
                `Por favor, revise os dados e confirme o aceite. Qualquer dúvida, estou à disposição! 😊`
              );
              const cleanPhone = clientPhone.replace(/\D/g, "");
              const phoneWithCode = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
              window.open(`https://wa.me/${phoneWithCode}?text=${message}`, "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Enviar via WhatsApp
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            O cliente poderá visualizar os dados do contrato, desenhar sua assinatura 
            e confirmar o aceite diretamente pelo link.
          </p>

          <div className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleNewContract}
            >
              <Plus className="h-4 w-4 mr-2" />
              Gerar Novo Contrato
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
