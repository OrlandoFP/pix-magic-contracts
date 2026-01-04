import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Check, 
  Loader2,
  Link as LinkIcon
} from "lucide-react";

interface ShareContractButtonProps {
  contractId: string;
  clientName: string;
  clientPhone: string;
  existingToken?: string | null;
}

export const ShareContractButton = ({ 
  contractId, 
  clientName, 
  clientPhone,
  existingToken 
}: ShareContractButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(existingToken || null);
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    return crypto.randomUUID().replace(/-/g, "").substring(0, 24);
  };

  const getAcceptanceLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/aceitar/${token}`;
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const newToken = generateToken();
      
      const { error } = await supabase
        .from("contracts")
        .update({ acceptance_token: newToken })
        .eq("id", contractId);

      if (error) throw error;

      setToken(newToken);
      toast({
        title: "Link gerado!",
        description: "O link de aceite foi criado com sucesso.",
      });
    } catch (err) {
      console.error("Erro ao gerar link:", err);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const link = getAcceptanceLink();
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const link = getAcceptanceLink();
    const message = encodeURIComponent(
      `Olá ${clientName}! 👋\n\n` +
      `Segue o link para visualizar e aceitar o contrato de guiamento Disney:\n\n` +
      `${link}\n\n` +
      `Por favor, revise os dados e confirme o aceite. Qualquer dúvida, estou à disposição! 😊`
    );
    
    // Clean phone number (remove non-digits)
    const cleanPhone = clientPhone.replace(/\D/g, "");
    // Add country code if not present
    const phoneWithCode = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    
    const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Enviar para Aceite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Contrato para Aceite</DialogTitle>
          <DialogDescription>
            Gere um link único para o cliente aceitar e assinar o contrato digitalmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!token ? (
            <Button 
              onClick={handleGenerateLink} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Gerar Link de Aceite
                </>
              )}
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Link de Aceite</label>
                <div className="flex gap-2">
                  <Input 
                    value={getAcceptanceLink()} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={shareViaWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar via WhatsApp
                </Button>

                <Button
                  variant="outline"
                  onClick={handleGenerateLink}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-2" />
                  )}
                  Gerar Novo Link
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                O cliente poderá visualizar os dados do contrato, desenhar sua assinatura 
                e confirmar o aceite diretamente pelo link.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
