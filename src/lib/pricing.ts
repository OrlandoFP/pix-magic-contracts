// Tabela de preços em USD por quantidade de dias
export const USD_PRICES: Record<number, number> = {
  1: 150,
  2: 270,
  3: 350,
  4: 400,
  5: 450,
  6: 500,
  7: 550,
};

// Câmbio padrão
export const DEFAULT_EXCHANGE_RATE = 4.99;

// Taxas de parcelamento (baseado na imagem de referência)
// À vista/boleto: +2.04%
// 1x no cartão: +5.07%
// 2x em diante: +5.07% + (parcelas - 1) * 0.88%
export const INSTALLMENT_RATES: Record<number, number> = {
  0: 0.0204,    // À vista / Boleto
  1: 0.0507,    // 1x no cartão
  2: 0.0601,    // 2x
  3: 0.0685,    // 3x
  4: 0.0769,    // 4x
  5: 0.0856,    // 5x
  6: 0.0943,    // 6x
  7: 0.1045,    // 7x
  8: 0.1135,    // 8x
  9: 0.1229,    // 9x
  10: 0.1323,   // 10x
  11: 0.1419,   // 11x
  12: 0.1515,   // 12x
};

export type PaymentMethod = 'vista' | 'cartao';

export interface InstallmentOption {
  installments: number;
  installmentValue: number;
  totalValue: number;
  rate: number;
  label: string;
}

/**
 * Calcula o valor em BRL baseado na quantidade de dias e câmbio (valor base sem taxas)
 */
export function calculateBasePrice(days: number, exchangeRate: number = DEFAULT_EXCHANGE_RATE): number {
  if (days < 1) return 0;
  
  // Se tiver mais de 7 dias, calcular proporcionalmente
  if (days > 7) {
    const basePrice = USD_PRICES[7];
    const extraDays = days - 7;
    const pricePerExtraDay = 50; // USD por dia adicional
    return (basePrice + (extraDays * pricePerExtraDay)) * exchangeRate;
  }
  
  const usdPrice = USD_PRICES[days];
  if (!usdPrice) return 0;
  
  return usdPrice * exchangeRate;
}

/**
 * Calcula o valor à vista (com taxa de boleto/pix)
 */
export function calculateCashPrice(basePrice: number): number {
  const rate = INSTALLMENT_RATES[0];
  return basePrice * (1 + rate);
}

/**
 * Calcula as opções de parcelamento
 */
export function calculateInstallmentOptions(basePrice: number): InstallmentOption[] {
  const options: InstallmentOption[] = [];
  
  // À vista / Boleto
  const cashRate = INSTALLMENT_RATES[0];
  const cashTotal = basePrice * (1 + cashRate);
  options.push({
    installments: 0,
    installmentValue: cashTotal,
    totalValue: cashTotal,
    rate: cashRate,
    label: 'À Vista / Boleto / Pix',
  });
  
  // Parcelamentos de 1x a 12x
  for (let i = 1; i <= 12; i++) {
    const rate = INSTALLMENT_RATES[i];
    const totalValue = basePrice * (1 + rate);
    const installmentValue = totalValue / i;
    
    options.push({
      installments: i,
      installmentValue,
      totalValue,
      rate,
      label: `${i}x no Cartão`,
    });
  }
  
  return options;
}

/**
 * Formata o valor para exibição em BRL (sem o R$)
 */
export function formatPriceBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Obtém o preço em USD para uma quantidade de dias
 */
export function getUSDPrice(days: number): number {
  if (days < 1) return 0;
  if (days > 7) {
    const basePrice = USD_PRICES[7];
    const extraDays = days - 7;
    const pricePerExtraDay = 50;
    return basePrice + (extraDays * pricePerExtraDay);
  }
  return USD_PRICES[days] || 0;
}

// Mantém compatibilidade com código existente
export function calculatePrice(days: number, exchangeRate: number = DEFAULT_EXCHANGE_RATE): number {
  const basePrice = calculateBasePrice(days, exchangeRate);
  return calculateCashPrice(basePrice);
}
