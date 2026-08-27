export type RiskLevel = 'SAFE' | 'SUSPICIOUS' | 'SCAM' | 'UNKNOWN';
export type EntityType = 'ADDRESS' | 'WEBSITE';

/** 一次风险查询的归一化结果 */
export interface LookupResult {
  value: string;
  type: EntityType;
  riskLevel: RiskLevel;
  riskScore: number | null; // 0-100，越高越危险
  reportCount: number;
  categories: string[];
  checkedAt: string; // ISO 时间
  /** true 表示来自演示模式（未配置 Chainabuse API Key）的模拟数据 */
  isMock: boolean;
  /** Chainabuse 原始响应，便于调试与扩展 */
  raw?: unknown;
}
