import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, User, CalendarDays, List, Search, Filter, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GuideCalendar } from "@/components/GuideCalendar";
import { Button } from "@/components/ui/button";
import { ContractEditDialog } from "@/components/ContractEditDialog";
import { ContractDeleteDialog } from "@/components/ContractDeleteDialog";
import { ContractCard } from "@/components/ContractCard";

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
}

type StatusFilter = "all" | "pending" | "accepted" | "paid" | "purchased";

const Contratos = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [guideFilter, setGuideFilter] = useState<"all" | "rafael" | "kleber">("all");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contracts:", error);
      } else {
        setContracts(data || []);
      }
      setLoading(false);
    };

    fetchContracts();

    // Real-time subscription
    const channel = supabase
      .channel("contracts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contracts",
        },
        (payload) => {
          console.log("Realtime update:", payload);
          
          if (payload.eventType === "INSERT") {
            setContracts((prev) => [payload.new as Contract, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setContracts((prev) =>
              prev.map((c) =>
                c.id === (payload.new as Contract).id ? (payload.new as Contract) : c
              )
            );
          } else if (payload.eventType === "DELETE") {
            setContracts((prev) =>
              prev.filter((c) => c.id !== (payload.old as Contract).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setEditDialogOpen(true);
  };

  const handleDelete = (contract: Contract) => {
    setContractToDelete({ id: contract.id, name: contract.nome_completo });
    setDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setGuideFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || guideFilter !== "all";

  // Apply all filters
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          contract.nome_completo.toLowerCase().includes(query) ||
          contract.email.toLowerCase().includes(query) ||
          contract.telefone.includes(query) ||
          contract.cpf.includes(query);
        if (!matchesSearch) return false;
      }

      // Guide filter
      if (guideFilter !== "all") {
        const guideMatch = contract.nome_guia.toLowerCase().includes(guideFilter);
        if (!guideMatch) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        switch (statusFilter) {
          case "pending":
            if (contract.accepted_at) return false;
            break;
          case "accepted":
            if (!contract.accepted_at) return false;
            break;
          case "paid":
            if (!contract.payment_receipt_url) return false;
            break;
          case "purchased":
            if (!contract.comprado) return false;
            break;
        }
      }

      return true;
    });
  }, [contracts, searchQuery, statusFilter, guideFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = contracts.length;
    const accepted = contracts.filter(c => c.accepted_at).length;
    const paid = contracts.filter(c => c.payment_receipt_url).length;
    const purchased = contracts.filter(c => c.comprado).length;
    const pending = total - accepted;
    
    return { total, accepted, paid, purchased, pending };
  }, [contracts]);

  const rafaelContracts = filteredContracts.filter(
    (c) => c.nome_guia.toLowerCase().includes("rafael")
  );
  const kleberContracts = filteredContracts.filter(
    (c) => c.nome_guia.toLowerCase().includes("kleber")
  );

  const ContractList = ({ data }: { data: Contract[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum contrato encontrado</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Limpar filtros
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
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
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Agenda dos Guias
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Calendário em tempo real com todos os atendimentos
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.accepted}</p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Aceitos</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.paid}</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Pagos</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.purchased}</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80">Comprados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, telefone ou CPF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="accepted">Aceitos</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="purchased">Comprados</SelectItem>
                </SelectContent>
              </Select>

              {/* Guide Filter */}
              <Select value={guideFilter} onValueChange={(v) => setGuideFilter(v as "all" | "rafael" | "kleber")}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Guia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Guias</SelectItem>
                  <SelectItem value="rafael">Rafael</SelectItem>
                  <SelectItem value="kleber">Kleber</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Active filters badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-3">
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Busca: "{searchQuery}"
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter === "pending" ? "Pendentes" : statusFilter === "accepted" ? "Aceitos" : statusFilter === "paid" ? "Pagos" : "Comprados"}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                  </Badge>
                )}
                {guideFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Guia: {guideFilter === "rafael" ? "Rafael" : "Kleber"}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setGuideFilter("all")} />
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground ml-2">
                  {filteredContracts.length} resultado(s)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contratos
                <Badge variant="outline">{filteredContracts.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  Agenda
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  Lista
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando contratos...
              </div>
            ) : guideFilter === "all" ? (
              <Tabs defaultValue="rafael" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="rafael" className="flex items-center gap-2">
                    Rafael
                    <Badge variant="outline" className="ml-1">
                      {rafaelContracts.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="kleber" className="flex items-center gap-2">
                    Kleber
                    <Badge variant="outline" className="ml-1">
                      {kleberContracts.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="rafael">
                  {viewMode === "calendar" ? (
                    <GuideCalendar contracts={rafaelContracts} guideName="Rafael" />
                  ) : (
                    <ContractList data={rafaelContracts} />
                  )}
                </TabsContent>
                
                <TabsContent value="kleber">
                  {viewMode === "calendar" ? (
                    <GuideCalendar contracts={kleberContracts} guideName="Kleber" />
                  ) : (
                    <ContractList data={kleberContracts} />
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              // When a specific guide is selected, show only that guide's contracts
              viewMode === "calendar" ? (
                <GuideCalendar 
                  contracts={filteredContracts} 
                  guideName={guideFilter === "rafael" ? "Rafael" : "Kleber"} 
                />
              ) : (
                <ContractList data={filteredContracts} />
              )
            )}
          </CardContent>
        </Card>
      </main>

      <ContractEditDialog
        contract={selectedContract}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <ContractDeleteDialog
        contractId={contractToDelete?.id ?? null}
        contractName={contractToDelete?.name ?? null}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
};

export default Contratos;
