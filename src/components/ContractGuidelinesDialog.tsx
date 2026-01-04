import { useState } from "react";
import { FileText, X, Save } from "lucide-react";
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

const DEFAULT_CONTRACT_TERMS = `Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.
O valor do Lightning Lane Multi Pass é individual e por parque e será pago diretamente para a Disney (realizamos a compra). Pode variar entre $15 e $30 por dia e por pessoa e só é confirmado no dia da utilização.
O valor do Lightning Lane Single Pass é individual e por parque e será pago diretamente para a Disney (realizamos a compra). Pode variar entre $8 e $29 por dia e por pessoa e só é confirmado no dia da utilização.
Ou seja, o valor do nosso serviço NÃO INCLUI o Lightning Lane Single Pass nem o Lightning Lane Multi Pass, os quais são serviços distintos. Valores do Lightning Lane Multi Pass e do Lightning Lane Single Pass podem variar sem aviso prévio.
No dia a ser utilizado, compraremos o Lightning Lane Multi Pass ou Lightning Lane Single Pass (ou ambos, quem determinará é você) através do seu APP MY DISNEY EXPERIENCE para todo o grupo/família, e fazer todos os agendamentos possíveis durante o seu dia de parque. O horário é válido desde as 7h da manhã (horário que pode ser feito o primeiro agendamento) até as 18h.
Para essa compra ser realizada, precisamos linkar seus dados bancários à sua conta do APP, por isso, no dia anterior à compra, solicitaremos os dados necessários para a realização da mesma. Esse serviço pode ser utilizado nos quatro parques da Disney, sendo apenas um parque por dia. Não fazemos esse tipo de serviço para ingressos Park Hopper.
Através do WhatsApp criaremos um grupo com no máximo duas pessoas do grupo/família, pois caso uma das pessoas perca o sinal, seguimos com a comunicação. Todas as marcações e entradas nas atrações devem e serão comunicadas através do grupo criado no WhatsApp.
O horário de compra do serviço e agendamento das primeiras atrações é sempre (07h00) da manhã, 3 ou 7 dias antes do primeiro dia de parque (03 dias antes para hóspedes externos e 07 dias antes para hóspedes Disney).
OBS 1: O dia de parque já deve estar agendado e todo o grupo deve estar na mesma conta. Não fazemos sincronização de contas quando pessoas do mesmo grupo estão em contas diferentes.
OBS 2: Ao haver cancelamento em até 10 dias antes do serviço, será cobrado uma multa de 50% do valor, após esse período, o valor não será estornado.
OBS 3: Caso o grupo/família ou algum membro deixe de comparecer ao parque por qualquer motivo, o valor não é estornado, pois deixaremos aquele dia e alguém da nossa equipe disponível para realizar o serviço para você.
NÃO GARANTIMOS NENHUM AGENDAMENTO DE ATRAÇÃO ESPECÍFICA, mas faremos de tudo para conseguir as melhores. As atrações são agendadas sempre conforme a disponibilidade do sistema da Disney.
Agendamento e guiamento serão feitos até as 18h, podendo ser estendido.`;

interface ContractGuidelinesDialogProps {
  onTermsChange?: (terms: string) => void;
}

export function ContractGuidelinesDialog({ onTermsChange }: ContractGuidelinesDialogProps) {
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState(DEFAULT_CONTRACT_TERMS);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (onTermsChange) {
      onTermsChange(terms);
    }
    setIsEditing(false);
    toast({
      title: "Diretrizes atualizadas",
      description: "As alterações serão aplicadas no próximo contrato gerado.",
    });
  };

  const handleReset = () => {
    setTerms(DEFAULT_CONTRACT_TERMS);
    if (onTermsChange) {
      onTermsChange(DEFAULT_CONTRACT_TERMS);
    }
    toast({
      title: "Diretrizes restauradas",
      description: "As diretrizes foram restauradas para o padrão.",
    });
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
            Visualize ou edite os termos e condições que serão incluídos no contrato PDF.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[50vh] pr-4">
          {isEditing ? (
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="min-h-[400px] font-mono text-sm resize-none"
            />
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {terms}
            </div>
          )}
        </ScrollArea>

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button variant="ghost" onClick={handleReset} className="ml-auto text-destructive hover:text-destructive">
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
