import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FREE_TIER_LIMITS } from '../rate-limit';

// Mock prisma using vi.hoisted to avoid hoisting issues
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  checkRecord: {
    count: vi.fn(),
  },
  watchItem: {
    count: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
const { canCheck, canAddWatch } = await import('../rate-limit');

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FREE_TIER_LIMITS', () => {
    it('should have correct limits', () => {
      expect(FREE_TIER_LIMITS.dailyChecks).toBe(10);
      expect(FREE_TIER_LIMITS.maxWatchItems).toBe(5);
    });
  });

  describe('canCheck', () => {
    it('should allow check when user has not exceeded limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.checkRecord.count.mockResolvedValueOnce(5);

      const result = await canCheck('clerk-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.used).toBe(5);
    });

    it('should deny check when user has exceeded limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.checkRecord.count.mockResolvedValueOnce(10);

      const result = await canCheck('clerk-123');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.used).toBe(10);
    });

    it('should allow check when user is new (0 checks)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.checkRecord.count.mockResolvedValueOnce(0);

      const result = await canCheck('clerk-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.used).toBe(0);
    });

    it('should return allowed for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await canCheck('non-existent');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.used).toBe(0);
    });
  });

  describe('canAddWatch', () => {
    it('should allow adding watch when under limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.watchItem.count.mockResolvedValueOnce(3);

      const result = await canAddWatch('clerk-123');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(5);
    });

    it('should deny adding watch when at limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.watchItem.count.mockResolvedValueOnce(5);

      const result = await canAddWatch('clerk-123');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should allow adding watch for new user (0 items)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.watchItem.count.mockResolvedValueOnce(0);

      const result = await canAddWatch('clerk-123');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(5);
    });

    it('should return allowed for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await canAddWatch('non-existent');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(5);
    });
  });
});
