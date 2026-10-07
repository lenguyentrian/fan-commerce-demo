# Product context

Fan Commerce is a platform for an artist's fanbase to buy official merch,
concert tickets and fan-club memberships.

## What makes this product different from a generic CRUD app

- **Money moves.** Every change to pricing, discounts, shipping or order state
  is a financial change. A rendering bug is a repaint; a totals bug is a refund
  and a support thread.
- **Demand is spiky.** A ticket drop is the load profile: quiet, then a
  thundering herd. That is why the catalogue is statically rendered and only
  session-dependent routes are dynamic.
- **Stock is finite and contested.** Tickets and limited merch sell out during
  the session, so "available when the page rendered" is not "available at
  checkout". The server re-checks stock when the order is placed.
- **The audience is mobile-first and Vietnamese.** Default locale is `vi-VN`,
  prices are VND (no minor unit), phone validation follows Vietnamese mobile
  formats, and the mobile viewport is a first-class test target.

## Core journeys, in priority order

1. **Browse → product → cart → login → checkout → order.** The revenue path.
   Covered end-to-end in `e2e/checkout-journey.spec.ts`.
2. **Find a specific item.** Filter by kind, search by name/artist/tag. The
   query lives in the URL so results are shareable and server-rendered.
3. **Check an order.** Status, lines, totals and shipping address, scoped
   strictly to the signed-in user.

## Product rules that are easy to get wrong

- A discount applies to the subtotal **before** free shipping is decided. So a
  500.000đ cart with a 10% code drops to 450.000đ and shipping comes back.
- Free shipping threshold: 500.000đ. Shipping fee: 30.000đ.
- Maximum 10 units per cart line, and never more than the remaining stock.
  `stock: null` means untracked (digital goods), not unlimited.
- Promo codes are case-insensitive and whitespace-tolerant on input, normalized
  to uppercase in state.
- COD orders start as `pending`; gateway payments are recorded as `paid`.
- A product is sold out only when **every** variant is out of stock. One
  sold-out size must not hide the product.

## Out of scope for this demo

No real payment gateway, no email, no inventory reservation, no admin tooling.
Users, products and orders are in-memory fixtures. These are deliberate
omissions, not unfinished work — the point of the repository is the engineering
around the journey, not a complete storefront.
