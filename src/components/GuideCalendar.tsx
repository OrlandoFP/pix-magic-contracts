import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, AlertTriangle, Castle, MessageCircle, Check, ShoppingCart } from "lucide-react";
import { format, isValid, subDays, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contract {
  id: string;
  nome_completo: string;
  telefone: string;
  datas_requeridas: string;
  nome_guia: string;
  quantidade_dias: number;
  hospede_disney?: boolean;
  comprado?: boolean;
}

interface ScheduledEvent {
  date: Date;
  park: string;
  clientName: string;
  hospedeDisney: boolean;
}

interface MultipassReminder {
  contractId: string;
  clientName: string;
  telefone: string;
  buyDate: Date;
  tripStartDate: Date;
  hospedeDisney: boolean;
  daysUntilBuy: number;
  comprado: boolean;
}

interface GuideCalendarProps {
  contracts: Contract[];
  guideName: string;
}

// Parse park dates from the datas_requeridas string
function parseScheduledDates(contracts: Contract[]): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  
  contracts.forEach((contract) => {
    const lines = contract.datas_requeridas.split(/[,;\n]/);
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const dateMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = dateMatch[3] 
          ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10))
          : new Date().getFullYear();
        
        const date = new Date(year, month - 1, day);
        
        if (isValid(date)) {
          const parkMatch = trimmed.replace(dateMatch[0], "").replace(/[-–—():]/g, "").trim();
          
          events.push({
            date,
            park: parkMatch || "Parque",
            clientName: contract.nome_completo,
            hospedeDisney: contract.hospede_disney ?? false,
          });
        }
      }
    });
  });
  
  return events;
}

// Calculate Multipass reminders based on D-3 or D-7 rule
function calculateMultipassReminders(contracts: Contract[]): MultipassReminder[] {
  const reminders: MultipassReminder[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  contracts.forEach((contract) => {
    const lines = contract.datas_requeridas.split(/[,;\n]/);
    let earliestDate: Date | null = null;
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const dateMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = dateMatch[3] 
          ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10))
          : new Date().getFullYear();
        
        const date = new Date(year, month - 1, day);
        
        if (isValid(date) && (!earliestDate || isBefore(date, earliestDate))) {
          earliestDate = date;
        }
      }
    });
    
    if (earliestDate) {
      const hospedeDisney = contract.hospede_disney ?? false;
      const daysBeforeRule = hospedeDisney ? 7 : 3;
      const buyDate = subDays(earliestDate, daysBeforeRule);
      
      const fourteenDaysFromNow = addDays(today, 14);
      const daysUntilBuy = Math.ceil((buyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (isBefore(buyDate, fourteenDaysFromNow) && isAfter(earliestDate, today)) {
        reminders.push({
          contractId: contract.id,
          clientName: contract.nome_completo,
          telefone: contract.telefone,
          buyDate,
          tripStartDate: earliestDate,
          hospedeDisney,
          daysUntilBuy,
          comprado: contract.comprado ?? false,
        });
      }
    }
  });
  
  return reminders.sort((a, b) => a.buyDate.getTime() - b.buyDate.getTime());
}

