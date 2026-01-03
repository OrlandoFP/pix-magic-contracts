import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronUp, ChevronDown, Pencil, Download, Trash2, Phone, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { generateContractPDF } from "@/lib/contract-pdf";

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
  valor: string;
  created_at: string;
}

interface ContractCardProps {
  contract: Contract;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

export function ContractCard({ contract, onEdit, onDelete }: ContractCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Parse dates from datas_requeridas to show period
  const parseDates = (datas: string) => {
    const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
    const matches = datas.match(datePattern);
    if (matches && matches.length > 0) {
      return {
        start: matches[0],
        end: matches[matches.length - 1],
      };
    }
    return null;
  };

  const period = parseDates(contract.datas_requeridas);

  // Parse park entries from datas_requeridas
  const parseParkEntries = (datas: string) => {
    const lines = datas.split('\n').filter(line => line.trim());
    const entries: { park: string; date: string }[] = [];
    
    lines.forEach(line => {
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        const park = line.replace(dateMatch[0], '').replace(/[-–:]/g, '').trim();
        entries.push({ park: park || 'Parque', date: dateMatch[1] });
      }
    });
    
    return entries;
  };

  const parkEntries = parseParkEntries(contract.datas_requeridas);

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
          <h3 className="font-semibold text-foreground truncate">{contract.nome_completo}</h3>
          <p className="text-sm text-muted-foreground">
            {contract.nome_guia.toUpperCase()} • {contract.quantidade_dias} PAX • R$ {contract.valor}
          </p>
        </div>

        {/* Status badge and expand button */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            Ativo
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
              <div className="flex-1 bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Contato Principal</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{contract.telefone}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{contract.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Período da Viagem</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {period ? `${period.start} a ${period.end}` : contract.datas_requeridas.substring(0, 30)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Park entries */}
                {parkEntries.length > 0 && (
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-2">Roteiro Selecionado</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parkEntries.map((entry, index) => (
                        <div key={index} className="bg-background rounded-lg border p-3 flex justify-between items-center">
                          <span className="text-sm font-medium truncate">{entry.park}</span>
                          <span className="text-xs text-primary font-semibold ml-2">{entry.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
              <div className="flex flex-row lg:flex-col gap-2 lg:w-40">
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
