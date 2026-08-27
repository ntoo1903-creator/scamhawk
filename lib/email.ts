import { Resend } from 'resend';
import type { RiskLevel, EntityType } from '@/lib/types';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ScamHawk <notifications@scamhawk.com>';

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/** 邮件服务是否已配置 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const RISK_LABELS: Record<RiskLevel, string> = {
  SAFE: '安全 / Safe',
  SUSPICIOUS: '可疑 / Suspicious',
  SCAM: '高风险 / High Risk',
  UNKNOWN: '未知 / Unknown',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: '#10b981',
  SUSPICIOUS: '#f59e0b',
  SCAM: '#ef4444',
  UNKNOWN: '#6b7280',
};

/**
 * 发送风险变化通知邮件。
 * 如果邮件服务未配置或用户无邮箱，静默跳过（不抛错）。
 */
export async function sendRiskChangeEmail(params: {
  to: string;
  entityValue: string;
  entityType: EntityType;
  oldRisk: RiskLevel;
  newRisk: RiskLevel;
  reportCount: number;
  categories: string[];
}): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { to, entityValue, entityType, oldRisk, newRisk, reportCount, categories } = params;

  const typeLabel = entityType === 'ADDRESS' ? '钱包地址' : '网站';
  const subject = `[ScamHawk] 风险变化提醒：${entityValue.slice(0, 20)}…`;
  const categoryStr = categories.length > 0 ? categories.join(' · ') : '—';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 20px; margin: 0;">🦅 ScamHawk 风险提醒</h1>
  </div>

  <p>你监控的<strong>${typeLabel}</strong>风险等级发生了变化：</p>

  <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">查询对象</p>
    <p style="margin: 0; font-family: monospace; font-size: 13px; word-break: break-all;">${entityValue}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">原风险</td>
      <td style="padding: 8px 12px; font-size: 14px;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: white; background: ${RISK_COLORS[oldRisk]};">
          ${RISK_LABELS[oldRisk]}
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">现风险</td>
      <td style="padding: 8px 12px; font-size: 14px;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: white; background: ${RISK_COLORS[newRisk]};">
          ${RISK_LABELS[newRisk]}
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">举报数</td>
      <td style="padding: 8px 12px; font-size: 14px; font-weight: 600;">${reportCount}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">举报类型</td>
      <td style="padding: 8px 12px; font-size: 14px;">${categoryStr}</td>
    </tr>
  </table>

  <div style="text-align: center; margin: 24px 0;">
    <a href="https://scamhawk.com/zh/dashboard" style="display: inline-block; padding: 10px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
      查看监控台
    </a>
  </div>

  <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">
    此邮件由 ScamHawk 自动发送。你可以在监控台移除该对象以停止接收提醒。
  </p>
</body>
</html>`;

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[email] failed to send risk change notification:', err);
    return false;
  }
}
