import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Download, Mail, User, MapPin, Phone, Calendar, Users, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { downloadContractPDF } from "@/lib/contract-pdf";
import {
  contractFormSchema,
  type ContractFormData,
  formatCPF,
  formatCEP,
  formatPhone,
} from "@/lib/contract-validation";

export function ContractForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
  });

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

  const onSubmit = async (data: ContractFormData) => {
    setIsGenerating(true);
    
    try {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      downloadContractPDF({
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        endereco: data.endereco,
        cep: data.cep,
        email: data.email,
        telefone: data.telefone,
        datasRequeridas: data.datasRequeridas,
        nomeGuia: data.nomeGuia,
        quantidadeDias: data.quantidadeDias,
        valor: data.valor,
      });
      
      setIsGenerated(true);
      toast({
        title: "Contrato gerado com sucesso!",
        description: "O download do PDF foi iniciado automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar contrato",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="datasRequeridas">Datas Requeridas *</Label>
            <Input
              id="datasRequeridas"
              placeholder="Ex: 15/01/2025, 16/01/2025, 17/01/2025"
              {...register("datasRequeridas")}
            />
            {errors.datasRequeridas && (
              <p className="text-sm text-destructive">{errors.datasRequeridas.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeGuia">Nome do Guia *</Label>
            <Input
              id="nomeGuia"
              placeholder="Nome do guia responsável"
              {...register("nomeGuia")}
            />
            {errors.nomeGuia && (
              <p className="text-sm text-destructive">{errors.nomeGuia.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidadeDias">Quantidade de Dias *</Label>
            <Input
              id="quantidadeDias"
              type="number"
              min="1"
              placeholder="Ex: 3"
              {...register("quantidadeDias")}
            />
            {errors.quantidadeDias && (
              <p className="text-sm text-destructive">{errors.quantidadeDias.message}</p>
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
