# Product

<!-- impeccable:product-schema 1 -->

> Status: inferred from the existing repository and the user's explicit redesign brief; correct any product fact that is inaccurate.

## Platform

web

## Users

- Primary: businesses and brand teams evaluating, finding, and booking suitable KOC/KOL partners for campaigns.
- Secondary: KOC/KOL creators evaluating whether the platform offers transparent pricing, reliable payment, and sustainable booking opportunities.

## Product Purpose

KOC Việt connects businesses and creators through a public booking marketplace. The landing experience must make the offer understandable, establish trust in pricing and payment, and move visitors toward either finding a KOC or registering as one.

## Positioning

The product presents public KOC pricing, protected payment, and measurable performance data in one booking flow instead of relying on opaque agency quotations or informal negotiation.

## Operating Context

Visitors arrive on a public marketing route, compare the two sides of the marketplace, review the booking process and evidence, then continue to the KOC marketplace, business flow, or creator registration. The homepage also surfaces a live activity feed supplied by the existing frontend logic.

## Capabilities and Constraints

- Preserve the existing routes, content, metrics, testimonials, activity-feed behavior, links, backend integration, and authentication flows.
- Preserve the current frontend entry architecture. Although React source is present in the repository, the public homepage currently served by Vite is rendered through `front-end/src/app.js` and `front-end/src/landing/pages.js`.
- The redesign is visual and structural only; it must not change product logic or factual claims.
- Mobile responsiveness is required.

## Brand Commitments

- Product name: KOC Việt, part of NetViet.
- Preserve the current KOC Việt wordmark and existing media assets.
- Preserve the primary navy/coral brand relationship; supporting neutrals may be adjusted for hierarchy and readability.
- Preserve the direct, transparent Vietnamese product voice.

## Evidence on Hand

- Existing homepage copy, supplied metrics, and two testimonials in `front-end/src/landing/pages.js`.
- Existing hero artwork in `front-end/public/images/home-hero-blended-v2.png`.
- Existing campaign-process video and category artwork already referenced by the homepage.
- Existing real-time activity module and its interaction logic in `front-end/src/landing/shared.js`.
- No new commercial claims, customer logos, benchmarks, or testimonials may be fabricated during redesign.

## Product Principles

- Make pricing and the booking mechanism legible before adding persuasion.
- Treat businesses and creators as equal participants in a two-sided marketplace.
- Use measurable evidence and workflow clarity to earn trust.
- Keep the primary next action obvious without turning every section into a sales panel.

## Accessibility & Inclusion

The public experience must remain semantic, keyboard navigable, focus-visible, motion-safe, and usable from small mobile screens through desktop widths.
