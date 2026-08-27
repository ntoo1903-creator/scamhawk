import type { EntityType } from './types';

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const BTC_ADDRESS = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const DOMAIN = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i;

export interface ClassifiedEntity {
  valid: boolean;
  type: EntityType;
  /** 归一化后的值：地址转小写，网址提取 hostname */
  value: string;
}

/**
 * 识别输入是钱包地址还是网址，并返回归一化后的值。
 * 支持 Ethereum / Bitcoin / Solana / Tron 地址。
 */
export function classifyEntity(input: string): ClassifiedEntity {
  const raw = (input ?? '').trim();

  if (!raw) {
    return { valid: false, type: 'ADDRESS', value: raw };
  }

  // 网址（含域名）
  if (DOMAIN.test(raw)) {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const hostname = new URL(withProto).hostname.toLowerCase();
    return { valid: true, type: 'WEBSITE', value: hostname };
  }

  // 钱包地址
  if (
    ETH_ADDRESS.test(raw) ||
    BTC_ADDRESS.test(raw) ||
    SOL_ADDRESS.test(raw) ||
    TRON_ADDRESS.test(raw)
  ) {
    return { valid: true, type: 'ADDRESS', value: raw.toLowerCase() };
  }

  return { valid: false, type: 'ADDRESS', value: raw };
}
