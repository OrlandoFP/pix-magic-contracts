import { useState, useEffect } from "react";
import { FileText, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useContractTerms } from "@/hooks/useContractTerms";

interface ContractGuidelinesDialogProps {
  onTermsChange?: (terms: string) => void;
}

export function ContractGuidelinesDialog({ onTermsChange }: ContractGuidelinesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { terms: globalTerms, isLoading, saveTerms } = useContractTerms();
  const [localTerms, setLocalTerms] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && !isLoading) {
      setLocalTerms(globalTerms);
    }
  }, [open, isLoading, globalTerms]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveTerms(localTerms);
    if (success) {
      onTermsChange?.(localTerms);
      setIsEditing(false);
      toast({
        title: "Diretrizes atualizadas globalmente",
        description: "As alterações serão aplicadas em todos os novos contratos.",
      });
    }
    setIsSaving(false);
  };

  const handleReset = async () => {
    const { DEFAULT_CONTRACT_TERMS } = await import("@/lib/contract-terms");
    setLocalTerms(DEFAULT_CONTRACT_TERMS);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Ver Diretrizes do Contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Diretrizes e Termos do Contrato
          </DialogTitle>
          <DialogDescription>
            Visualize ou edite os termos e condições. Alterações aqui são <strong>globais</strong> e afetam todos os novos contratos.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[50vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isEditing ? (
            <Textarea
              value={localTerms}
              onChange={(e) => setLocalTerms(e.target.value)}
              className="min-h-[400px] font-mono text-sm resize-none"
            />
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {localTerms}
            </div>
          )}
        </ScrollArea>

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Globalmente
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button variant="ghost" onClick={handleReset} className="ml-auto text-destructive hover:text-destructive" disabled={isSaving}>
                Restaurar Padrão
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Editar Diretrizes
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} className="ml-auto">
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
