import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format currency in Brazilian Real from reais', () => {
      expect(formatCurrency(1)).toContain('R$'); // 1 real
      expect(formatCurrency(1)).toContain('1,00');
      expect(formatCurrency(1.99)).toContain('1,99');
      expect(formatCurrency(100)).toContain('100,00');
      expect(formatCurrency(87)).toContain('87,00');
      expect(formatCurrency(197)).toContain('197,00');
      expect(formatCurrency(347)).toContain('347,00');
      expect(formatCurrency(497)).toContain('497,00');
      expect(formatCurrency(797)).toContain('797,00');
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