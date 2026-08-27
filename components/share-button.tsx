'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { ShareIcon, CheckIcon } from 'lucide-react';

export default function ShareButton({
  value,
  type,
}: {
  value: string;
  type: string;
}) {
  const locale = useLocale();
  const t = useTranslations('Risk');
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/${locale}/check/${encodeURIComponent(value)}`;

    // 优先使用系统分享（移动端）
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ScamHawk - ${value}`,
          text: t('shareText', { defaultValue: `Check this ${type.toLowerCase()} on ScamHawk` }),
          url,
        });
        return;
      } catch {
        // 用户取消分享，fallback 到剪贴板
      }
    }

    // fallback: 复制到剪贴板
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 最终 fallback: 选中输入框
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
      title={t('share')}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
          {t('shareCopied')}
        </>
      ) : (
        <>
          <ShareIcon className="h-3.5 w-3.5" />
          {t('share')}
        </>
      )}
    </button>
  );
}
