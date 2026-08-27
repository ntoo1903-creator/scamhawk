import { describe, it, expect } from 'vitest';
import { classifyEntity } from '../validation';

describe('classifyEntity', () => {
  describe('Ethereum addresses', () => {
    it('should classify valid ETH address', () => {
      const result = classifyEntity('0x8ba1f109551bD432803012645Ac136ddd64DBA72');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('ADDRESS');
      expect(result.value).toBe('0x8ba1f109551bd432803012645ac136ddd64dba72');
    });

    it('should normalize ETH address to lowercase', () => {
      const result = classifyEntity('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
      expect(result.value).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('should reject invalid ETH address (too short)', () => {
      const result = classifyEntity('0x8ba1f109551bD432803012645Ac136ddd64DBA7');
      expect(result.valid).toBe(false);
    });

    it('should reject ETH address with invalid characters', () => {
      const result = classifyEntity('0x8ba1f109551bD432803012645Ac136ddd64DBA7Z');
      expect(result.valid).toBe(false);
    });
  });

  describe('Bitcoin addresses', () => {
    it('should classify valid Legacy BTC address (1...)', () => {
      const result = classifyEntity('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('ADDRESS');
    });

    it('should classify valid Bech32 BTC address (bc1...)', () => {
      const result = classifyEntity('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('ADDRESS');
    });

    it('should reject BTC address with invalid characters', () => {
      const result = classifyEntity('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa0OIl');
      expect(result.valid).toBe(false);
    });
  });

  describe('Solana addresses', () => {
    it('should classify valid SOL address', () => {
      const result = classifyEntity('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('ADDRESS');
    });

    it('should reject invalid SOL address (invalid characters)', () => {
      const result = classifyEntity('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYt0OIl');
      expect(result.valid).toBe(false);
    });
  });

  describe('Tron addresses', () => {
    it('should classify valid TRON address', () => {
      const result = classifyEntity('TNaRAmV1mTpAzXdJ2nJ3TPz1cZMvS1bJYB');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('ADDRESS');
    });

    it('should reject TRON address with wrong length', () => {
      const result = classifyEntity('TNaRAmV1mTpAzXdJ2nJ3TPz1cZMvS1bJYBtoolong');
      expect(result.valid).toBe(false);
    });
  });

  describe('Websites', () => {
    it('should classify simple domain', () => {
      const result = classifyEntity('example.com');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('WEBSITE');
      expect(result.value).toBe('example.com');
    });

    it('should classify domain with subdomain', () => {
      const result = classifyEntity('sub.example.com');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('WEBSITE');
      expect(result.value).toBe('sub.example.com');
    });

    it('should classify URL with http protocol', () => {
      const result = classifyEntity('http://example.com');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('WEBSITE');
      expect(result.value).toBe('example.com');
    });

    it('should classify URL with https protocol', () => {
      const result = classifyEntity('https://example.com/path?query=1');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('WEBSITE');
      expect(result.value).toBe('example.com');
    });

    it('should classify URL with port', () => {
      const result = classifyEntity('example.com:3000');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('WEBSITE');
      expect(result.value).toBe('example.com');
    });

    it('should normalize domain to lowercase', () => {
      const result = classifyEntity('EXAMPLE.COM');
      expect(result.value).toBe('example.com');
    });
  });

  describe('Edge cases', () => {
    it('should reject empty string', () => {
      const result = classifyEntity('');
      expect(result.valid).toBe(false);
    });

    it('should reject whitespace only', () => {
      const result = classifyEntity('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject random text', () => {
      const result = classifyEntity('hello world');
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace from input', () => {
      const result = classifyEntity('  0x8ba1f109551bD432803012645Ac136ddd64DBA72  ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('0x8ba1f109551bd432803012645ac136ddd64dba72');
    });

    it('should handle null/undefined gracefully', () => {
      const result = classifyEntity(null as unknown as string);
      expect(result.valid).toBe(false);
    });
  });
});
