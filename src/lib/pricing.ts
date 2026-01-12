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

/**
 * Calcula o valor em BRL baseado na quantidade de dias e câmbio
 */
export function calculatePrice(days: number, exchangeRate: number = DEFAULT_EXCHANGE_RATE): number {
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
