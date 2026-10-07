# Checkout journey — requirements

Status: **implemented**. Kept in the repository as a worked example of the
spec-driven flow, and because the acceptance criteria below are what the
Playwright suite actually asserts.

## Goal

A signed-in fan can turn a cart into a recorded order, and be certain of what
they paid.

## User stories

### US-1 — Review the cart before paying

**As a** fan with items in my cart
**I want** to see each line, the subtotal, any discount and the shipping cost
**So that** the total is not a surprise at the last step.

Acceptance criteria:
- AC-1.1 Each line shows image, name, variant, unit quantity and line total.
- AC-1.2 Quantity can be changed between 1 and the lesser of remaining stock
  and 10; the control disables at both ends.
- AC-1.3 Setting quantity to 0 removes the line.
- AC-1.4 The summary shows subtotal, discount (only when non-zero), shipping
  and total.
- AC-1.5 The cart survives a page reload.
- AC-1.6 An empty cart shows an empty state with a route back to the catalogue,
  not a zeroed-out summary.

### US-2 — Apply a promo code

**As a** fan club member
**I want** to enter my code
**So that** the discount is reflected before I commit.

Acceptance criteria:
- AC-2.1 Codes are accepted case-insensitively and with surrounding whitespace.
- AC-2.2 An unknown code shows a field-level error and leaves the total alone.
- AC-2.3 The discount applies to the subtotal **before** free shipping is
  evaluated. A 500.000đ cart with `FAN10` becomes 450.000đ and shipping returns.
- AC-2.4 The discount is recomputed on the server at checkout; the client's
  figure is never trusted.

### US-3 — Authenticate before paying

**As a** fan who is not signed in
**I want** to be sent to login and returned to checkout
**So that** I do not lose my cart or my place in the flow.

Acceptance criteria:
- AC-3.1 Navigating to `/checkout` while anonymous redirects to
  `/login?next=/checkout`.
- AC-3.2 After a successful login the fan lands on `/checkout` with the cart
  intact.
- AC-3.3 An external `next` value is ignored and falls back to `/`.
- AC-3.4 Calling `POST /api/checkout` directly while anonymous returns 401
  `UNAUTHENTICATED`.

### US-4 — Place the order

**As a** signed-in fan
**I want** to submit my address and payment method
**So that** the order is recorded and I can see it.

Acceptance criteria:
- AC-4.1 Address fields are validated; a bad phone number blocks submission and
  focus moves to the offending field.
- AC-4.2 The server re-derives every line price from the catalogue.
- AC-4.3 Remaining stock is re-checked at submit time, not only at render time.
- AC-4.4 Submitting twice with the same `idempotencyKey` returns the same
  order.
- AC-4.5 On success the cart empties and the order appears in `/orders` with a
  code, status, lines, totals and shipping address.
- AC-4.6 COD orders are `pending`; gateway payments are `paid`.

### US-5 — See only my own orders

**As a** fan
**I want** my order list to contain only my orders
**So that** no one else's purchase or address is visible to me.

Acceptance criteria:
- AC-5.1 `GET /api/orders` scopes by the session user id.
- AC-5.2 No endpoint accepts a user id from the client as the lookup key.

## Non-functional requirements

- NFR-1 Catalogue routes stay statically rendered; only session-dependent
  routes may be dynamic.
- NFR-2 The journey works at a 390px viewport with no horizontal overflow.
- NFR-3 The whole journey is operable by keyboard; errors are announced to
  assistive technology.
- NFR-4 Login and order creation are rate limited.
- NFR-5 The session token is unreadable from JavaScript.

## Explicitly out of scope

Real payment gateway, email/receipts, inventory reservation, guest checkout,
address book, order cancellation.
