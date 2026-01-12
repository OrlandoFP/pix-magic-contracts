import { useMemo } from "react";
import { CreditCard, Banknote, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  calculateBasePrice, 
  calculateInstallmentOptions, 
  formatPriceBRL,
  getUSDPrice,
  type InstallmentOption 
} from "@/lib/pricing";

interface PaymentOptionsTableProps {
  days: number;
  exchangeRate: number;
  selectedInstallment: number;
  onSelect: (installments: number, totalValue: number) => void;
}

export function PaymentOptionsTable({ 
  days, 
  exchangeRate, 
  selectedInstallment,
  onSelect 
}: PaymentOptionsTableProps) {
  const options = useMemo(() => {
    const basePrice = calculateBasePrice(days, exchangeRate);
    return calculateInstallmentOptions(basePrice);
  }, [days, exchangeRate]);

  const basePrice = useMemo(() => calculateBasePrice(days, exchangeRate), [days, exchangeRate]);
  const usdPrice = useMemo(() => getUSDPrice(days), [days]);

  if (days < 1) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Selecione os parques para ver as opções de pagamento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Valor em USD</p>
          <p className="text-lg font-bold text-foreground">$ {usdPrice.toFixed(2)}</p>
        </div>
        <div className="text-center border-x">
          <p className="text-xs text-muted-foreground mb-1">Câmbio</p>
          <p className="text-lg font-bold text-foreground">R$ {exchangeRate.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Valor Base (BRL)</p>
          <p className="text-lg font-bold text-foreground">R$ {formatPriceBRL(basePrice)}</p>
        </div>
      </div>

      {/* Payment Options */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/70 border-b font-medium text-sm">
          <div>Forma de Pagamento</div>
          <div className="text-right">Valor da Parcela</div>
          <div className="text-right">Valor Total</div>
        </div>
        
        <div className="max-h-[320px] overflow-y-auto">
          {options.map((option) => (
            <PaymentOptionRow
              key={option.installments}
              option={option}
              isSelected={selectedInstallment === option.installments}
              onSelect={() => onSelect(option.installments, option.totalValue)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Clique em uma opção para selecioná-la. O valor será atualizado automaticamente.
      </p>
    </div>
  );
}

interface PaymentOptionRowProps {
  option: InstallmentOption;
  isSelected: boolean;
  onSelect: () => void;
}

function PaymentOptionRow({ option, isSelected, onSelect }: PaymentOptionRowProps) {
  const isCash = option.installments === 0;
  
  return (
    <div
      onClick={onSelect}
      className={cn(
        "grid grid-cols-3 gap-4 p-3 border-b last:border-b-0 cursor-pointer transition-all",
        isSelected 
          ? "bg-primary/10 border-primary/30" 
          : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        {isSelected && <Check className="h-4 w-4 text-primary" />}
        {isCash ? (
          <Banknote className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
        ) : (
          <CreditCard className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
        )}
        <span className={cn("font-medium", isSelected && "text-primary")}>
          {option.label}
        </span>
      </div>
      <div className={cn("text-right", isSelected && "text-primary font-medium")}>
        R$ {formatPriceBRL(option.installmentValue)}
      </div>
      <div className={cn("text-right", isSelected && "text-primary font-medium")}>
        R$ {formatPriceBRL(option.totalValue)}
      </div>
    </div>
  );
}
