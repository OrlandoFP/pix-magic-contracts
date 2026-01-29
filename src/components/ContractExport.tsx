import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface Contract {
  id: string;
  nome_completo: string;
  cpf: string;
  valor: string;
  created_at: string;
}

interface ContractExportProps {
  contracts: Contract[];
}

const MONTHS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function ContractExport({ contracts }: ContractExportProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isOpen, setIsOpen] = useState(false);

  // Get unique years from contracts
  const years = [...new Set(contracts.map(c => new Date(c.created_at).getFullYear()))]
    .sort((a, b) => b - a);
  
  // If no contracts yet, show current year
  const availableYears = years.length > 0 ? years : [new Date().getFullYear()];

  const handleExport = () => {
    let filteredContracts = contracts;

    // Filter by month and year if selected
    if (selectedMonth && selectedYear) {
      filteredContracts = contracts.filter(contract => {
        const date = new Date(contract.created_at);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear());
        return month === selectedMonth && year === selectedYear;
      });
    }

    if (filteredContracts.length === 0) {
      return;
    }

    // Prepare data for Excel
    const data = filteredContracts.map(contract => ({
      "Nome do Cliente": contract.nome_completo,
      "CPF": contract.cpf,
      "Valor (R$)": contract.valor,
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contratos");

    // Auto-size columns
    const maxWidth = data.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const value = String(row[key as keyof typeof row]);
        acc[key] = Math.max(acc[key] || 10, value.length + 2);
      });
      return acc;
    }, {} as Record<string, number>);

    ws['!cols'] = Object.keys(maxWidth).map(key => ({ wch: maxWidth[key] }));

    // Generate filename
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Todos";
    const filename = selectedMonth 
      ? `contratos_${monthLabel}_${selectedYear}.xlsx`
      : `contratos_${selectedYear}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    setIsOpen(false);
  };

  const getFilteredCount = () => {
    if (!selectedMonth || !selectedYear) return contracts.length;
    
    return contracts.filter(contract => {
      const date = new Date(contract.created_at);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear());
      return month === selectedMonth && year === selectedYear;
    }).length;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Exportar para NF</h4>
            <p className="text-xs text-muted-foreground">
              Selecione o mês e ano para exportar os contratos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              {getFilteredCount()} contrato(s) encontrado(s)
            </p>
            <Button 
              className="w-full gap-2" 
              onClick={handleExport}
              disabled={getFilteredCount() === 0}
            >
              <Download className="h-4 w-4" />
              Baixar Excel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
