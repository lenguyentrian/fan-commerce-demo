/**
 * Seed catalogue.
 *
 * Stands in for a backend service. Every record is parsed through
 * `productSchema` at module load, so a malformed fixture fails the build
 * instead of producing a half-rendered page at runtime.
 */
import { productSchema, type Product, type ProductListQuery } from '@fc/core';

const RAW_PRODUCTS = [
  {
    id: 'p_tour_tee',
    slug: 'anh-trai-tour-tee',
    name: 'Anh Trai World Tour Tee',
    kind: 'merch',
    artist: 'Anh Trai Collective',
    summary: 'Áo thun tour chính thức, cotton 240gsm.',
    description:
      'Áo thun phiên bản tour giới hạn, in lụa hai mặt, cotton 240gsm dệt kim single jersey. Form unisex, giặt máy được ở 30°C.',
    price: { amount: 450_000, currency: 'VND' },
    compareAtPrice: { amount: 590_000, currency: 'VND' },
    imageUrl: '/images/products/tour-tee.svg',
    imageAlt: 'Áo thun tour màu đen với logo in giữa ngực',
    tags: ['tour', 'limited', 'bestseller'],
    variants: [
      { id: 'v_s', label: 'S', stock: 12 },
      { id: 'v_m', label: 'M', stock: 8 },
      { id: 'v_l', label: 'L', stock: 0 },
      { id: 'v_xl', label: 'XL', stock: 3 },
    ],
    rating: 4.8,
    releasedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'p_concert_hanoi',
    slug: 've-concert-ha-noi-night-1',
    name: 'Vé Concert Hà Nội — Night 1',
    kind: 'ticket',
    artist: 'Anh Trai Collective',
    summary: 'Khu Standing A, 20/12/2026, SVĐ Mỹ Đình.',
    description:
      'Vé điện tử khu Standing A. QR check-in gửi qua email và trong mục Đơn hàng. Vé không hoàn, có thể chuyển nhượng một lần trước 48 giờ.',
    price: { amount: 2_400_000, currency: 'VND' },
    compareAtPrice: null,
    imageUrl: '/images/products/concert-ticket.svg',
    imageAlt: 'Vé concert điện tử với mã QR',
    tags: ['concert', 'hanoi'],
    variants: [
      { id: 'v_standing_a', label: 'Standing A', stock: 40 },
      { id: 'v_seat_b', label: 'Seat B', stock: 120 },
    ],
    rating: null,
    releasedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'p_fanclub_gold',
    slug: 'fan-club-gold-membership',
    name: 'Fan Club Gold — 12 tháng',
    kind: 'membership',
    artist: 'Anh Trai Collective',
    summary: 'Ưu tiên mua vé, livestream độc quyền, giảm 10% merch.',
    description:
      'Gói thành viên 12 tháng: mở bán vé sớm 24 giờ, truy cập livestream hậu trường, giảm 10% toàn bộ merch (mã FAN10), thẻ thành viên số.',
    price: { amount: 1_200_000, currency: 'VND' },
    compareAtPrice: { amount: 1_500_000, currency: 'VND' },
    imageUrl: '/images/products/membership.svg',
    imageAlt: 'Thẻ thành viên Fan Club Gold',
    tags: ['membership', 'perks'],
    variants: [{ id: 'v_12m', label: '12 tháng', stock: null }],
    rating: 4.9,
    releasedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'p_photobook',
    slug: 'photobook-behind-the-tour',
    name: 'Photobook — Behind The Tour',
    kind: 'merch',
    artist: 'Anh Trai Collective',
    summary: '180 trang ảnh hậu trường, bìa cứng.',
    description:
      'Photobook bìa cứng 180 trang, in offset 4 màu trên giấy couche matt 150gsm, kèm 5 postcard rời.',
    price: { amount: 690_000, currency: 'VND' },
    compareAtPrice: null,
    imageUrl: '/images/products/photobook.svg',
    imageAlt: 'Photobook bìa cứng đặt nghiêng',
    tags: ['collectible'],
    variants: [{ id: 'v_std', label: 'Standard', stock: 25 }],
    rating: 4.6,
    releasedAt: '2026-02-20T00:00:00.000Z',
  },
  {
    id: 'p_live_album',
    slug: 'live-album-digital',
    name: 'Live Album (Digital)',
    kind: 'digital',
    artist: 'Anh Trai Collective',
    summary: 'Tải FLAC + MP3, 14 bài thu trực tiếp.',
    description:
      'Album thu trực tiếp tại đêm diễn Sài Gòn. Link tải FLAC 24-bit và MP3 320kbps có hiệu lực vĩnh viễn trong mục Đơn hàng.',
    price: { amount: 150_000, currency: 'VND' },
    compareAtPrice: null,
    imageUrl: '/images/products/live-album.svg',
    imageAlt: 'Bìa album thu trực tiếp',
    tags: ['digital', 'music'],
    variants: [{ id: 'v_download', label: 'Download', stock: null }],
    rating: 4.7,
    releasedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'p_lightstick',
    slug: 'official-lightstick-v2',
    name: 'Lightstick chính thức v2',
    kind: 'merch',
    artist: 'Anh Trai Collective',
    summary: 'Bluetooth đồng bộ ánh sáng tại concert.',
    description:
      'Lightstick thế hệ 2, kết nối Bluetooth 5.0 để đồng bộ hiệu ứng ánh sáng theo show. Pin AAA, kèm dây đeo.',
    price: { amount: 850_000, currency: 'VND' },
    compareAtPrice: { amount: 950_000, currency: 'VND' },
    imageUrl: '/images/products/lightstick.svg',
    imageAlt: 'Lightstick phát sáng màu hồng',
    tags: ['concert', 'bestseller'],
    variants: [{ id: 'v_std', label: 'Standard', stock: 0 }],
    rating: 4.5,
    releasedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'p_concert_hcm',
    slug: 've-concert-tphcm-night-2',
    name: 'Vé Concert TP.HCM — Night 2',
    kind: 'ticket',
    artist: 'Anh Trai Collective',
    summary: 'Khu VIP, 10/01/2027, Sân Thống Nhất.',
    description: 'Vé điện tử khu VIP kèm soundcheck. Giới hạn 2 vé mỗi tài khoản.',
    price: { amount: 3_800_000, currency: 'VND' },
    compareAtPrice: null,
    imageUrl: '/images/products/concert-ticket.svg',
    imageAlt: 'Vé concert VIP điện tử',
    tags: ['concert', 'vip', 'hcmc'],
    variants: [{ id: 'v_vip', label: 'VIP', stock: 6 }],
    rating: null,
    releasedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'p_tote',
    slug: 'canvas-tote-bag',
    name: 'Túi tote canvas',
    kind: 'merch',
    artist: 'Anh Trai Collective',
    summary: 'Canvas 12oz, in lụa một mặt.',
    description: 'Túi tote canvas 12oz, quai dài 60cm, có túi trong. In lụa một mặt.',
    price: { amount: 280_000, currency: 'VND' },
    compareAtPrice: null,
    imageUrl: '/images/products/tote.svg',
    imageAlt: 'Túi tote canvas màu kem',
    tags: ['everyday'],
    variants: [{ id: 'v_std', label: 'Standard', stock: 50 }],
    rating: 4.4,
    releasedAt: '2026-02-05T00:00:00.000Z',
  },
] as const;

/** Parsed once at module load — a bad fixture fails fast. */
export const PRODUCTS: readonly Product[] = RAW_PRODUCTS.map((raw) => productSchema.parse(raw));

export function findProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function findProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

export interface PagedProducts {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function queryProducts(query: ProductListQuery): PagedProducts {
  const needle = query.q?.toLowerCase();

  const filtered = PRODUCTS.filter((product) => {
    if (query.kind && product.kind !== query.kind) return false;
    if (!needle) return true;
    return (
      product.name.toLowerCase().includes(needle) ||
      product.artist.toLowerCase().includes(needle) ||
      product.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const start = (query.page - 1) * query.pageSize;

  return {
    items: filtered.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages,
  };
}
