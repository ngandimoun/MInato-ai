import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency
 * @param amount - Amount in cents (smallest currency unit)
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string | null | undefined): string {
  // Default to USD if currency is not provided or is invalid
  const safeCurrency = currency && currency.trim() ? currency.trim() : 'USD';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${(amount / 100).toFixed(2)} ${safeCurrency.toUpperCase()}`;
  }
}
