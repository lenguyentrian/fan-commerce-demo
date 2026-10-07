import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <p className="max-w-sm text-[var(--fc-text-muted)]">
        Đường dẫn không tồn tại hoặc sản phẩm đã bị xoá khỏi catalogue.
      </p>
      <Link
        href="/products"
        className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Về trang sản phẩm
      </Link>
    </div>
  );
}
