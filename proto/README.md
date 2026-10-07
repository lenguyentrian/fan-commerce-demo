# Protobuf contracts

The app serves REST today. These `.proto` files are the same contract expressed
for gRPC, kept in the repository so that moving a service is a transport change
rather than a redesign.

```
proto/fancommerce/v1/
  common.proto    Money, field-level validation detail
  catalog.proto   CatalogService — unary, paginated list, server streaming
  order.proto     OrderService — checkout with an idempotency key, scoped lists
```

## Why this already lines up with the running code

Three deliberate choices in `packages/core` make the transport swappable:

**Error codes are transport-agnostic.** `ApiErrorCode` maps to both HTTP and
gRPC status numbers in one place (`api/errors.ts`), and UI code switches on the
**code**, never on a status number:

| Code | HTTP | gRPC |
| --- | --- | --- |
| `INVALID_ARGUMENT` | 400 | 3 |
| `UNAUTHENTICATED` | 401 | 16 |
| `PERMISSION_DENIED` | 403 | 7 |
| `NOT_FOUND` | 404 | 5 |
| `ALREADY_EXISTS` | 409 | 6 |
| `RESOURCE_EXHAUSTED` | 429 | 8 |
| `DEADLINE_EXCEEDED` | 504 | 4 |
| `UNAVAILABLE` | 503 | 14 |
| `INTERNAL` | 500 | 13 |

**Money is already wire-safe.** An integer count of minor units plus a currency
code, identical in `money.ts` and `common.proto`. Nothing to convert, and no
float to lose precision in.

**Retries already assume idempotency.** The `ApiClient` retries only
`UNAVAILABLE` and `DEADLINE_EXCEEDED`, and only for idempotent methods or calls
carrying an idempotency key. gRPC's declarative retry policy has exactly the
same requirement, so `CheckoutRequest.idempotency_key` is not a new idea — it is
the existing one, named the same way.

## Protobuf conventions applied here

- **Enums reserve zero for `UNSPECIFIED`.** proto3 has no presence tracking for
  bare enums, so an absent field reads as zero. If zero were a real value, a
  missing `payment_method` would silently become a valid payment method.
- **`optional` where absence is meaningful.** `ProductVariant.stock` absent
  means "not tracked" (digital goods); `0` means sold out. A bare `int32` cannot
  express that difference.
- **Page tokens, not offsets.** An offset shifts when the catalogue changes
  mid-browse, duplicating or skipping items.
- **`int64` for money.** An order total in dong outgrows `int32` quickly.
- **No `user_id` in `ListOrdersRequest`.** Identity comes from the
  authenticated session in call metadata. A user id in the request body is how
  an endpoint becomes an invitation to read someone else's orders.
- **Field numbers are permanent.** Once published, never renumber, never
  re-type, and `reserved` any number that is removed. That discipline is what
  makes protobuf backward compatible.

## Code generation, when the time comes

```bash
# TypeScript (buf is the current tooling; protoc still works)
npx buf generate

# Dart, for the Flutter app
dart pub global activate protoc_plugin
protoc --dart_out=grpc:apps/mobile/lib/generated -Iproto proto/fancommerce/v1/*.proto
```

## Honest status

These contracts are **designed, not deployed.** No generated code is committed,
no gRPC server runs, and the browser would need [Connect](https://connectrpc.com)
or a gRPC-Web proxy because browsers cannot speak gRPC directly.

They are here because the error model, the money representation and the
idempotency design were chosen with this transport in mind, and writing the
contract down is how that claim stays checkable instead of aspirational.
