export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return '0';
  }

  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  return formatted.replace(/[\u00A0\u202F]/g, ' ');
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  return formatted.replace(/[\u00A0\u202F]/g, ' ');
}

export function formatCurrencyForPDF(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return '0';
  }

  const str = num.toFixed(2);
  const parts = str.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalPart = parts[1];

  if (decimalPart === '00') {
    return integerPart;
  }

  return `${integerPart},${decimalPart}`;
}

export function formatNumberForPDF(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  const str = num.toFixed(2);
  const parts = str.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalPart = parts[1];

  if (decimalPart === '00') {
    return integerPart;
  }

  return `${integerPart},${decimalPart}`;
}
