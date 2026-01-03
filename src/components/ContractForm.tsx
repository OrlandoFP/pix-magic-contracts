import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Download, Mail, User, MapPin, Phone, Calendar, Users, DollarSign, Loader2, CheckCircle, Sparkles, Wand2, UserCheck, Castle } from "lucide-react";
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

export function ContractForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [rawData, setRawData] = useState("");
  const [parkSelections, setParkSelections] = useState<ParkSelection[]>([]);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      hospedeDisney: false,
    },
  });

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
        
        // Parse park dates from AI response
        if (parsed.parkDates && Array.isArray(parsed.parkDates)) {
          const newSelections: ParkSelection[] = [];
          parsed.parkDates.forEach((pd: { parkId: string; date: string }) => {
            const park = PARKS.find(p => p.id === pd.parkId);
            if (park && pd.date) {
              newSelections.push({
                parkId: pd.parkId,
                parkName: park.name,
                date: new Date(pd.date),
              });
            }
          });
          if (newSelections.length > 0) {
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
    // Validate park selections
    if (parkSelections.length === 0) {
      toast({
        title: "Selecione os parques",
        description: "Selecione pelo menos um parque e sua data.",
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

    setIsGenerating(true);
    
    const datasRequeridas = formatParkSelections(parkSelections);
    
    try {
      // Save contract to database
      const { error: dbError } = await supabase.from("contracts").insert([{
        nome_completo: data.nomeCompleto,
        cpf: data.cpf,
        endereco: data.endereco,
        cep: data.cep,
        email: data.email,
        telefone: data.telefone,
        datas_requeridas: datasRequeridas,
        nome_guia: data.nomeGuia,
        quantidade_dias: parkSelections.length,
        valor: data.valor,
        hospede_disney: data.hospedeDisney,
      }]);

      if (dbError) {
        console.error("Error saving contract:", dbError);
        throw new Error("Erro ao salvar contrato no banco de dados");
      }
      
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
        quantidadeDias: String(parkSelections.length),
        valor: data.valor,
      });
      
      setIsGenerated(true);
      toast({
        title: "Contrato gerado com sucesso!",
        description: "O contrato foi salvo e o download iniciado automaticamente.",
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Preenchimento Automático</h2>
            <p className="text-sm text-muted-foreground">Cole os dados brutos do cliente</p>
          </div>
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
          />

          <div className="grid gap-6 md:grid-cols-2">
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
              <Label htmlFor="valor">Valor Total (R$) *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  R$
                </span>
                <Input
                  id="valor"
                  placeholder="0,00"
                  className="pl-12"
                  {...register("valor")}
                />
              </div>
              {errors.valor && (
                <p className="text-sm text-destructive">{errors.valor.message}</p>
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

      {isGenerated && (
        <div className="animate-slide-up rounded-xl bg-primary/5 border border-primary/20 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                Contrato pronto!
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                O download do seu contrato foi iniciado. Para enviar por e-mail com a chave PIX, 
                conecte o backend clicando no botão abaixo.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Funcionalidade de envio por e-mail requer Lovable Cloud</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
