import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Contract {
  id: string;
  nome_completo: string;
  datas_requeridas: string;
  nome_guia: string;
  quantidade_dias: number;
}

interface ScheduledEvent {
  date: Date;
  park: string;
  clientName: string;
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
      
      // Try to extract date and park name
      // Format examples: "07/01 - Magic Kingdom", "Magic Kingdom (07/01/2026)"
      const dateMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = dateMatch[3] 
          ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10))
          : new Date().getFullYear();
        
        const date = new Date(year, month - 1, day);
        
        if (isValid(date)) {
          // Extract park name
          const parkMatch = trimmed.replace(dateMatch[0], "").replace(/[-–—():]/g, "").trim();
          
          events.push({
            date,
            park: parkMatch || "Parque",
            clientName: contract.nome_completo,
          });
        }
      }
    });
  });
  
  return events;
}

export function GuideCalendar({ contracts, guideName }: GuideCalendarProps) {
  const scheduledEvents = useMemo(() => parseScheduledDates(contracts), [contracts]);
  
  const scheduledDates = useMemo(() => {
    return scheduledEvents.map((e) => e.date);
  }, [scheduledEvents]);
  
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduledEvent[]>();
    scheduledEvents.forEach((event) => {
      const key = format(event.date, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });
    return map;
  }, [scheduledEvents]);
  
  // Get upcoming events (next 30 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return scheduledEvents
      .filter((e) => e.date >= now && e.date <= thirtyDaysFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [scheduledEvents]);

  return (
    <div className="space-y-6">
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
                      <p className="font-medium truncate">{event.clientName}</p>
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
