/// <reference types="jest" />
import { formatCurrency, getSubscriptionPrice, calculateRemainingDays } from '../math';

describe('math utility functions', () => {
  describe('formatCurrency', () => {
    it('formats numbers with Vietnamese locale', () => {
      expect(formatCurrency(1000)).toBe('1.000');
      expect(formatCurrency(1250000)).toBe('1.250.000');
      expect(formatCurrency(0)).toBe('0');
    });
  });

  describe('getSubscriptionPrice', () => {
    it('returns original monthly price for monthly cycle', () => {
      expect(getSubscriptionPrice(79000, 'monthly')).toBe(79000);
    });

    it('returns 10x monthly price for yearly cycle (2 months free discount)', () => {
      expect(getSubscriptionPrice(79000, 'yearly')).toBe(790000);
    });
  });

  describe('calculateRemainingDays', () => {
    it('calculates remaining days correctly', () => {
      const expiresAt = '2026-06-20T12:00:00.000Z';
      const current = '2026-06-13T12:00:00.000Z';
      expect(calculateRemainingDays(expiresAt, current)).toBe(7);
    });

    it('returns 0 if subscription has expired', () => {
      const expiresAt = '2026-06-10T12:00:00.000Z';
      const current = '2026-06-13T12:00:00.000Z';
      expect(calculateRemainingDays(expiresAt, current)).toBe(0);
    });
  });
});
