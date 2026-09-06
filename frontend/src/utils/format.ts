export function formatCurrency(value: number | undefined | null, currency: string = 'INR', maximumFractionDigits: number = 2, minimumFractionDigits: number = 2): string {
  if (value === undefined || value === null) return 'N/A';
  
  // Custom symbol map for common currencies if Intl doesn't display exactly as desired
  const symbolMap: Record<string, string> = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
  };

  const symbol = symbolMap[currency?.toUpperCase()] || `${currency} `;
  
  // Format the number nicely based on currency/locale
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  
  return `${symbol}${value.toLocaleString(locale, { 
    minimumFractionDigits, 
    maximumFractionDigits 
  })}`;
}
