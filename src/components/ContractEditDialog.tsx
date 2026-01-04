import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  contractFormSchema,
  type ContractFormData,
  formatCPF,
  formatCEP,
  formatPhone,
} from "@/lib/contract-validation";

interface Contract {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  cep: string;
  datas_requeridas: string;
  nome_guia: string;
  quantidade_dias: number;
  quantidade_pessoas: number | null;
  valor: string;
  hospede_disney: boolean;
  created_at: string;
}

interface ContractEditDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ContractEditDialog({ contract, open, onOpenChange, onSuccess }: ContractEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    values: contract ? {
      nomeCompleto: contract.nome_completo,
      cpf: contract.cpf,
      email: contract.email,
      telefone: contract.telefone,
      endereco: contract.endereco,
      cep: contract.cep,
      nomeGuia: contract.nome_guia,
      valor: contract.valor,
      datasRequeridas: contract.datas_requeridas,
      quantidadePessoas: String(contract.quantidade_pessoas || 1),
      hospedeDisney: contract.hospede_disney,
    } : undefined,
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
    if (!contract) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          nome_completo: data.nomeCompleto,
          cpf: data.cpf,
          endereco: data.endereco,
          cep: data.cep,
          email: data.email,
          telefone: data.telefone,
          nome_guia: data.nomeGuia,
          valor: data.valor,
          datas_requeridas: data.datasRequeridas || "",
          quantidade_pessoas: parseInt(data.quantidadePessoas || "1"),
          hospede_disney: data.hospedeDisney,
        })
        .eq("id", contract.id);

      if (error) throw error;
      
      toast({
        title: "Contrato atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nomeCompleto">Nome Completo</Label>
              <Input
                id="edit-nomeCompleto"
                {...register("nomeCompleto")}
              />
              {errors.nomeCompleto && (
                <p className="text-sm text-destructive">{errors.nomeCompleto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF</Label>
              <Input
                id="edit-cpf"
                {...register("cpf")}
                onChange={handleCPFChange}
                maxLength={14}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                {...register("telefone")}
                onChange={handlePhoneChange}
                maxLength={15}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">{errors.telefone.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Input
                id="edit-endereco"
                {...register("endereco")}
              />
              {errors.endereco && (
                <p className="text-sm text-destructive">{errors.endereco.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cep">CEP</Label>
              <Input
                id="edit-cep"
                {...register("cep")}
                onChange={handleCEPChange}
                maxLength={9}
              />
              {errors.cep && (
                <p className="text-sm text-destructive">{errors.cep.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nomeGuia">Guia</Label>
              <Select 
                defaultValue={contract?.nome_guia}
                onValueChange={(value) => setValue("nomeGuia", value)}
              >
                <SelectTrigger id="edit-nomeGuia">
                  <SelectValue placeholder="Selecione o guia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kleber">Kleber</SelectItem>
                  <SelectItem value="Rafael">Rafael</SelectItem>
                </SelectContent>
              </Select>
              {errors.nomeGuia && (
                <p className="text-sm text-destructive">{errors.nomeGuia.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-valor">Valor (R$)</Label>
              <Input
                id="edit-valor"
                {...register("valor")}
              />
              {errors.valor && (
                <p className="text-sm text-destructive">{errors.valor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quantidadePessoas">Qtd. Pessoas</Label>
              <Input
                id="edit-quantidadePessoas"
                type="number"
                min="1"
                {...register("quantidadePessoas")}
              />
              {errors.quantidadePessoas && (
                <p className="text-sm text-destructive">{errors.quantidadePessoas.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="edit-hospedeDisney"
                checked={watch("hospedeDisney") ?? false}
                onCheckedChange={(checked) => setValue("hospedeDisney", checked)}
              />
              <Label htmlFor="edit-hospedeDisney" className="cursor-pointer">
                Hóspede Disney (D-7)
              </Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-datasRequeridas">Datas Requeridas</Label>
              <Textarea
                id="edit-datasRequeridas"
                {...register("datasRequeridas")}
                placeholder="Ex: 06/01 - Magic Kingdom, 07/01 - Animal Kingdom"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
