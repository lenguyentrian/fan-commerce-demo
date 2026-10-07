'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { TextField } from '@fc/ui';

/**
 * Debounced search that writes to the URL rather than to local state.
 *
 * Keeping the query in the URL means results are shareable, the back button
 * works, and the server component can render them — no client-side fetch and
 * no duplicated filtering logic.
 */
export function SearchField({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip the mount pass so landing on /products?q=tee does not re-navigate.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();

      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }
      // A new search always starts from page 1.
      params.delete('page');

      const qs = params.toString();
      router.replace(`/products${qs ? `?${qs}` : ''}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, router, searchParams]);

  return (
    <form
      role="search"
      className="max-w-md"
      onSubmit={(event) => {
        // The debounce already navigated; this only stops a full page reload
        // when someone presses Enter.
        event.preventDefault();
      }}
    >
      <TextField
        label="Tìm sản phẩm"
        type="search"
        placeholder="Tên sản phẩm, nghệ sĩ hoặc tag..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        hint="Kết quả cập nhật khi bạn ngừng nhập."
        autoComplete="off"
      />
    </form>
  );
}
