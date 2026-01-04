import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronUp, ChevronDown, Pencil, Download, Trash2, Phone, Calendar, MapPin, Castle, MessageCircle, ShoppingCart, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { generateContractPDF } from "@/lib/contract-pdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    const lines = datas.split('\n').filter(line => line.trim());
    const entries: { date: string; park: string }[] = [];
    
    lines.forEach(line => {
      const dateMatch = line.match(/(\d{2})\/(\d{2})(?:\/\d{4})?/);
      if (dateMatch) {
        const dayMonth = `${dateMatch[1]}/${dateMatch[2]}`;
        const park = line.replace(/\d{2}\/\d{2}(\/\d{4})?/g, '').replace(/[-–:]/g, '').trim();
        entries.push({ date: dayMonth, park: park || 'Passeio' });
      }
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

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'}`}>
      {/* Header - always visible */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date badge */}
        <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full w-14 h-14 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] opacity-80">{year}</span>
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-[10px] opacity-80">{month}</span>
        </div>

        {/* Client info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{contract.nome_completo}</h3>
            {contract.hospede_disney && (
              <Castle className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{contract.nome_guia.toUpperCase()}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {contract.quantidade_pessoas || 1} pessoas
            </span>
            <span>•</span>
            <span>R$ {contract.valor}</span>
          </p>
        </div>

        {/* Status badges and expand button */}
        <div className="flex items-center gap-2">
          {isComprado && (
            <Badge className="bg-green-600 text-white hidden sm:inline-flex gap-1">
              <Check className="h-3 w-3" />
              Comprado
            </Badge>
          )}
          <Badge variant="outline" className="hidden sm:inline-flex">
            {deadlineType}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0 pb-6 px-4 border-t">
          <div className="mt-4 space-y-4">
            {/* Info and actions row */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Contact and period info */}
              <div className="flex-1 space-y-4">
                {/* Client info card */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Nome do Cliente</p>
                      <p className="font-medium">{contract.nome_completo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Contato</p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{contract.telefone}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{contract.email}</p>
                    </div>
                  </div>
                </div>

                {/* Period card */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-2">Período da Viagem</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{travelPeriod || 'Não definido'}</span>
                  </div>
                </div>

                {/* Parks/Days card */}
                {parkEntries.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-3">Parques / Dias</p>
                    <div className="space-y-2">
                      {parkEntries.map((entry, index) => (
                        <div key={index} className="flex items-center gap-3 bg-background rounded-md px-3 py-2 border">
                          <span className="text-sm font-semibold text-primary min-w-[50px]">{entry.date}</span>
                          <span className="text-sm">{entry.park}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Value card */}
                <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Valor Total</p>
                  <p className="text-xl font-bold text-primary">R$ {contract.valor}</p>
                </div>

                {/* Address */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide mb-1">Endereço</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{contract.endereco} - CEP: {contract.cep}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-row lg:flex-col gap-2 lg:w-44">
                <Button
                  className={`flex-1 lg:flex-none gap-2 justify-center ${
                    isComprado 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                  onClick={handleToggleComprado}
                  disabled={isUpdating}
                >
                  {isComprado ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {isComprado ? 'Comprado' : 'Comprar'}
                </Button>
                <Button
                  className="flex-1 lg:flex-none gap-2 justify-center bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 lg:flex-none gap-2 justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(contract);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  className="flex-1 lg:flex-none gap-2 justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 lg:flex-none gap-2 justify-center text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contract);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
