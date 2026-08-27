import type { EntityType, LookupResult, RiskLevel } from './types';

const CHAINABUSE_API = 'https://api.chainabuse.com/v0/reports';

/**
 * Chainabuse API Key（可选）。
 * 获取方式：注册/登录 chainabuse.com 后，在账号的 API/开发者页面生成
 * （标准 Key 每月 10 次调用，每次最多 50 条举报）；更高额度联系
 * APIsupport@certik.com。未配置时使用演示模式（模拟数据）。
 */
const API_KEY = process.env.CHAINABUSE_API_KEY?.trim() ?? '';

/** 是否已配置真实 API Key */
export function isChainabuseConfigured(): boolean {
  return Boolean(API_KEY);
}

interface ChainabuseReport {
  id?: string | number;
  address?: string;
  url?: string;
  category?: string;
  description?: string;
  [key: string]: unknown;
}

interface ChainabuseResponse {
  data?: ChainabuseReport[] | Record<string, unknown>[];
  reports?: ChainabuseReport[];
  results?: ChainabuseReport[];
  total?: number;
  page?: number;
  perPage?: number;
  [key: string]: unknown;
}

/** 从 Chainabuse 响应中提取举报列表（兼容数组 / {data|reports|results} 几种形态） */
function extractReports(body: unknown): ChainabuseReport[] {
  if (Array.isArray(body)) return body as ChainabuseReport[];
  if (body && typeof body === 'object') {
    const obj = body as ChainabuseResponse;
    const list = obj.data ?? obj.reports ?? obj.results;
    if (Array.isArray(list)) return list as ChainabuseReport[];
  }
  return [];
}

/**
 * 举报数量：真实 API 中每条记录对应一次独立举报，
 * 优先取响应 total，否则以返回的举报条数为准。
 */
function countReports(body: unknown, reports: unknown[]): number {
  if (body && typeof body === 'object') {
    const total = (body as ChainabuseResponse).total;
    if (typeof total === 'number' && Number.isFinite(total)) return total;
  }
  return reports.length;
}

/** 举报数量 → 风险等级 */
function riskFromCount(reportCount: number): { level: RiskLevel; score: number } {
  if (reportCount <= 0) return { level: 'SAFE', score: 0 };
  if (reportCount < 5) return { level: 'SUSPICIOUS', score: 50 };
  return { level: 'SCAM', score: 90 };
}

/**
 * 通过 Chainabuse Get Reports API 查询地址或网址是否被举报。
 *
 * 官方接口（v0）：
 *   GET https://api.chainabuse.com/v0/reports?address=<addr>&includePrivate=false&page=1&perPage=50
 *   GET https://api.chainabuse.com/v0/reports?url=<host>&includePrivate=false&page=1&perPage=50
 * 鉴权：请求头 X-API-Key: <CHAINABUSE_API_KEY>
 */
async function lookupFromChainabuse(
  value: string,
  type: EntityType,
): Promise<LookupResult> {
  if (!API_KEY) {
    throw new Error('CHAINABUSE_API_KEY is not configured');
  }

  const params = new URLSearchParams({
    includePrivate: 'false',
    page: '1',
    perPage: '50',
    ...(type === 'ADDRESS' ? { address: value } : { url: value }),
  });

  const res = await fetch(`${CHAINABUSE_API}?${params.toString()}`, {
    headers: {
      accept: 'application/json',
      'X-API-Key': API_KEY,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Chainabuse API error: ${res.status} ${res.statusText}`);
  }

  const body: unknown = await res.json();
  const reports = extractReports(body);
  const reportCount = countReports(body, reports);

  const categories = Array.from(
    new Set(
      reports
        .map((r) => r.category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0),
    ),
  ).slice(0, 10);

  const { level, score } = riskFromCount(reportCount);

  return {
    value,
    type,
    riskLevel: level,
    riskScore: reportCount > 0 ? score : null,
    reportCount,
    categories,
    checkedAt: new Date().toISOString(),
    isMock: false,
    raw: body,
  };
}

/**
 * 演示模式：对同一输入始终返回相同结果的确定性模拟数据。
 * 仅用于没有配置 CHAINABUSE_API_KEY 时的开发调试。
 */
function lookupFromMock(value: string, type: EntityType): LookupResult {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  const reportCount = hash % 12;
  let level: RiskLevel;
  let score: number | null;

  if (reportCount === 0) {
    level = 'SAFE';
    score = null;
  } else if (reportCount < 4) {
    level = 'SUSPICIOUS';
    score = 45;
  } else {
    level = 'SCAM';
    score = 85;
  }

  const categories =
    level === 'SCAM'
      ? ['Phishing', 'Impersonation']
      : level === 'SUSPICIOUS'
        ? ['Suspicious activity']
        : [];

  return {
    value,
    type,
    riskLevel: level,
    riskScore: score,
    reportCount,
    categories,
    checkedAt: new Date().toISOString(),
    isMock: true,
  };
}

/**
 * 查询钱包地址或网站的风险状态。
 *
 * - 已配置 CHAINABUSE_API_KEY：走真实 API；失败时抛出异常
 *   （安全查询不允许静默降级为模拟数据，调用方应返回 502）。
 * - 未配置 Key：返回明确标注的演示数据（isMock: true）。
 */
export async function lookupEntity(
  value: string,
  type: EntityType,
): Promise<LookupResult> {
  if (API_KEY) {
    return lookupFromChainabuse(value, type);
  }
  return lookupFromMock(value, type);
}
