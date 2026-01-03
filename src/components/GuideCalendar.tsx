import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Users, AlertTriangle, Castle, MessageCircle, Check, ShoppingCart, Phone, MapPin, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isValid, subDays, isAfter, isBefore, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contract {
  id: string;
  nome_completo: string;
  telefone: string;
  email: string;
  cpf: string;
  endereco: string;
  cep: string;
  datas_requeridas: string;
  nome_guia: string;
  quantidade_dias: number;
  valor: string;
  hospede_disney?: boolean;
  comprado?: boolean;
}

interface ScheduledEvent {
  date: Date;
  park: string;
  clientName: string;
  hospedeDisney: boolean;
  contractId: string;
}

interface MultipassReminder {
  contractId: string;
  clientName: string;
  telefone: string;
  email: string;
  cpf: string;
  endereco: string;
  cep: string;
  valor: string;
  nomeGuia: string;
  quantidadeDias: number;
  buyDate: Date;
  tripStartDate: Date;
  hospedeDisney: boolean;
  daysUntilBuy: number;
  comprado: boolean;
  datasRequeridas: string;
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
            contractId: contract.id,
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
          email: contract.email,
          cpf: contract.cpf,
          endereco: contract.endereco,
          cep: contract.cep,
          valor: contract.valor,
          nomeGuia: contract.nome_guia,
          quantidadeDias: contract.quantidade_dias,
          datasRequeridas: contract.datas_requeridas,
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
  const [selectedReminder, setSelectedReminder] = useState<MultipassReminder | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const handleEventClick = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Multipass Reminders */}
      {multipassReminders.filter(r => !(compradoStatus[r.contractId] ?? r.comprado)).length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              Lembretes Multipass
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-2 sm:space-y-3">
              {multipassReminders.filter(r => !(compradoStatus[r.contractId] ?? r.comprado)).map((reminder, index) => (
                <div
                  key={`reminder-${index}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border ${
                    reminder.daysUntilBuy <= 0
                      ? "bg-red-100 border-red-300 dark:bg-red-950/50 dark:border-red-800"
                      : reminder.daysUntilBuy <= 2
                      ? "bg-amber-100 border-amber-300 dark:bg-amber-950/50 dark:border-amber-700"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-md text-xs sm:text-sm font-bold flex-shrink-0 ${
                      reminder.daysUntilBuy <= 0
                        ? "bg-red-500 text-white"
                        : reminder.daysUntilBuy <= 2
                        ? "bg-amber-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}>
                      <span className="text-[10px] sm:text-xs uppercase">
                        {format(reminder.buyDate, "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-sm sm:text-lg leading-none">
                        {format(reminder.buyDate, "dd")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <button 
                          className="font-medium truncate text-left hover:text-primary hover:underline cursor-pointer transition-colors text-sm sm:text-base"
                          onClick={() => setSelectedReminder(reminder)}
                        >
                          {reminder.clientName}
                        </button>
                        {isComprado(reminder) && (
                          <Badge className="bg-green-600 text-white text-[10px] sm:text-xs gap-1">
                            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            Comprado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] sm:text-xs ${
                            reminder.hospedeDisney 
                              ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400" 
                              : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          <Castle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          <span className="hidden sm:inline">{reminder.hospedeDisney ? "D-7 Hóspede" : "D-3 Não Hóspede"}</span>
                          <span className="sm:hidden">{reminder.hospedeDisney ? "D-7" : "D-3"}</span>
                        </Badge>
                        {reminder.daysUntilBuy <= 0 ? (
                          <span className="text-[10px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
                            ATRASADO!
                          </span>
                        ) : reminder.daysUntilBuy === 1 ? (
                          <span className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400">
                            AMANHÃ
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            em {reminder.daysUntilBuy} dias
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        Viagem: {format(reminder.tripStartDate, "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-12 sm:ml-0">
                    <Button
                      size="sm"
                      className={`gap-1 flex-1 sm:flex-initial h-8 sm:h-9 text-xs sm:text-sm ${
                        isComprado(reminder) 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      onClick={() => handleToggleComprado(reminder.contractId, isComprado(reminder))}
                      disabled={updatingId === reminder.contractId}
                    >
                      {isComprado(reminder) ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      <span className="hidden sm:inline">{isComprado(reminder) ? 'Comprado' : 'Comprar'}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 flex-1 sm:flex-initial h-8 sm:h-9 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleWhatsApp(reminder.telefone, reminder.clientName)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar - Full Width */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Agenda de {guideName}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="rounded-md border p-2 sm:p-3 overflow-x-auto">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-3 sm:mb-4 min-w-[280px]">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm sm:text-base font-medium capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2 min-w-[280px]">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((day, idx) => (
                <div key={idx} className="text-center text-[10px] sm:text-xs text-muted-foreground font-medium py-1">
                  <span className="sm:hidden">{day}</span>
                  <span className="hidden sm:inline">{["dom", "seg", "ter", "qua", "qui", "sex", "sab"][idx]}</span>
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 min-w-[280px]">
              {(() => {
                const monthStart = startOfMonth(currentMonth);
                const monthEnd = endOfMonth(currentMonth);
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const startDayOfWeek = getDay(monthStart);
                
                const cells = [];
                
                // Empty cells for days before month starts
                for (let i = 0; i < startDayOfWeek; i++) {
                  cells.push(<div key={`empty-${i}`} className="min-h-[50px] sm:min-h-[80px]" />);
                }
                
                // Actual day cells
                days.forEach((day) => {
                  const dayEvents = scheduledEvents.filter((e) => isSameDay(e.date, day));
                  const hasEvents = dayEvents.length > 0;
                  
                  cells.push(
                    <Popover key={day.toISOString()}>
                      <PopoverTrigger asChild>
                        <div
                          className={`min-h-[50px] sm:min-h-[80px] rounded-md border p-0.5 sm:p-1 cursor-pointer hover:bg-muted/50 transition-colors ${
                            hasEvents ? "bg-muted/30 border-primary/30" : "border-transparent"
                          }`}
                        >
                          <div className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${hasEvents ? "text-primary" : "text-muted-foreground"}`}>
                            {format(day, "d")}
                          </div>
                          {hasEvents && (
                            <div className="space-y-0.5 sm:space-y-1">
                              {/* Mobile: show badges/dots, Desktop: show details */}
                              <div className="hidden sm:block">
                                {dayEvents.slice(0, 2).map((event, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event.contractId);
                                    }}
                                    className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate hover:opacity-80 transition-opacity cursor-pointer mb-0.5 ${
                                      event.hospedeDisney 
                                        ? "bg-amber-400 text-amber-900" 
                                        : "bg-primary text-primary-foreground"
                                    }`}
                                    title={`${event.clientName} - ${event.park}`}
                                  >
                                    <span className="font-medium truncate block">{event.clientName.split(' ')[0]}</span>
                                  </button>
                                ))}
                                {dayEvents.length > 2 && (
                                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</span>
                                )}
                              </div>
                              {/* Mobile: colored dots */}
                              <div className="flex flex-wrap gap-0.5 sm:hidden">
                                {dayEvents.slice(0, 3).map((event, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${
                                      event.hospedeDisney 
                                        ? "bg-amber-400" 
                                        : "bg-primary"
                                    }`}
                                  />
                                ))}
                                {dayEvents.length > 3 && (
                                  <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverTrigger>
                      {hasEvents && (
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              {format(day, "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                            {dayEvents.map((event, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleEventClick(event.contractId)}
                                className={`w-full text-left rounded-md p-2 text-xs hover:opacity-90 transition-opacity ${
                                  event.hospedeDisney 
                                    ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-300" 
                                    : "bg-primary/10 border border-primary/30"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{event.clientName}</span>
                                  {event.hospedeDisney && <Castle className="h-3 w-3 text-amber-600" />}
                                </div>
                                <span className="text-muted-foreground">{event.park}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                });
                
                return cells;
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Upcoming Events - Full Width Below */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Próximos Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <CalendarDays className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-40" />
              <p className="text-sm sm:text-base">Nenhum atendimento agendado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {upcomingEvents.map((event, index) => (
                <button
                  key={`${event.date.toISOString()}-${index}`}
                  onClick={() => handleEventClick(event.contractId)}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 border hover:bg-muted/80 transition-colors cursor-pointer text-left"
                >
                  <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-primary text-primary-foreground text-xs sm:text-sm font-bold flex-shrink-0">
                    <span className="text-[10px] sm:text-xs uppercase">
                      {format(event.date, "MMM", { locale: ptBR })}
                    </span>
                    <span className="text-sm sm:text-lg leading-none">
                      {format(event.date, "dd")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <p className="font-medium truncate text-sm sm:text-base">{event.clientName}</p>
                      {event.hospedeDisney && (
                        <Castle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <Badge variant="secondary" className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs">
                      {event.park}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Contratos</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{contracts.length}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Dias Agendados</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{scheduledDates.length}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Próximos 30 dias</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{upcomingEvents.length}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Clientes Únicos</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">
            {new Set(contracts.map((c) => c.nome_completo)).size}
          </p>
        </Card>
      </div>

      {/* Client Details Dialog */}
      <Dialog open={!!selectedReminder} onOpenChange={() => setSelectedReminder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedReminder?.clientName}</DialogTitle>
          </DialogHeader>
          {selectedReminder && (
            <div className="space-y-4 mt-2">
              {/* Contact Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Contato</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedReminder.telefone}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{selectedReminder.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">CPF</p>
                    <p className="font-medium">{selectedReminder.cpf}</p>
                  </div>
                </div>
              </div>

              {/* Guide and Pax */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Guia</p>
                    <p className="font-medium">{selectedReminder.nomeGuia.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Pax</p>
                    <p className="font-medium">{selectedReminder.quantidadeDias}</p>
                  </div>
                </div>
              </div>

              {/* Parks/Days */}
              {selectedReminder.datasRequeridas && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-3">Parques / Dias</p>
                  <div className="space-y-2">
                    {parseParkEntries(selectedReminder.datasRequeridas).map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-background rounded-md px-3 py-2 border">
                        <span className="text-sm font-semibold text-primary min-w-[50px]">{entry.date}</span>
                        <span className="text-sm">{entry.park}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Value */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Valor Total</p>
                <p className="text-xl font-bold text-primary">R$ {selectedReminder.valor}</p>
              </div>

              {/* Address */}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide mb-1">Endereço</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{selectedReminder.endereco} - CEP: {selectedReminder.cep}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleWhatsApp(selectedReminder.telefone, selectedReminder.clientName)}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  className={`flex-1 gap-2 ${
                    isComprado(selectedReminder) 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                  onClick={() => handleToggleComprado(selectedReminder.contractId, isComprado(selectedReminder))}
                  disabled={updatingId === selectedReminder.contractId}
                >
                  {isComprado(selectedReminder) ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {isComprado(selectedReminder) ? 'Comprado' : 'Comprar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Details Dialog from Calendar */}
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedContract?.nome_completo}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 mt-2">
              {/* Contact Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Contato</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedContract.telefone}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{selectedContract.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">CPF</p>
                    <p className="font-medium">{selectedContract.cpf}</p>
                  </div>
                </div>
              </div>

              {/* Guide and Pax */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Guia</p>
                    <p className="font-medium">{selectedContract.nome_guia.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Pax</p>
                    <p className="font-medium">{selectedContract.quantidade_dias}</p>
                  </div>
                </div>
              </div>

              {/* Parks/Days */}
              {selectedContract.datas_requeridas && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-3">Parques / Dias</p>
                  <div className="space-y-2">
                    {parseParkEntries(selectedContract.datas_requeridas).map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-background rounded-md px-3 py-2 border">
                        <span className="text-sm font-semibold text-primary min-w-[50px]">{entry.date}</span>
                        <span className="text-sm">{entry.park}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Value */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Valor Total</p>
                <p className="text-xl font-bold text-primary">R$ {selectedContract.valor}</p>
              </div>

              {/* Address */}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide mb-1">Endereço</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{selectedContract.endereco} - CEP: {selectedContract.cep}</p>
                </div>
              </div>

              {/* Action button */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleWhatsApp(selectedContract.telefone, selectedContract.nome_completo)}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}