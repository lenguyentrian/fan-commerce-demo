export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--fc-border)] bg-[var(--fc-surface)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-[var(--fc-text-muted)] sm:px-6">
        <p className="font-medium text-[var(--fc-text)]">Fan Commerce — demo kỹ thuật</p>
        <p>
          Dữ liệu sản phẩm, người dùng và đơn hàng đều là dữ liệu mẫu trong bộ nhớ. Không có thanh
          toán thật, không thu thập dữ liệu cá nhân.
        </p>
        <p>
          Mã nguồn và tài liệu quy trình phát triển với coding agent nằm trong thư mục{' '}
          <code className="rounded bg-[var(--fc-surface-sunken)] px-1 py-0.5">docs/</code>.
        </p>
      </div>
    </footer>
  );
}
