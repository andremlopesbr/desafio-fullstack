import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format currency in Brazilian Real', () => {
      expect(formatCurrency(100)).toContain('R$');
      expect(formatCurrency(100)).toContain('100,00');
      expect(formatCurrency(99.99)).toContain('99,99');
      expect(formatCurrency(1000.5)).toContain('1.000,50');
    });
  });

  describe('formatDate', () => {
    it('should format date in Brazilian format', () => {
      const date = new Date('2023-10-15');
      expect(formatDate(date)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(formatDate('2023-10-15')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time in Brazilian format', () => {
      const date = new Date('2023-10-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('15/10/2023');
      expect(result).toContain('14:30');
    });
  });
});