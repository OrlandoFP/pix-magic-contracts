import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileSpreadsheet, Search, X, Download, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface Contract {
  id: string;
  nome_completo: string;
  cpf: string;
  valor: string;
  nome_guia: string;
  created_at: string;
  accepted_at: string | null;
  payment_receipt_url: string | null;
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

const Faturamento = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedGuide, setSelectedGuide] = useState<string>("all");

  useEffect(() => {
    const fetchContracts = async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, nome_completo, cpf, valor, nome_guia, created_at, accepted_at, payment_receipt_url")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contracts:", error);
      } else {
        setContracts(data || []);
      }
      setLoading(false);
    };

    fetchContracts();
  }, []);

  // Get unique years from contracts
  const years = useMemo(() => {
    const uniqueYears = [...new Set(contracts.map(c => new Date(c.created_at).getFullYear()))].sort((a, b) => b - a);
    return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
  }, [contracts]);

  // Filter contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter (name, CPF, value)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          contract.nome_completo.toLowerCase().includes(query) ||
          contract.cpf.includes(query) ||
          contract.valor.includes(query);
        if (!matchesSearch) return false;
      }

      // Month filter
      if (selectedMonth) {
        const date = new Date(contract.created_at);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        if (month !== selectedMonth) return false;
      }

      // Year filter
      if (selectedYear) {
        const date = new Date(contract.created_at);
        const year = String(date.getFullYear());
        if (year !== selectedYear) return false;
      }

      // Guide filter
      if (selectedGuide !== "all") {
        if (!contract.nome_guia.toLowerCase().includes(selectedGuide)) return false;
      }

      return true;
    });
  }, [contracts, searchQuery, selectedMonth, selectedYear, selectedGuide]);

  // Calculate totals
  const totals = useMemo(() => {
    const parseValue = (valor: string) => {
      const match = valor.match(/[\d.,]+/);
      if (!match) return 0;
      return parseFloat(match[0].replace(".", "").replace(",", "."));
    };

    const total = filteredContracts.reduce((sum, c) => sum + parseValue(c.valor), 0);
    return {
      count: filteredContracts.length,
      total: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    };
  }, [filteredContracts]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMonth("");
    setSelectedGuide("all");
  };

  const hasActiveFilters = searchQuery || selectedMonth || selectedGuide !== "all";

  const handleExport = () => {
    if (filteredContracts.length === 0) return;

    const data = filteredContracts.map(contract => ({
      "Nome do Cliente": contract.nome_completo,
      "CPF": contract.cpf,
      "Valor (R$)": contract.valor,
      "Guia": contract.nome_guia,
      "Data": new Date(contract.created_at).toLocaleDateString("pt-BR"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Faturamento");

    // Auto-size columns
    const maxWidth = data.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const value = String(row[key as keyof typeof row]);
        acc[key] = Math.max(acc[key] || 10, value.length + 2);
      });
      return acc;
    }, {} as Record<string, number>);

    ws['!cols'] = Object.keys(maxWidth).map(key => ({ wch: maxWidth[key] }));

    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Todos";
    const guideLabel = selectedGuide === "all" ? "Todos" : selectedGuide;
    const filename = `faturamento_${monthLabel}_${selectedYear}_${guideLabel}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Receipt className="h-8 w-8" />
            Faturamento
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Dados para emissão de Nota Fiscal
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou valor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Month Filter */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Filter */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full lg:w-32">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Guide Filter */}
              <Select value={selectedGuide} onValueChange={setSelectedGuide}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Guia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os guias</SelectItem>
                  <SelectItem value="rafael">Rafael</SelectItem>
                  <SelectItem value="kleber">Kleber</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button onClick={handleExport} disabled={filteredContracts.length === 0} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Active filters and totals */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Busca: "{searchQuery}"
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {selectedMonth && (
                    <Badge variant="secondary" className="gap-1">
                      {MONTHS.find(m => m.value === selectedMonth)?.label}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedMonth("")} />
                    </Badge>
                  )}
                  {selectedGuide !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedGuide === "rafael" ? "Rafael" : "Kleber"}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedGuide("all")} />
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="ml-auto flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {totals.count} contrato(s)
                </span>
                <Badge variant="default" className="text-base px-3 py-1">
                  Total: {totals.total}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Contratos para NF
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando contratos...
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum contrato encontrado</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Cliente</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Guia</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.nome_completo}</TableCell>
                        <TableCell className="font-mono text-sm">{contract.cpf}</TableCell>
                        <TableCell className="font-semibold text-primary">{contract.valor}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {contract.nome_guia.includes("Rafael") ? "Rafael" : "Kleber"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {contract.payment_receipt_url ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Pago
                            </Badge>
                          ) : contract.accepted_at ? (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Aceito
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Faturamento;
