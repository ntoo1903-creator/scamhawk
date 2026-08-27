import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Clerk 未配置环境变量时只做语言路由，避免抛 Missing publishableKey
const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
);

export default clerkConfigured
  ? clerkMiddleware((_auth, req) => {
      // API/TRPC 路由：只让 clerkMiddleware 设置鉴权 headers（auth() 依赖），
      // 不做语言前缀重定向，避免把 /api/check 重写成 /zh/api/check
      const { pathname } = req.nextUrl;
      if (pathname.startsWith('/api') || pathname.startsWith('/trpc')) {
        return NextResponse.next();
      }
      return intlMiddleware(req);
    })
  : intlMiddleware;

export const config = {
  // 覆盖页面与 API 路由（clerkMiddleware 需要在 API 上运行，auth() 才可用）；
  // 跳过 Next 内部与带扩展名的静态资源
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
