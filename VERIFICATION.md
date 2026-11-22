# Verification record

## Branded catalogue update — 22 November 2026

- `npm run build`: TypeScript and production build passed after adding product reference metadata and details.
- `npm test`: **42 tests passed**, zero failures. Two catalogue tests cover first-run enrichment, price preservation, internal shop SKU assignment, and owner-customized product safety.
- Browser verification confirmed all six product photos load, and the Product details panel shows brand, pack size, product type, manufacturer, country, source links, shop SKU, shop selling price, and current-label guidance. New stock and sales use the per-pack unit.
- The built-in retailer photo links require internet access. The app shows an icon fallback if an external image source stops serving a photo. Shop prices remain separate from external reference listings.
- Demo migration preserves existing prices, batches, stock, and transaction history; it updates only products that still match the untouched sample items.

## Operations edition v3 — 27 October 2026

- `npm test`: **40 tests passed**, zero failures. Localhost integration tests ran outside the restricted sandbox after it blocked loopback access.
- `npm run build`: TypeScript and production build passed.
- Added tests cover order commitments, multi-line receipt and partial payment, receipt retry conflicts, rollback, stock-count corrections, reconciliation, planned-expense settlement, cash planning, audit-chain/current-state integrity, and advisor privacy/consent/errors using mocked OpenAI responses.
- PurchaseGuard now takes received quantities from original purchase records. Found-stock corrections increase remaining units without fabricating additional receipts; a regression test covers this.
- Browser checks confirmed sign-in, Operations desk, local advisor evidence, unconfigured OpenAI status, and a calculation-only what-if scenario.
- No real OpenAI credentials were supplied or used; **live OpenAI access is unverified**. Native PostgreSQL remains unverified. This is a single-shop workspace with documented production limitations.
- The v3 source archive excludes runtime business data, credentials, dependencies and generated build files. Run the documented installation and build steps after extraction.

## Earlier professional edition verification

Professional edition verified on 16 October 2026 using Node.js 24.18.0 on Windows.

- `npm run build`: passed TypeScript checks and Vite production compilation.
- `npm test`: 25 tests passed; zero failures.
- Dependency installation audit: zero known vulnerabilities reported at installation time.
- Browser: owner login, dashboard, credit POS checkout with ₹140 due and printed-receipt view, ProfitShield generation, approval, physical receiving, and PurchaseGuard Replay were exercised against the live Express API.
- The browser purchase plan created 52 units across three received batches. Replay showed 52 received, 52 remaining, zero sold and zero invented realized margin.
- Browser responsive checks: narrow in-app viewport and 1440px desktop layout. Desktop document content did not exceed its viewport width; tables scroll within their containers.
- Local persisted snapshot was written by successful browser mutations. The delivered source archive excludes runtime data and starts with a fresh seed.

Automated tests cover:

1. Approved-plan inventory/cash commitments and cancellation.
2. Stale recommendation detection after stock changes.
3. Affordable supplier/MOQ fallback.
4. Real sale attribution to recommended batches.
5. FEFO allocation and expired-batch exclusion.
6. Credit sale and subsequent collection accounting.
7. Purchase asset treatment, delivery expense and supplier settlement.
8. Idempotent retries and changed-payload rejection.
9. Write-off loss without a second cash movement.
10. Budget, reserve, MOQ, shelf-life and margin constraints.
11. Receipt lifecycle and repeat-receipt rejection.
12. Rollback after a later invoice line fails.
13. Concurrent checkouts cannot sell the same unit twice.
14. API validation and end-to-end credit sale.
15. Authenticated access, HttpOnly sessions and logout invalidation.

Native PostgreSQL was not available for integration testing. Its driver path and Docker Compose setup are supplied, but passing local-adapter tests is not evidence of native PostgreSQL verification. Real-world forecasting accuracy, statutory tax compliance, offline synchronization and multi-user production security remain outside this verified MVP scope.

Professional edition additions were verified through 10 further automated tests: configured GST after discounts and exclusion from profit, immutable invoice snapshots, full paid-invoice return reversal and duplicate blocking, unsupported credit-sale return rejection, transfer conservation, GST purchase reserves, chronological weekday-model selection without future leakage, empty-history fallback, CSV formula-cell escaping, and read-only preview/quotation followed by one-time invoice conversion. Browser checks also confirmed product renders, exact checkout preview, a numbered invoice document and the fitted-model health screen.
