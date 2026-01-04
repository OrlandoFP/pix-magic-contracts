import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Users, 
  MapPin, 
  User,
  Loader2,
  AlertCircle,
  ScrollText,
  QrCode,
  Upload,
  Copy,
  Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONTRACT_TERMS = `Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.

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

const PIX_CNPJ = "33142150000199";

interface ContractData {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  endereco: string;
  cep: string;
  nome_guia: string;
  quantidade_dias: number;
  quantidade_pessoas: number | null;
  datas_requeridas: string;
  valor: string;
  hospede_disney: boolean;
  accepted_at: string | null;
  signature_url: string | null;
  payment_receipt_url: string | null;
}

const AceitarContrato = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select("*")
        .eq("acceptance_token", token)
        .single();

      if (fetchError || !data) {
        setError("Contrato não encontrado ou link expirado");
        setLoading(false);
        return;
      }

      setContract(data);
      if (data.accepted_at) {
        setSubmitted(true);
        if (data.payment_receipt_url) {
          setReceiptUploaded(true);
        }
      }
      setLoading(false);
    };

    fetchContract();
  }, [token]);

  const handleSignatureComplete = (signatureDataUrl: string) => {
    setSignature(signatureDataUrl);
    toast({
      title: "Assinatura capturada",
      description: "Sua assinatura foi registrada com sucesso.",
    });
  };

  const handleSubmit = async () => {
    if (!acceptTerms) {
      toast({
        title: "Aceite os termos",
        description: "Você precisa aceitar os termos do contrato para continuar.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload signature to storage if provided
      let signatureUrl = null;
      if (signature) {
        const base64Data = signature.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });

        const fileName = `signatures/${contract?.id}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("contract-documents")
          .upload(fileName, blob);

        if (uploadError) {
          console.error("Erro ao fazer upload da assinatura:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("contract-documents")
            .getPublicUrl(fileName);
          signatureUrl = urlData.publicUrl;
        }
      }

      // Update contract with acceptance
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          accepted_at: new Date().toISOString(),
          signature_url: signatureUrl,
          client_user_agent: navigator.userAgent,
        })
        .eq("acceptance_token", token);

      if (updateError) {
        throw updateError;
      }

      setSubmitted(true);
      toast({
        title: "Contrato aceito com sucesso!",
        description: "Obrigado por confirmar o seu contrato.",
      });
    } catch (err) {
      console.error("Erro ao aceitar contrato:", err);
      toast({
        title: "Erro ao aceitar contrato",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_CNPJ);
      setPixCopied(true);
      toast({
        title: "PIX copiado!",
        description: "Chave PIX copiada para a área de transferência.",
      });
      setTimeout(() => setPixCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o PIX.",
        variant: "destructive",
      });
    }
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);

    try {
      const fileName = `receipts/${contract?.id}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contract-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contract-documents")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ payment_receipt_url: urlData.publicUrl })
        .eq("acceptance_token", token);

      if (updateError) throw updateError;

      setReceiptUploaded(true);
      toast({
        title: "Comprovante enviado!",
        description: "Seu comprovante de pagamento foi recebido com sucesso.",
      });
    } catch (err) {
      console.error("Erro ao enviar comprovante:", err);
      toast({
        title: "Erro ao enviar comprovante",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Success Header */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Contrato Aceito!</h2>
              <p className="text-muted-foreground mb-4">
                Obrigado, {contract?.nome_completo}! Seu contrato foi aceito com sucesso.
              </p>
              <p className="text-sm text-muted-foreground">
                Data do aceite: {contract?.accepted_at 
                  ? new Date(contract.accepted_at).toLocaleString("pt-BR")
                  : new Date().toLocaleString("pt-BR")
                }
              </p>
            </CardContent>
          </Card>

          {/* PIX Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Chave PIX (CNPJ)</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xl font-mono font-bold text-primary">
                    {PIX_CNPJ}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPix}
                    className="gap-2"
                  >
                    {pixCopied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="font-semibold text-lg">Valor: {contract?.valor}</p>
                <p className="text-sm text-muted-foreground">
                  Realize o pagamento e envie o comprovante abaixo
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Enviar Comprovante de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {receiptUploaded ? (
                <div className="text-center py-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Comprovante enviado com sucesso!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Obrigado! Seu pagamento será confirmado em breve.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <Label 
                      htmlFor="receipt-upload" 
                      className="cursor-pointer text-primary hover:underline font-medium"
                    >
                      {uploadingReceipt ? "Enviando..." : "Clique para selecionar o comprovante"}
                    </Label>
                    <Input
                      id="receipt-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: imagens ou PDF
                    </p>
                  </div>

                  {uploadingReceipt && (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Enviando comprovante...</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Após a confirmação do pagamento, você receberá as instruções por WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            Contrato de Guiamento Disney
          </h1>
          <p className="text-muted-foreground">
            Revise os dados e aceite o contrato
          </p>
        </div>

        {/* Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Contratante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome Completo</p>
                <p className="font-medium">{contract?.nome_completo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{contract?.cpf}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{contract?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{contract?.telefone}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{contract?.endereco} - CEP: {contract?.cep}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes do Guiamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Guia</p>
                <p className="font-medium">{contract?.nome_guia}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium text-lg text-primary">{contract?.valor}</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dias</p>
                  <p className="font-medium">{contract?.quantidade_dias} dia(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pessoas</p>
                  <p className="font-medium">{contract?.quantidade_pessoas || "-"}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Datas dos Parques</p>
              <p className="font-medium whitespace-pre-line">{contract?.datas_requeridas}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contract Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Termos e Condições do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] rounded-md border p-4 bg-muted/30">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {CONTRACT_TERMS}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle>Assinatura Digital</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Desenhe sua assinatura no campo abaixo para formalizar o aceite do contrato.
            </p>
            <SignaturePad 
              onSignatureComplete={handleSignatureComplete}
              disabled={submitting}
            />
            {signature && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Assinatura registrada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Accept Terms */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                disabled={submitting}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito todos os termos do contrato de guiamento. Declaro que as informações 
                fornecidas são verdadeiras e me comprometo a cumprir as obrigações descritas no 
                contrato, incluindo pagamento e regras de cancelamento.
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full h-14 text-lg"
          onClick={handleSubmit}
          disabled={!acceptTerms || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Aceitar Contrato
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Ao aceitar, você concorda com os termos do contrato e confirma a veracidade das informações.
        </p>
      </div>
    </div>
  );
};

export default AceitarContrato;
