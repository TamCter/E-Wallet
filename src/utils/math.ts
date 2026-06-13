/**
 * Utility helper functions for E-wallet calculations
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function getSubscriptionPrice(pricePerMonth: number, cycle: 'monthly' | 'yearly'): number {
  if (cycle === 'yearly') {
    return pricePerMonth * 10;
  }
  return pricePerMonth;
}

export function calculateRemainingDays(expiresAtStr: string, currentDateStr?: string): number {
  const expiresAt = new Date(expiresAtStr);
  const current = currentDateStr ? new Date(currentDateStr) : new Date();
  const diffTime = expiresAt.getTime() - current.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}
