import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPaddleConfigured,
  isPaddleCheckoutConfigured,
  isActiveSubscriptionStatus,
} from '../paddle';

describe('paddle', () => {
  describe('isPaddleConfigured', () => {
    it('should return false when env vars are not set', () => {
      delete process.env.PADDLE_API_KEY;
      delete process.env.PADDLE_WEBHOOK_SECRET;
      expect(isPaddleConfigured()).toBe(false);
    });

    it('should return true when both env vars are set', () => {
      process.env.PADDLE_API_KEY = 'test-key';
      process.env.PADDLE_WEBHOOK_SECRET = 'test-secret';
      expect(isPaddleConfigured()).toBe(true);
      delete process.env.PADDLE_API_KEY;
      delete process.env.PADDLE_WEBHOOK_SECRET;
    });

    it('should return false when only API key is set', () => {
      process.env.PADDLE_API_KEY = 'test-key';
      delete process.env.PADDLE_WEBHOOK_SECRET;
      expect(isPaddleConfigured()).toBe(false);
      delete process.env.PADDLE_API_KEY;
    });

    it('should return false when only webhook secret is set', () => {
      delete process.env.PADDLE_API_KEY;
      process.env.PADDLE_WEBHOOK_SECRET = 'test-secret';
      expect(isPaddleConfigured()).toBe(false);
      delete process.env.PADDLE_WEBHOOK_SECRET;
    });
  });

  describe('isPaddleCheckoutConfigured', () => {
    it('should return false when env vars are not set', () => {
      delete process.env.PADDLE_PRICE_ID_PRO_MONTHLY;
      delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      expect(isPaddleCheckoutConfigured()).toBe(false);
    });

    it('should return true when both env vars are set', () => {
      process.env.PADDLE_PRICE_ID_PRO_MONTHLY = 'price-123';
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'client-token';
      expect(isPaddleCheckoutConfigured()).toBe(true);
      delete process.env.PADDLE_PRICE_ID_PRO_MONTHLY;
      delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    });
  });

  describe('isActiveSubscriptionStatus', () => {
    it('should return true for active status', () => {
      expect(isActiveSubscriptionStatus('active')).toBe(true);
    });

    it('should return true for trialing status', () => {
      expect(isActiveSubscriptionStatus('trialing')).toBe(true);
    });

    it('should return false for canceled status', () => {
      expect(isActiveSubscriptionStatus('canceled')).toBe(false);
    });

    it('should return false for paused status', () => {
      expect(isActiveSubscriptionStatus('paused')).toBe(false);
    });

    it('should return false for past_due status', () => {
      expect(isActiveSubscriptionStatus('past_due')).toBe(false);
    });

    it('should return false for unknown status', () => {
      expect(isActiveSubscriptionStatus('unknown')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isActiveSubscriptionStatus('')).toBe(false);
    });
  });
});
