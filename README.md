# 🦅 ScamHawk

加密钱包地址与网站风险查询工具。输入钱包地址或网址，即时查询该对象是否被 [Chainabuse](https://chainabuse.com) 社区举报为诈骗。

## 功能特性

- 🔍 **风险查询** — 支持 Ethereum、Bitcoin、Solana、Tron 地址和任意网站
- 📊 **举报详情** — 展示举报数量、类型和风险等级
- 🔔 **智能监控** — 添加到监控列表后每 6 小时自动复查
- 📧 **邮件通知** — 风险等级变化时自动发送提醒
- 🔗 **分享链接** — 生成可分享的查询结果链接
- 🌐 **中英文支持** — 完整的 i18n 国际化
- 💳 **订阅付费** — 集成 Paddle 支付，免费版 + 专业版

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: Neon PostgreSQL + Prisma ORM
- **认证**: Clerk
- **支付**: Paddle Billing
- **邮件**: Resend
- **数据源**: Chainabuse API
- **国际化**: next-intl
- **部署**: Vercel

## 快速开始

### 1. 安装依赖

```bash
cd scamhawk
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 填入以下必要配置：

| 变量 | 说明 | 必需 |
|------|------|------|
| `DATABASE_URL` | Neon PostgreSQL 连接字符串 | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公钥 | ✅ |
| `CLERK_SECRET_KEY` | Clerk 私钥 | ✅ |
| `CHAINABUSE_API_KEY` | Chainabuse API Key | 可选（无则使用演示数据） |
| `PADDLE_API_KEY` | Paddle 服务端 Key | 可选（无则禁用订阅） |
| `RESEND_API_KEY` | Resend 邮件 Key | 可选（无则禁用邮件） |

### 3. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 免费版限制

| 功能 | 免费版 | 专业版 |
|------|--------|--------|
| 每日查询次数 | 10 次 | 不限 |
| 监控数量 | 5 个 | 不限 |
| 自动复查 | ❌ | 每 6 小时 |
| 风险变化提醒 | ❌ | ✅ |

## 项目结构

```
scamhawk/
├── app/
│   ├── api/              # API 路由
│   │   ├── check/        # 风险查询
│   │   ├── watch/        # 监控管理
│   │   ├── cron/         # 定时任务
│   │   └── paddle/       # 支付相关
│   └── [locale]/         # 多语言页面
│       ├── page.tsx      # 首页
│       ├── dashboard/    # 监控台
│       ├── pricing/      # 价格页
│       └── check/        # 分享链接页
├── components/           # React 组件
├── lib/                  # 工具函数
│   ├── chainabuse.ts     # Chainabuse API
│   ├── auth.ts           # Clerk 认证
│   ├── paddle.ts         # Paddle 支付
│   ├── email.ts          # 邮件发送
│   ├── prisma.ts         # 数据库客户端
│   ├── validation.ts     # 输入验证
│   └── rate-limit.ts     # 免费版限制
├── messages/             # 翻译文件
│   ├── zh.json
│   └── en.json
├── prisma/               # 数据库 Schema
└── i18n/                 # 国际化配置
```

## 部署

推荐使用 [Vercel](https://vercel.com) 部署：

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署完成

Vercel 会自动处理：
- 每 6 小时调用 `/api/cron/watch` 复查监控项
- 自动 HTTPS 和 CDN

## License

MIT
