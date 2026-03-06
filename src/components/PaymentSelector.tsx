import { useMemo } from "react";
import { CreditCard, Banknote, Check, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getCashPrice,
  calculateInstallmentOptions, 
  formatPriceBRL,
  getUSDPrice,
  CASH_PRICES_BRL,
  MAX_INCLUDED_PEOPLE,
  EXTRA_PERSON_PRICE_USD,
  type InstallmentOption 
} from "@/lib/pricing";

export type PaymentType = 'vista' | 'parcelado' | 'dolar';

interface PaymentSelectorProps {
  days: number;
  exchangeRate: number;
  numberOfPeople: number;
  paymentType: PaymentType;
  selectedInstallment: number;
  onPaymentTypeChange: (type: PaymentType) => void;
  onInstallmentSelect: (installments: number, totalValue: number) => void;
}

export function PaymentSelector({ 
  days, 
  exchangeRate, 
  numberOfPeople,
  paymentType,
  selectedInstallment,
  onPaymentTypeChange,
  onInstallmentSelect
}: PaymentSelectorProps) {
  const extraPeopleCount = useMemo(
    () => Math.max(0, (numberOfPeople || 1) - MAX_INCLUDED_PEOPLE),
    [numberOfPeople]
  );
  const extraPeopleChargeUSD = useMemo(
    () => (days > 0 ? extraPeopleCount * days * EXTRA_PERSON_PRICE_USD : 0),
    [days, extraPeopleCount]
  );
  const extraPeopleChargeBRL = useMemo(
    () => extraPeopleChargeUSD * exchangeRate,
    [extraPeopleChargeUSD, exchangeRate]
  );

  // IMPORTANT: to avoid relying on pricing.ts signature differences, we compute extras here
  const baseUsdPrice = useMemo(() => getUSDPrice(days), [days]);
  const usdPrice = useMemo(() => baseUsdPrice + extraPeopleChargeUSD, [baseUsdPrice, extraPeopleChargeUSD]);

  const baseCashPrice = useMemo(() => getCashPrice(days, exchangeRate), [days, exchangeRate]);
  const cashPrice = useMemo(() => baseCashPrice + extraPeopleChargeBRL, [baseCashPrice, extraPeopleChargeBRL]);

  const installmentOptions = useMemo(() => {
    const baseOptions = calculateInstallmentOptions(days, exchangeRate);
    if (extraPeopleChargeBRL <= 0) return baseOptions;

    return baseOptions.map((opt) => {
      // Extra people should also be subject to the same card fee/interest rate
      const adjustedTotal = opt.totalValue + extraPeopleChargeBRL * (1 + opt.rate);
      return {
        ...opt,
        totalValue: adjustedTotal,
        installmentValue: adjustedTotal / opt.installments,
      };
    });
  }, [days, exchangeRate, extraPeopleChargeBRL]);

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
      {/* Extra People Info */}
      {extraPeopleCount > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-sm text-foreground">
            +{extraPeopleCount} pessoa{extraPeopleCount > 1 ? "s" : ""} extra = +$ {extraPeopleChargeUSD.toFixed(2)} USD ({extraPeopleCount} × {days} dia{days > 1 ? "s" : ""} × $ {EXTRA_PERSON_PRICE_USD})
          </p>
        </div>
      )}
      
      {/* Summary Header */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50 border text-sm">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Valor em USD</p>
          <p className="text-base font-bold text-foreground">$ {usdPrice.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Câmbio Base</p>
          <p className="text-base font-bold text-foreground">R$ {exchangeRate.toFixed(2)}</p>
        </div>
      </div>

      {/* Payment Type Selection */}
      <div className="grid grid-cols-3 gap-3">
        {/* À Vista Option */}
        <div
          onClick={() => {
            onPaymentTypeChange('vista');
            onInstallmentSelect(0, cashPrice);
          }}
          className={cn(
            "rounded-xl border-2 p-4 cursor-pointer transition-all",
            paymentType === 'vista'
              ? "border-green-500 bg-green-500/10"
              : "border-border hover:border-green-500/50"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            {paymentType === 'vista' && <Check className="h-4 w-4 text-green-600" />}
            <Wallet className={cn("h-5 w-5", paymentType === 'vista' ? "text-green-600" : "text-muted-foreground")} />
            <span className={cn("font-semibold", paymentType === 'vista' && "text-green-700")}>
              À Vista
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Pix / Boleto / Transferência</p>
            <p className={cn("text-2xl font-bold", paymentType === 'vista' ? "text-green-700" : "text-foreground")}>
              R$ {formatPriceBRL(cashPrice)}
            </p>
          </div>
          
          {/* Cash price table */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2 text-center">Tabela à Vista</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(CASH_PRICES_BRL).slice(0, 4).map(([d, price]) => (
                <div 
                  key={d} 
                  className={cn(
                    "flex justify-between px-2 py-1 rounded",
                    Number(d) === days && "bg-green-100 dark:bg-green-900/30"
                  )}
                >
                  <span>{d} dia{Number(d) > 1 ? 's' : ''}</span>
                    <span className="font-medium">
                      R$ {formatPriceBRL(
                        (price * (exchangeRate / 4.99)) +
                          (extraPeopleCount > 0
                            ? extraPeopleCount * Number(d) * EXTRA_PERSON_PRICE_USD * exchangeRate
                            : 0)
                      )}
                    </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs mt-1">
              {Object.entries(CASH_PRICES_BRL).slice(4).map(([d, price]) => (
                <div 
                  key={d} 
                  className={cn(
                    "flex justify-between px-2 py-1 rounded",
                    Number(d) === days && "bg-green-100 dark:bg-green-900/30"
                  )}
                >
                  <span>{d} dias</span>
                    <span className="font-medium">
                      R$ {formatPriceBRL(
                        (price * (exchangeRate / 4.99)) +
                          (extraPeopleCount > 0
                            ? extraPeopleCount * Number(d) * EXTRA_PERSON_PRICE_USD * exchangeRate
                            : 0)
                      )}
                    </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Parcelado Option */}
        <div
          onClick={() => {
            onPaymentTypeChange('parcelado');
            if (installmentOptions.length > 0) {
              const option = installmentOptions.find(o => o.installments === selectedInstallment) || installmentOptions[0];
              onInstallmentSelect(option.installments, option.totalValue);
            }
          }}
          className={cn(
            "rounded-xl border-2 p-4 cursor-pointer transition-all",
            paymentType === 'parcelado'
              ? "border-blue-500 bg-blue-500/10"
              : "border-border hover:border-blue-500/50"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            {paymentType === 'parcelado' && <Check className="h-4 w-4 text-blue-600" />}
            <CreditCard className={cn("h-5 w-5", paymentType === 'parcelado' ? "text-blue-600" : "text-muted-foreground")} />
            <span className={cn("font-semibold", paymentType === 'parcelado' && "text-blue-700")}>
              Parcelado
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Cartão de Crédito</p>
            <p className={cn("text-2xl font-bold", paymentType === 'parcelado' ? "text-blue-700" : "text-foreground")}>
              até 12x
            </p>
          </div>
          
          {/* Installment options */}
          {paymentType === 'parcelado' && (
            <div className="mt-3 pt-3 border-t border-border/50 max-h-[180px] overflow-y-auto">
              <div className="space-y-1">
                {installmentOptions.map((option) => (
                  <div
                    key={option.installments}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInstallmentSelect(option.installments, option.totalValue);
                    }}
                    className={cn(
                      "flex justify-between items-center px-2 py-1.5 rounded text-xs cursor-pointer transition-colors",
                      selectedInstallment === option.installments
                        ? "bg-blue-100 dark:bg-blue-900/30 font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    <span>{option.label}</span>
                    <div className="text-right">
                      <span className="font-medium">R$ {formatPriceBRL(option.installmentValue)}</span>
                      <span className="text-muted-foreground ml-1">(R$ {formatPriceBRL(option.totalValue)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {paymentType !== 'parcelado' && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Clique para ver as opções de parcelamento
              </p>
            </div>
          )}
        </div>

        {/* Dólar Option */}
        <div
          onClick={() => {
            onPaymentTypeChange('dolar');
            onInstallmentSelect(0, usdPrice);
          }}
          className={cn(
            "rounded-xl border-2 p-4 cursor-pointer transition-all",
            paymentType === 'dolar'
              ? "border-amber-500 bg-amber-500/10"
              : "border-border hover:border-amber-500/50"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            {paymentType === 'dolar' && <Check className="h-4 w-4 text-amber-600" />}
            <Banknote className={cn("h-5 w-5", paymentType === 'dolar' ? "text-amber-600" : "text-muted-foreground")} />
            <span className={cn("font-semibold text-sm", paymentType === 'dolar' && "text-amber-700")}>
              Dólar
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Transferência via Wise</p>
            <p className={cn("text-2xl font-bold", paymentType === 'dolar' ? "text-amber-700" : "text-foreground")}>
              $ {usdPrice.toFixed(2)}
            </p>
          </div>
          
          {paymentType === 'dolar' && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Pagamento direto em USD via Wise
              </p>
            </div>
          )}
          
          {paymentType !== 'dolar' && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Clique para pagar em dólar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
