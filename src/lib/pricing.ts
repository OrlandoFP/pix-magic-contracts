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

// Valores à vista em BRL (tabela fixa fornecida)
// Calculados com câmbio de R$4,99
export const CASH_PRICES_BRL: Record<number, number> = {
  1: 748.50,
  2: 1347.30,
  3: 1746.50,
  4: 1996.00,
  5: 2245.50,
  6: 2495.00,
  7: 2744.50,
};

// Câmbio base usado para calcular a tabela à vista
export const BASE_EXCHANGE_RATE = 4.99;

// Câmbio padrão atual (pode ser atualizado pelo guia)
export const DEFAULT_EXCHANGE_RATE = 4.99;

// Taxas de parcelamento (baseado na imagem de referência)
// 1x no cartão: +5.07%
// 2x em diante: incrementa ~0.88% por parcela
export const INSTALLMENT_RATES: Record<number, number> = {
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
 * Obtém o valor à vista em BRL para uma quantidade de dias
 * Usa a tabela fixa, mas ajusta se o câmbio mudou
 */
export function getCashPrice(days: number, exchangeRate: number = DEFAULT_EXCHANGE_RATE): number {
  if (days < 1) return 0;
  
  // Se o câmbio for diferente do base, recalcular proporcionalmente
  const ratio = exchangeRate / BASE_EXCHANGE_RATE;
  
  if (days > 7) {
    // Para mais de 7 dias, calcular proporcionalmente
    const base7Price = CASH_PRICES_BRL[7];
    const pricePerExtraDay = (base7Price / 7) * 0.8; // ~80% do valor diário médio
    const extraDays = days - 7;
    return (base7Price + (extraDays * pricePerExtraDay)) * ratio;
  }
  
  const basePrice = CASH_PRICES_BRL[days];
  if (!basePrice) return 0;
  
  return basePrice * ratio;
}

/**
 * Calcula o valor em BRL baseado na quantidade de dias e câmbio (valor base sem taxas - para parcelamento)
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
 * Calcula as opções de parcelamento (1x a 12x no cartão)
 */
export function calculateInstallmentOptions(days: number, exchangeRate: number = DEFAULT_EXCHANGE_RATE): InstallmentOption[] {
  const options: InstallmentOption[] = [];
  const basePrice = calculateBasePrice(days, exchangeRate);
  
  if (basePrice <= 0) return options;
  
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
  return getCashPrice(days, exchangeRate);
}
