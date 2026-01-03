import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, User, CalendarDays, List, Pencil, Trash2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GuideCalendar } from "@/components/GuideCalendar";
import { Button } from "@/components/ui/button";
import { ContractEditDialog } from "@/components/ContractEditDialog";
import { ContractDeleteDialog } from "@/components/ContractDeleteDialog";
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

const Contratos = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  
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

  const handleDownload = (contract: Contract) => {
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

  const rafaelContracts = contracts.filter(
    (c) => c.nome_guia.toLowerCase().includes("rafael")
  );
  const kleberContracts = contracts.filter(
    (c) => c.nome_guia.toLowerCase().includes("kleber")
  );

  const ContractTable = ({ data }: { data: Contract[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum contrato encontrado</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Datas</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">
                  <div>
                    <p>{contract.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{contract.cpf}</p>
                  </div>
                </TableCell>
                <TableCell>{contract.email}</TableCell>
                <TableCell>{contract.telefone}</TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate" title={contract.datas_requeridas}>
                    {contract.datas_requeridas}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{contract.quantidade_dias}</Badge>
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  R$ {contract.valor}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(contract.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(contract)}
                      title="Baixar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(contract)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contract)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contratos por Guia
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
            ) : (
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
                    <ContractTable data={rafaelContracts} />
                  )}
                </TabsContent>
                
                <TabsContent value="kleber">
                  {viewMode === "calendar" ? (
                    <GuideCalendar contracts={kleberContracts} guideName="Kleber" />
                  ) : (
                    <ContractTable data={kleberContracts} />
                  )}
                </TabsContent>
              </Tabs>
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
