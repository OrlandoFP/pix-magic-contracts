import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronUp, ChevronDown, Pencil, Download, Trash2, Phone, Calendar, MapPin, Castle, MessageCircle, ShoppingCart, Check, Users, CheckCircle2, Copy, Key, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { generateContractPDF } from "@/lib/contract-pdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ShareContractButton } from "@/components/ShareContractButton";
import { generatePassword } from "@/lib/password-generator";

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
  created_at: string;
  hospede_disney: boolean;
  comprado?: boolean;
  signed_contract_url?: string | null;
  payment_receipt_url?: string | null;
  acceptance_token?: string | null;
  accepted_at?: string | null;
  signature_url?: string | null;
  umbler_chat_url?: string | null;
}

interface ContractCardProps {
  contract: Contract;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

export function ContractCard({ contract, onEdit, onDelete }: ContractCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isComprado, setIsComprado] = useState(contract.comprado || false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [signedContractUrl, setSignedContractUrl] = useState(contract.signed_contract_url || null);
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState(contract.payment_receipt_url || null);

  const createdDate = new Date(contract.created_at);
  const day = format(createdDate, "d");
  const month = format(createdDate, "MMM", { locale: ptBR }).toUpperCase();
  const year = format(createdDate, "yyyy");

  const handleDownload = () => {
    const pdf = generateContractPDF({
      nomeCompleto: contract.nome_completo,
      cpf: contract.cpf,
      endereco: contract.endereco,
      cep: contract.cep,
      email: contract.email,
      telefone: contract.telefone,
      datasRequeridas: contract.datas_requeridas,
      nomeGuia: contract.nome_guia,
      quantidadeDias: contract.quantidade_dias.toString(),
      valor: contract.valor,
      quantidadePessoas: String(contract.quantidade_pessoas || 1),
    });
    pdf.save(`contrato-${contract.nome_completo.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = contract.telefone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${contract.nome_completo.split(' ')[0]}! Aqui é da equipe de guias. Estou entrando em contato sobre o seu passeio.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleToggleComprado = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    
    const newValue = !isComprado;
    const { error } = await supabase
      .from('contracts')
      .update({ comprado: newValue })
      .eq('id', contract.id);
    
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setIsComprado(newValue);
      toast.success(newValue ? 'Marcado como comprado' : 'Desmarcado');
    }
    setIsUpdating(false);
  };

  // Disney parks list
  const disneyParks = ['magic kingdom', 'epcot', 'animal kingdom', 'hollywood studios'];
  
  const isDisneyPark = (parkName: string) => {
    const normalized = parkName.toLowerCase();
    return disneyParks.some(dp => normalized.includes(dp));
  };

  // Parse park entries with dates from datas_requeridas
  const parseParkEntries = (datas: string) => {
    const entries: { date: string; park: string }[] = [];
    
    // Split by newline or comma for multiple entries
    const lines = datas.split(/[\n,]/).filter(line => line.trim());
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Format 1: "DD/MM - Park Name" or "DD/MM/YYYY - Park Name"
      const format1 = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s*[-–:]\s*(.+)$/);
      if (format1) {
        const day = format1[1].padStart(2, '0');
        const month = format1[2].padStart(2, '0');
        entries.push({ 
          date: `${day}/${month}`, 
          park: format1[3].trim() 
        });
        return;
      }
      
      // Format 2: "Park Name (DD/MM/YYYY)" or "Park Name (DD/MM)"
      const format2 = trimmed.match(/^(.+?)\s*\((\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\)$/);
      if (format2) {
        const parkName = format2[1].trim();
        // Skip if park name says "A definir" or similar
        if (!parkName.toLowerCase().includes('a definir')) {
          const day = format2[2].padStart(2, '0');
          const month = format2[3].padStart(2, '0');
          entries.push({ 
            date: `${day}/${month}`, 
            park: parkName 
          });
        }
        return;
      }
      
      // Format 3: Just park name with text in parentheses (like "A definir") - skip
      // This catches cases like "Magic Kingdom (A definir)"
    });
    
    // Sort entries by date (handling month/year wrap-around)
    entries.sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
    
    return entries;
  };

  const parkEntries = parseParkEntries(contract.datas_requeridas);
  
  // Check if first Disney park exists in the schedule
  const hasFirstDisneyPark = parkEntries.some(entry => isDisneyPark(entry.park));
  
  // Determine D-7 or D-3 based on hospede_disney flag
  const deadlineType = contract.hospede_disney ? 'D-7' : 'D-3';
  
  // Get travel period (first and last date)
  const getTravelPeriod = () => {
    if (parkEntries.length === 0) return null;
    if (parkEntries.length === 1) return parkEntries[0].date;
    return `${parkEntries[0].date} a ${parkEntries[parkEntries.length - 1].date}`;
  };

  const travelPeriod = getTravelPeriod();

  // Generate deterministic password based on contract ID (same password every time for the same contract)
  const getClientPassword = () => {
    // Use contract.id as seed to generate consistent password
    const seed = contract.id.replace(/-/g, '').slice(0, 8);
    let password = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    for (let i = 0; i < 10; i++) {
      const charCode = parseInt(seed.slice(i % 8, (i % 8) + 2) || '0', 16);
      password += chars[charCode % chars.length];
    }
    return password;
  };

  const clientPassword = getClientPassword();

  const handleCopyCredentials = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Login: ${contract.email}\nSenha: ${clientPassword}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'}`}>
      {/* Header - always visible */}
      <div 
        className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date badge */}
        <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] sm:text-[10px] opacity-80">{year}</span>
          <span className="text-base sm:text-lg font-bold leading-none">{day}</span>
          <span className="text-[9px] sm:text-[10px] opacity-80">{month}</span>
        </div>

