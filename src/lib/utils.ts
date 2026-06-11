import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useStoreConfig } from "./store-config";

/** @deprecated Use useStoreConfig().baseCurrency for dynamic symbol */
export const CURRENCY_SYMBOL = 'UGX';

export function getExchangeRate(currencyCode: string): number {
  const config = useStoreConfig.getState();
  // If the target currency matches the store's base currency, the rate is always 1.
  if (currencyCode === (config.baseCurrency || 'UGX')) return 1;
  
  const rateItem = (config.exchangeRates || []).find(r => r.currency === currencyCode);
  return rateItem ? rateItem.rate : 1;
}

/**
 * Converts an amount from a display currency (e.g. INR) TO the system's storage base currency.
 * If the fromCurrency matches the system's base currency, no conversion happens.
 */
export function convertToBase(amount: number, fromCurrency: string): number {
  const config = useStoreConfig.getState();
  const systemBase = config.baseCurrency || 'UGX';
  
  if (fromCurrency === systemBase) return amount;
  
  const rate = getExchangeRate(fromCurrency);
  // Formula: Amount * Rate (where Rate is Foreign -> Base)
  return Math.round(amount * (rate || 1));
}

/**
 * Converts an amount from the system's storage base currency TO a display currency.
 */
export function convertFromBase(amount: number, toCurrency: string): number {
  const config = useStoreConfig.getState();
  const systemBase = config.baseCurrency || 'UGX';

  if (toCurrency === systemBase) return amount;
  
  const rate = getExchangeRate(toCurrency);
  // Formula: Amount / Rate (where Rate is Foreign -> Base)
  return rate > 0 ? amount / rate : amount;
}

export function formatCurrency(amount: number, targetCurrency?: string): string {
  const config = useStoreConfig.getState();
  const displayCurrency = targetCurrency || config.baseCurrency || 'UGX';
  
  // Important: We assume 'amount' was already saved in the system's base currency.
  // We only convert if the target display currency is DIFFERENT from the system base.
  const displayAmount = convertFromBase(amount, displayCurrency);

  // Saas-Ready Rounding: UGX = 0 decimals, Others = 2 (Clamp between 0-20 to prevent Intl errors)
  const rawDecimals = config.numberOfDecimals;
  let decimals = displayCurrency === 'UGX' ? 0 : (rawDecimals !== undefined && rawDecimals !== null ? Number(rawDecimals) : 2);
  
  if (isNaN(decimals) || decimals < 0) decimals = 2;
  if (decimals > 20) decimals = 20;

  const formattedValue = displayAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbol = config.currencySymbol || displayCurrency;
  
  if (config.currencySymbolPosition === 'after') {
    return `${formattedValue} ${symbol}`;
  }
  
  return `${symbol} ${formattedValue}`;
}


export const generateId = (prefix: string = 'id') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateInvoice = (prefix: string = 'INV') => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

export function toWords(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  if (amount === 0) return 'Zero';

  function convertChunk(num: number): string {
    let chunkWords = '';
    if (num >= 100) {
      chunkWords += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      chunkWords += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      chunkWords += units[num] + ' ';
    }
    return chunkWords;
  }

  let words = '';
  let scaleIndex = 0;
  let remaining = Math.floor(amount);

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      words = convertChunk(chunk) + scales[scaleIndex] + ' ' + words;
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  return words.trim() + ' Uganda Shillings Only';
}
