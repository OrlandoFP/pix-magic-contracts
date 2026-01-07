import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, CalendarClock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const PARKS = [
  { id: "magic-kingdom", name: "Magic Kingdom" },
  { id: "epcot", name: "EPCOT" },
  { id: "hollywood-studios", name: "Hollywood Studios" },
  { id: "animal-kingdom", name: "Animal Kingdom" },
  { id: "epic-universe", name: "EPIC Universe" },
  { id: "universal-studios", name: "Universal Studios" },
  { id: "islands-adventure", name: "Islands of Adventure" },
] as const;

export type ParkSelection = {
  parkId: string;
  parkName: string;
  date: Date;
};

interface ParkDateSelectorProps {
  value: ParkSelection[];
  onChange: (selections: ParkSelection[]) => void;
  datesLater?: boolean;
  onDatesLaterChange?: (value: boolean) => void;
}

export function ParkDateSelector({ value, onChange, datesLater = false, onDatesLaterChange }: ParkDateSelectorProps) {
  const [selectedParks, setSelectedParks] = useState<Record<string, Date | null>>(() => {
    const initial: Record<string, Date | null> = {};
    value.forEach((selection) => {
      initial[selection.parkId] = selection.date;
    });
    return initial;
  });

  // Sync with external value changes (e.g., from AI parsing)
  useEffect(() => {
    const newState: Record<string, Date | null> = {};
    value.forEach((selection) => {
      newState[selection.parkId] = selection.date;
    });
    setSelectedParks(newState);
  }, [value.map(v => `${v.parkId}-${v.date?.getTime()}`).join(',')]);

  const handleParkToggle = (parkId: string, parkName: string, checked: boolean) => {
    const updated = { ...selectedParks };
    if (checked) {
      updated[parkId] = null;
    } else {
      delete updated[parkId];
    }
    setSelectedParks(updated);
    updateValue(updated);
  };

  const handleDateChange = (parkId: string, parkName: string, date: Date | undefined) => {
    if (!date) return;
    const updated = { ...selectedParks, [parkId]: date };
    setSelectedParks(updated);
    updateValue(updated);
  };

  const updateValue = (parks: Record<string, Date | null>) => {
    const selections: ParkSelection[] = [];
    PARKS.forEach((park) => {
      if (parks[park.id] && parks[park.id] !== null) {
        selections.push({
          parkId: park.id,
          parkName: park.name,
          date: parks[park.id]!,
        });
      }
    });
    onChange(selections);
  };

  const isParkSelected = (parkId: string) => parkId in selectedParks;
  const hasAnySelection = Object.keys(selectedParks).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-primary" />
        <Label className="text-base font-semibold">Parques e Datas *</Label>
      </div>

      <div className="space-y-3">
        {PARKS.map((park) => (
          <div
            key={park.id}
            className={cn(
              "rounded-xl border bg-card p-4 transition-all",
              isParkSelected(park.id) 
                ? "border-primary/30 bg-primary/5" 
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={park.id}
                  checked={isParkSelected(park.id)}
                  onCheckedChange={(checked) =>
                    handleParkToggle(park.id, park.name, checked === true)
                  }
                  className="h-5 w-5"
                />
                <label
                  htmlFor={park.id}
                  className="font-medium cursor-pointer"
                >
                  {park.name}
                </label>
              </div>

              {isParkSelected(park.id) && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal min-w-[160px]",
                        !selectedParks[park.id] && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedParks[park.id] ? (
                        format(selectedParks[park.id]!, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecionar data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedParks[park.id] || undefined}
                      onSelect={(date) => handleDateChange(park.id, park.name, date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        ))}
      </div>

      {!hasAnySelection && !datesLater && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-amber-700 dark:text-amber-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Selecione pelo menos um parque para continuar</span>
        </div>
      )}

      {/* Option to define dates later */}
      {onDatesLaterChange && (
        <div 
          className={cn(
            "rounded-xl border p-4 cursor-pointer transition-all",
            datesLater 
              ? "border-blue-500/50 bg-blue-500/10" 
              : "border-border hover:border-muted-foreground/30"
          )}
          onClick={() => onDatesLaterChange(!datesLater)}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              id="dates-later"
              checked={datesLater}
              onCheckedChange={(checked) => onDatesLaterChange(checked === true)}
              className="h-5 w-5"
            />
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              <div>
                <label htmlFor="dates-later" className="font-medium cursor-pointer">
                  Definir datas depois
                </label>
                <p className="text-sm text-muted-foreground">
                  Gere o contrato agora e defina os parques e datas posteriormente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function formatParkSelections(selections: ParkSelection[], datesLater: boolean = false): string {
  if (datesLater) {
    return "Datas a definir";
  }
  return selections
    .map((s) => `${format(s.date, "dd/MM", { locale: ptBR })} - ${s.parkName}`)
    .join("\n");
}