        {/* Client info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{contract.nome_completo}</h3>
            {contract.hospede_disney && (
              <Castle className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="truncate">{contract.nome_guia.toUpperCase()}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {contract.quantidade_pessoas || 1}p
            </span>
            <span className="hidden xs:inline">•</span>
            <span className="font-medium">R$ {contract.valor}</span>
          </div>
        </div>

        {/* Status badges and expand button */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {paymentReceiptUrl && (
            <Badge className="bg-emerald-600 text-white hidden sm:inline-flex gap-1 text-xs">
              <Check className="h-3 w-3" />
              Pago
            </Badge>
          )}
          {contract.accepted_at && (
            <Badge className="bg-blue-600 text-white hidden sm:inline-flex gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Aceito
            </Badge>
          )}
          {isComprado && (
            <Badge className="bg-green-600 text-white hidden sm:inline-flex gap-1 text-xs">
              <Check className="h-3 w-3" />
              Comprado
            </Badge>
          )}
          <Badge variant="outline" className="hidden sm:inline-flex text-xs">
            {deadlineType}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4 sm:pb-6 px-3 sm:px-4 border-t">
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
            {/* Info and actions row */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
              {/* Contact and period info */}
              <div className="flex-1 space-y-3 sm:space-y-4">
                {/* Client info card */}
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Nome do Cliente</p>
                      <p className="font-medium text-sm sm:text-base break-words">{contract.nome_completo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Contato</p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base">{contract.telefone}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">{contract.email}</p>
                    </div>
                  </div>
                </div>

                {/* Credentials card */}
                <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 sm:p-4 border border-violet-200 dark:border-violet-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wide">Credenciais de Acesso</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50"
                      onClick={handleCopyCredentials}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs text-muted-foreground">Login:</span>
                      <span className="text-sm font-mono bg-white dark:bg-black/20 px-2 py-0.5 rounded break-all">{contract.email}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs text-muted-foreground">Senha:</span>
                      <span className="text-sm font-mono bg-white dark:bg-black/20 px-2 py-0.5 rounded">{clientPassword}</span>
                    </div>
                  </div>
                </div>

                {/* Period card */}
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-2">Período da Viagem</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{travelPeriod || 'Não definido'}</span>
                  </div>
                </div>

                {/* Parks/Days card */}
                {parkEntries.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-2 sm:mb-3">Parques / Dias</p>
                    <div className="space-y-2">
                      {parkEntries.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 sm:gap-3 bg-background rounded-md px-2 sm:px-3 py-2 border">
                          <span className="text-xs sm:text-sm font-semibold text-primary min-w-[40px] sm:min-w-[50px]">{entry.date}</span>
                          <span className="text-xs sm:text-sm break-words">{entry.park}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Value card */}
                <div className="bg-primary/10 rounded-lg p-3 sm:p-4 border border-primary/20">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Valor Total</p>
                  <p className="text-lg sm:text-xl font-bold text-primary">R$ {contract.valor}</p>
                </div>

                {/* Address */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide mb-1">Endereço</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm break-words">{contract.endereco} - CEP: {contract.cep}</p>
                  </div>
                </div>

                {/* Document uploads */}
                <div className="grid grid-cols-1 gap-3">
                  <DocumentUpload
                    contractId={contract.id}
                    label="Contrato Assinado"
                    currentUrl={signedContractUrl}
                    fieldName="signed_contract_url"
                    onUploadComplete={(url) => setSignedContractUrl(url || null)}
                  />
                  <DocumentUpload
                    contractId={contract.id}
                    label="Comprovante de Pagamento"
                    currentUrl={paymentReceiptUrl}
                    fieldName="payment_receipt_url"
                    onUploadComplete={(url) => setPaymentReceiptUrl(url || null)}
                  />
                </div>

                {/* Acceptance status */}
                {contract.accepted_at && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">Contrato Aceito Digitalmente</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Data: {new Date(contract.accepted_at).toLocaleString("pt-BR")}
                    </p>
                    {contract.signature_url && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Assinatura:</p>
                        <img 
                          src={contract.signature_url} 
                          alt="Assinatura do cliente" 
                          className="h-12 sm:h-16 bg-white rounded border"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:w-40">
                <Button
                  size="sm"
                  className={`gap-1.5 justify-center text-xs sm:text-sm ${
                    isComprado 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                  onClick={handleToggleComprado}
                  disabled={isUpdating}
                >
                  {isComprado ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  <span className="truncate">{isComprado ? 'Comprado' : 'Comprar'}</span>
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="gap-1.5 justify-center bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm flex-1"
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="truncate">WhatsApp</span>
                  </Button>
                  {contract.umbler_chat_url && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(contract.umbler_chat_url!, '_blank');
                      }}
                      title="Abrir chat Umbler"
                    >
                      <Headset className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 justify-center text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(contract);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="truncate">Editar</span>
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 justify-center text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="truncate">PDF</span>
                </Button>
                <ShareContractButton
                  contractId={contract.id}
                  clientName={contract.nome_completo}
                  clientPhone={contract.telefone}
                  existingToken={contract.acceptance_token}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 justify-center text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contract);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="truncate">Remover</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
