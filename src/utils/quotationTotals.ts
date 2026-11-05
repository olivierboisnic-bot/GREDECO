export type GlobalDiscountType = 'percent' | 'amount';

export interface GlobalDiscount {
  type: GlobalDiscountType;
  percent: number;
  amount: number;
}

export interface TotalableItem {
  unit_price: number;
  quantity: number;
  vat_percent: number | null;
}

export interface QuotationTotals {
  subtotalHT: number;
  discountAmount: number;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
}

export const computeQuotationTotals = (
  items: TotalableItem[],
  discount: GlobalDiscount
): QuotationTotals => {
  const subtotalHT = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const rawDiscount = discount.type === 'amount'
    ? Math.max(0, discount.amount || 0)
    : subtotalHT * Math.max(0, discount.percent || 0) / 100;
  const discountAmount = Math.min(rawDiscount, subtotalHT);

  const ratio = subtotalHT > 0 ? (subtotalHT - discountAmount) / subtotalHT : 1;

  let totalVAT = 0;
  let totalHT = 0;
  for (const item of items) {
    const itemHT = item.unit_price * item.quantity * ratio;
    totalHT += itemHT;
    totalVAT += itemHT * (item.vat_percent ?? 20) / 100;
  }

  return {
    subtotalHT,
    discountAmount,
    totalHT,
    totalVAT,
    totalTTC: totalHT + totalVAT,
  };
};
