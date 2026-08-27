import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupEntity } from '../chainabuse';

describe('chainabuse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 确保没有 API Key，使用 mock 模式
    delete process.env.CHAINABUSE_API_KEY;
  });

  describe('lookupEntity (mock mode)', () => {
    it('should return mock result when API key is not configured', async () => {
      const result = await lookupEntity('0x8ba1f109551bD432803012645Ac136ddd64DBA72', 'ADDRESS');

      expect(result).toBeDefined();
      expect(result.isMock).toBe(true);
      expect(result.type).toBe('ADDRESS');
      expect(result.value).toBe('0x8ba1f109551bD432803012645Ac136ddd64DBA72');
      expect(result.checkedAt).toBeDefined();
      expect(['SAFE', 'SUSPICIOUS', 'SCAM']).toContain(result.riskLevel);
    });

    it('should return consistent results for same input', async () => {
      const input = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
      const result1 = await lookupEntity(input, 'ADDRESS');
      const result2 = await lookupEntity(input, 'ADDRESS');

      expect(result1.riskLevel).toBe(result2.riskLevel);
      expect(result1.reportCount).toBe(result2.reportCount);
    });

    it('should handle website type', async () => {
      const result = await lookupEntity('example.com', 'WEBSITE');

      expect(result).toBeDefined();
      expect(result.isMock).toBe(true);
      expect(result.type).toBe('WEBSITE');
      expect(result.value).toBe('example.com');
    });

    it('should return categories for SCAM level', async () => {
      // 找一个会产生 SCAM 结果的输入
      let scamInput = '';
      for (let i = 0; i < 100; i++) {
        const testInput = `test-input-${i}`;
        const result = await lookupEntity(testInput, 'ADDRESS');
        if (result.riskLevel === 'SCAM') {
          scamInput = testInput;
          break;
        }
      }

      if (scamInput) {
        const result = await lookupEntity(scamInput, 'ADDRESS');
        expect(result.categories).toBeInstanceOf(Array);
        expect(result.categories.length).toBeGreaterThan(0);
      }
    });

    it('should return different risk levels for different inputs', async () => {
      const results = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const result = await lookupEntity(`input-${i}`, 'ADDRESS');
        results.add(result.riskLevel);
      }
      // 应该有多种不同的风险等级
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
