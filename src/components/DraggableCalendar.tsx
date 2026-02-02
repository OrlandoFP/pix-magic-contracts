import { useMemo, useState, DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Castle, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { format, isValid, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
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
  originalLine: string;
}

interface DraggableCalendarProps {
  contracts: Contract[];
  guideName: string;
  onEventClick: (contractId: string) => void;
}

// Parse park dates from the datas_requeridas string
function parseScheduledDates(contracts: Contract[]): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  
  contracts.forEach((contract) => {
    const lines = contract.datas_requeridas.split(/[\n]/);
    
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
            originalLine: trimmed,
          });
        }
      }
    });
  });
  
  return events;
}

export function DraggableCalendar({ contracts, guideName, onEventClick }: DraggableCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedEvent, setDraggedEvent] = useState<ScheduledEvent | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const scheduledEvents = useMemo(() => parseScheduledDates(contracts), [contracts]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, event: ScheduledEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({
      contractId: event.contractId,
      originalLine: event.originalLine,
      date: event.date.toISOString(),
    }));
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDropTargetDate(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetDate(day);
  };

  const handleDragLeave = () => {
    setDropTargetDate(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();
    setDropTargetDate(null);
    
    if (!draggedEvent || isUpdating) return;
    
    // Don't do anything if dropped on same date
    if (isSameDay(draggedEvent.date, targetDate)) {
      setDraggedEvent(null);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Find the contract
      const contract = contracts.find(c => c.id === draggedEvent.contractId);
      if (!contract) {
        toast.error("Contrato não encontrado");
        return;
      }
      
      // Parse all lines and replace the date for the dragged event
      const lines = contract.datas_requeridas.split(/[\n]/);
      const newLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed === draggedEvent.originalLine) {
          // Replace the date in this line
          const newDateStr = format(targetDate, "dd/MM/yyyy");
          const updatedLine = trimmed.replace(
            /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
            newDateStr
          );
          return updatedLine;
        }
        return line;
      });
      
      const newDatasRequeridas = newLines.join('\n');
      
      // Update the contract in the database
      const { error } = await supabase
        .from('contracts')
        .update({ datas_requeridas: newDatasRequeridas })
        .eq('id', draggedEvent.contractId);
      
      if (error) {
        console.error("Error updating contract:", error);
        toast.error("Erro ao atualizar data");
      } else {
        toast.success(`Evento movido para ${format(targetDate, "dd/MM/yyyy")}`);
      }
    } catch (err) {
      console.error("Error in drop handler:", err);
      toast.error("Erro ao mover evento");
    } finally {
      setIsUpdating(false);
      setDraggedEvent(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Agenda de {guideName}
          <Badge variant="outline" className="ml-2 text-xs">
            Arraste para mover
          </Badge>
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
                const isDropTarget = dropTargetDate && isSameDay(dropTargetDate, day);
                const isDragging = !!draggedEvent;
                
                cells.push(
                  <Popover key={day.toISOString()}>
                    <PopoverTrigger asChild>
                      <div
                        className={`min-h-[50px] sm:min-h-[80px] rounded-md border p-0.5 sm:p-1 transition-all ${
                          isDropTarget 
                            ? "bg-primary/20 border-primary border-2 scale-105" 
                            : isDragging 
                              ? "border-dashed border-muted-foreground/50" 
                              : hasEvents 
                                ? "bg-muted/30 border-primary/30" 
                                : "border-transparent"
                        } ${isDragging ? "cursor-copy" : "cursor-pointer hover:bg-muted/50"}`}
                        onDragOver={(e) => handleDragOver(e, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        <div className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${
                          isDropTarget ? "text-primary font-bold" : hasEvents ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {format(day, "d")}
                        </div>
                        {hasEvents && (
                          <div className="space-y-0.5">
                            {dayEvents.map((event, idx) => (
                              <div
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, event)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick(event.contractId);
                                }}
                                className={`w-full text-left rounded px-0.5 sm:px-1 py-0.5 text-[8px] sm:text-[10px] leading-tight transition-all cursor-grab active:cursor-grabbing select-none ${
                                  draggedEvent?.contractId === event.contractId && draggedEvent?.originalLine === event.originalLine
                                    ? "opacity-50 scale-95"
                                    : "hover:opacity-80 hover:scale-105"
                                } ${
                                  event.hospedeDisney 
                                    ? "bg-amber-400 text-amber-900" 
                                    : "bg-primary text-primary-foreground"
                                }`}
                                title={`${event.clientName} - ${event.park} (arraste para mover)`}
                              >
                                <div className="flex items-center gap-0.5">
                                  <GripVertical className="h-2 w-2 sm:h-3 sm:w-3 opacity-60 flex-shrink-0" />
                                  <span className="font-medium truncate block">{event.clientName.split(' ')[0]}</span>
                                </div>
                                <span className="truncate block opacity-80 text-[7px] sm:text-[9px] ml-2.5 sm:ml-3.5">{event.park}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverTrigger>
                    {hasEvents && !isDragging && (
                      <PopoverContent className="w-64 p-2" align="start">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {format(day, "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          {dayEvents.map((event, idx) => (
                            <button
                              key={idx}
                              onClick={() => onEventClick(event.contractId)}
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
          
          {/* Loading overlay */}
          {isUpdating && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
              <div className="text-sm text-muted-foreground">Atualizando...</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