export function GuideCalendar({ contracts, guideName }: GuideCalendarProps) {
  const [compradoStatus, setCompradoStatus] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const scheduledEvents = useMemo(() => parseScheduledDates(contracts), [contracts]);
  const multipassReminders = useMemo(() => calculateMultipassReminders(contracts), [contracts]);
  
  const scheduledDates = useMemo(() => {
    return scheduledEvents.map((e) => e.date);
  }, [scheduledEvents]);
  
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return scheduledEvents
      .filter((e) => e.date >= now && e.date <= thirtyDaysFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [scheduledEvents]);

  const handleWhatsApp = (telefone: string, clientName: string) => {
    const phone = telefone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${clientName.split(' ')[0]}! Aqui é da equipe de guias. Estou entrando em contato sobre a compra do Multipass.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleToggleComprado = async (contractId: string, currentStatus: boolean) => {
    setUpdatingId(contractId);
    const newValue = !currentStatus;
    
    const { error } = await supabase
      .from('contracts')
      .update({ comprado: newValue })
      .eq('id', contractId);
    
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setCompradoStatus(prev => ({ ...prev, [contractId]: newValue }));
      toast.success(newValue ? 'Marcado como comprado' : 'Desmarcado');
    }
    setUpdatingId(null);
  };

  const isComprado = (reminder: MultipassReminder) => {
    return compradoStatus[reminder.contractId] ?? reminder.comprado;
  };

  return (
    <div className="space-y-6">
      {/* Multipass Reminders */}
      {multipassReminders.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Lembretes Multipass
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {multipassReminders.map((reminder, index) => (
                <div
                  key={`reminder-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    reminder.daysUntilBuy <= 0
                      ? "bg-red-100 border-red-300 dark:bg-red-950/50 dark:border-red-800"
                      : reminder.daysUntilBuy <= 2
                      ? "bg-amber-100 border-amber-300 dark:bg-amber-950/50 dark:border-amber-700"
                      : "bg-background border-border"
                  }`}
                >
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-md text-sm font-bold ${
                    reminder.daysUntilBuy <= 0
                      ? "bg-red-500 text-white"
                      : reminder.daysUntilBuy <= 2
                      ? "bg-amber-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}>
                    <span className="text-xs uppercase">
                      {format(reminder.buyDate, "MMM", { locale: ptBR })}
                    </span>
                    <span className="text-lg leading-none">
                      {format(reminder.buyDate, "dd")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{reminder.clientName}</p>
                      {isComprado(reminder) && (
                        <Badge className="bg-green-600 text-white text-xs gap-1">
                          <Check className="h-3 w-3" />
                          Comprado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          reminder.hospedeDisney 
                            ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400" 
                            : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <Castle className="h-3 w-3 mr-1" />
                        {reminder.hospedeDisney ? "D-7 Hóspede" : "D-3 Não Hóspede"}
                      </Badge>
                      {reminder.daysUntilBuy <= 0 ? (
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                          ATRASADO!
                        </span>
                      ) : reminder.daysUntilBuy === 1 ? (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          AMANHÃ
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          em {reminder.daysUntilBuy} dias
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Viagem: {format(reminder.tripStartDate, "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      className={`gap-1 ${
                        isComprado(reminder) 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      onClick={() => handleToggleComprado(reminder.contractId, isComprado(reminder))}
                      disabled={updatingId === reminder.contractId}
                    >
                      {isComprado(reminder) ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                      <span className="hidden sm:inline">{isComprado(reminder) ? 'Comprado' : 'Comprar'}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleWhatsApp(reminder.telefone, reminder.clientName)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              Agenda de {guideName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={scheduledDates}
              className="rounded-md border pointer-events-none"
              locale={ptBR}
              modifiers={{
                scheduled: scheduledDates,
              }}
              modifiersStyles={{
                scheduled: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  fontWeight: "bold",
                },
              }}
            />
          </CardContent>
        </Card>
        
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Próximos Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhum atendimento agendado</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {upcomingEvents.map((event, index) => (
                  <div
                    key={`${event.date.toISOString()}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-md bg-primary text-primary-foreground text-sm font-bold">
                      <span className="text-xs uppercase">
                        {format(event.date, "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-lg leading-none">
                        {format(event.date, "dd")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{event.clientName}</p>
                        {event.hospedeDisney && (
                          <Castle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {event.park}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Contratos</p>
          <p className="text-2xl font-bold text-primary">{contracts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Dias Agendados</p>
          <p className="text-2xl font-bold text-primary">{scheduledDates.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
          <p className="text-2xl font-bold text-primary">{upcomingEvents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Clientes Únicos</p>
          <p className="text-2xl font-bold text-primary">
            {new Set(contracts.map((c) => c.nome_completo)).size}
          </p>
        </Card>
      </div>
    </div>
  );
}