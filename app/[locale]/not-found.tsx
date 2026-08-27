import { Link } from '@/i18n/navigation';

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-800">
        页面不存在 / Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        你访问的页面不存在，请检查地址是否正确。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        回到首页
      </Link>
    </section>
  );
}
