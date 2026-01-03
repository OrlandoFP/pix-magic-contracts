import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, User } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  }, []);

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
                <TableCell className="max-w-[200px] truncate">
                  {contract.datas_requeridas}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{contract.quantidade_dias}</Badge>
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  {contract.valor}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(contract.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
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
            Contratos Salvos
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Visualize todos os contratos gerados por guia
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contratos por Guia
            </CardTitle>
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
                  <ContractTable data={rafaelContracts} />
                </TabsContent>
                <TabsContent value="kleber">
                  <ContractTable data={kleberContracts} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Contratos;
