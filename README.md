# SMARTBIZ AI

A professional single-shop business workspace built with React, TypeScript, Tailwind, Node/Express, and a PostgreSQL-compatible transactional store. It combines POS billing, inventory, expiry control, purchases, cash, dues, reporting, and explainable AI-assisted purchase planning. Retail reference photos need internet access; see [IMAGE_ASSETS.md](IMAGE_ASSETS.md) for source notes. See [V3-OPERATIONS.md](V3-OPERATIONS.md) for workflows and AI setup.

## Problem statement

Small retailers often maintain billing, inventory, supplier payments and customer credit in separate records. This makes it difficult to distinguish profit from available money, identify stock likely to expire, or decide whether a wholesale offer is affordable. SMARTBIZ connects these records and produces explainable purchase plans that balance demand, shelf life, supplier terms and cash obligations. PurchaseGuard Replay makes each decision traceable to the batches actually received and their subsequent sales and write-offs. Recommendations are reviewable decision support, not guaranteed savings.

## Professional edition update

The professional edition adds a redesigned workspace and photo-based POS, product photo uploads, product units/HSN/GST configuration, sequential invoice numbers, immutable invoice snapshots, A4 printing / browser Save as PDF, invoice search/filter/pagination, quotations with one-time conversion to billing, full paid-invoice returns, account transfers, business settings, credit limits for new customers, copyable customer reminder drafts, filtered performance reports and party statements, and CSV export in rupees.

**Does the AI work?** Yes: local statistical models fit sales history, compare a mean baseline with shrinkage-based weekday effects on a chronological holdout, and select a weekday model only if it improves MAE by at least 5%. ProfitShield uses the selected forecast while enforcing purchasing constraints. The **AI insights** page exposes model choice, seven/thirty-day forecasts, MAE and WAPE. The ledger assistant calculates supported profit/cash/dues/expiry answers from actual records. The local mode is an intent-based assistant, not an external LLM. Local mode needs no API key or Python service; the optional connected advisor uses OpenAI only after server configuration and sharing consent. Forecast skill on real-world shop data is not established by synthetic seed data.

The model comparison uses the final seven days of the 28-day window, with the first 21 used for fitting. After selection it refits on all 28 days. Reported holdout error is used for model selection and is not an independent, unbiased final test-set score. Forecast bands are heuristic ±2 MAE, not calibrated prediction intervals. A mean fallback is correct when a weekday model fails to improve performance.

## Operations edition update

Eight added screens connect business operations to the existing records: **Operations desk**, **Purchase orders**, **Stock count**, **Cash closing**, **Cash-flow planner**, **What-if lab**, **Connected AI advisor**, and **Audit history**. The edition adds supplier-order receiving/cancellation, batch count corrections, account reconciliation records, planned expenses, dated business tasks, conservative 30-day cash planning, a seven-day scenario calculator and transaction audit records. Open purchase orders and planned expenses also reserve funds in ProfitShield; open-order quantities count as incoming stock.

The local forecasting and calculated advisor remain available without a key. OpenAI mode requires **your own** `OPENAI_API_KEY` and `OPENAI_MODEL` on the server. No private API key is supplied with this project. The connected advisor is read-only, requires explicit sharing consent, and sends the question plus a computed business snapshot. It cannot place orders, post payments or alter records. No live OpenAI request was verified with real credentials in the implementation environment; mocked integration checks are distinct from a live account test.

Read [V3-OPERATIONS.md](V3-OPERATIONS.md) before demonstrating these workflows. Use [VERIFICATION.md](VERIFICATION.md) for the release's actual test evidence; a feature description is not a claim of production readiness.

## Run locally

Requires Node.js 22.12+ and npm. From this folder:

```powershell
npm install
npm run build
npm start
```

Open **http://127.0.0.1:3001**. For local development, the fallback owner password is `smartbiz-owner`. Set `AUTH_PASSWORD` before shared or public use.

For frontend development, use `npm run dev` and open the Vite URL, normally http://127.0.0.1:5173. The API runs on port 3001. `npm test` runs the automated domain, transaction, API and authentication checks. `npm run build` also checks TypeScript.

The built frontend is served by Express. `npm start` executes the TypeScript backend using tsx; it needs the installed development dependencies. Do not use `npm ci --omit=dev` for this MVP.

Local mode uses pg-mem plus an atomic JSON snapshot at `data/shop.json`, saved after every successful mutation. It survives normal restarts. Use only **one server process** with this mode. For a fresh workspace, stop the server, move `data/shop.json` to a backup location, and restart. Never use local JSON storage for real business data without an independent backup policy.

For a private owner password, set an environment variable before starting:

```powershell
$env:AUTH_PASSWORD = 'your-private-owner-password'
npm start
```

To turn on the connected advisor, copy `.env.example` to `.env`, add your own `OPENAI_API_KEY` and `OPENAI_MODEL`, then restart the server. `.env` is read on the server only and is ignored by Git. Never paste a key into the browser, source code, or a chat message. Owner sessions use random tokens in HttpOnly, SameSite=Strict cookies, expire after eight hours, and reset on server restart. Login attempts are throttled in memory. This server binds to loopback. Public deployment requires HTTPS, secure cookies, a production session store, roles, hosting-origin configuration and operational hardening.

## PostgreSQL mode

Docker Compose is supplied for PostgreSQL 17. If Docker is installed:

```powershell
docker compose up -d
$env:DATABASE_URL = 'postgres://smartbiz:smartbiz@localhost:5432/smartbiz'
npm start
```

Without Docker, create a PostgreSQL database and supply its URL instead. The application creates its table and seeds an empty database automatically. Local JSON and PostgreSQL are separate datasets; switching modes does not import local data. To return to local mode, remove `DATABASE_URL` from the shell environment.

**Storage architecture:** this MVP deliberately uses one `shop` row with a version and JSONB aggregate. PostgreSQL locks it with `SELECT ... FOR UPDATE`, mutates a cloned state, and commits all affected records together. This trades reporting scalability for a simple, auditable single-shop transaction boundary. Domain entities inside it include products, batches, parties, offers, events, decisions, purchase orders, planned expenses, reconciliation records, tasks and audit entries. This is a PostgreSQL backend, but it is **not a normalized relational schema**. Normalized tables, foreign keys, migrations and per-shop locking are the next production architecture step. Never run schema experimentation against a real business database.

The local adapter explicitly restores its database backup on failure because pg-mem does not reproduce all PostgreSQL transaction semantics. Tests exercise this path. Native PostgreSQL execution was not verified in the implementation environment because no PostgreSQL/Docker service was available.

## Implemented workflows

| Area           | Working behavior                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview       | Recorded revenue, net profit, funds, receivables, sales chart, low stock and expiry alerts                                                      |
| POS            | Product/barcode text search, quantities, invoice discount, cash or grouped digital account, partial payment, credit customer, printable receipt |
| Inventory      | Product creation, batch purchase receiving, stock levels and purchase history                                                                   |
| Expiry         | FEFO checkout, expired stock blocked, conservative per-batch unsold estimate, explicit write-offs                                               |
| Parties        | Customer/supplier creation, outstanding dues and partial collections/payments                                                                   |
| Accounts       | Separate cash and grouped bank/UPI/card balances, movements, owner investment                                                                   |
| Expenses / P&L | Operating costs, batch COGS, inventory value, write-offs, gross and net profit                                                                  |
| Suppliers      | Editable quotations through append-only offer creation, MOQ, lead time, shelf life and per-product delivery fee                                 |
| ProfitShield   | Budget and reserve input, forecast, incoming approved quantities, offer comparison, explainability, approve/reject/cancel/receive               |
| PurchaseGuard  | Immutable recommendation snapshot and batch-linked observed received/sold/remaining/write-off metrics                                           |
| Reliability    | Input validation, parameterized SQL, atomic transactions, stock concurrency protection and sale request deduplication                           |
| Operations     | Purchase orders, stock counts, reconciliation records, planned expenses, tasks, cash planning, scenarios and audit review                       |
| Connected AI   | Optional read-only OpenAI explanation of a computed snapshot; local mode remains available without credentials                                  |
| Export         | Authenticated complete JSON backup export                                                                                                       |

## Accounting rules

All money is stored as integer paise. Quantities are whole units (the unit label is configurable). Prices are tax-exclusive. GST is disabled by default; enable it in Business settings only after configuring the business identity and each product rate. The app computes per-line tax after discount, displays CGST/SGST or IGST according to the selected sale type, and excludes tax from revenue. Rates are user-configured; no claim of statutory compliance, GSTN authentication or automatic rate classification is made.

- Net sales = sales after invoice discounts, excluding GST and net of recorded returns.
- COGS = exact unit costs from the FEFO batches allocated to each sale.
- Gross profit = net sales − COGS.
- Net profit = gross profit − operating expenses − stock write-offs.
- Inventory = remaining units × recorded batch cost, including expired units until explicitly written off.
- Purchases add stock and supplier obligations; paying a purchase does not expense its merchandise cost.
- Delivery fees are recognized immediately as expense, while their payment is included exactly once in the purchase payment.
- Receivables grow on credit sales; collections reduce dues and increase money without creating new revenue.
- Supplier settlements reduce dues and money without creating another expense.
- Owner investments increase money without creating revenue.
- Creating a purchase order reserves a commitment without receiving stock, creating supplier dues or moving cash. Receiving it posts the purchase lines atomically; unpaid amounts become supplier dues.
- Planned expenses reserve funds without affecting profit until paid. Payment creates one expense event and releases the plan's commitment.
- Stock-count shortages use write-off costs. Count surpluses increase batch quantity at its existing cost as an inventory correction; they are not reported as sales profit.
- Account closing records expected balance, physically counted balance and discrepancy. Recording a difference does not silently change cash or profit.

History is append-only through the exposed API. Write-offs are explicit events; existing invoices cannot be edited. Fully paid, batch-linked invoices can be fully returned once, with cash refund and original stock/COGS/tax reversal. Seed invoices without batch allocations cannot be reversed. Partial and credit-sale returns, bill-wise collection allocation, purchase returns, a complete double-entry general ledger, GST remittance/filing, inventory revaluation and accounting period close are deferred. These require additional accounting workflows rather than editing historical records.

Seeded historical sales have illustrative COGS; current batches are a separate present-day opening-stock snapshot. Seed history does not pretend to provide reconstructed historical batch movements. The dashboard reports all recorded periods; the chart reports seven UTC calendar days. Dates and expiry boundaries currently use UTC. A configurable business timezone is a planned improvement.

## ProfitShield algorithm v2

1. Fit and backtest mean versus weekday-shrinkage forecasts over the preceding 28 complete UTC days, counting zero-sales days and netting recorded returns. Select the weekday model only after a sufficient history and at least 5% holdout MAE improvement. Use the selected next-week daily average for purchase sizing. New products start at zero until observations exist.
2. Estimate demand for `horizon + supplier lead time`.
3. Subtract unexpired stock, quantities in approved AI plans awaiting receipt and quantities in open purchase orders.
4. Cap new units by expected shelf-life demand after existing/incoming stock; enforce MOQ and positive contribution after delivery fee.
5. Reserve **all** supplier dues, configured net GST liability, an owner cash buffer, and spending committed in other approved plans, open purchase orders and planned expenses. Available budget is capped by actual funds after those deductions.
6. Rank product opportunities by approximate contribution, then choose an affordable supplier option using its effective unit cost. This greedy method is explainable but not globally optimal. Fees apply per product line, not per combined supplier shipment.
7. Store the full snapshot, alternatives, chosen offer, quantities, assumptions and reasoning. The owner approves or rejects it. Approved plans count as incoming stock and cash commitments. Canceling approval releases the commitment.
8. On physical receipt, recalculate the plan and reject stale quantity/spend allocations. Recheck cash reserves, create paid purchase events and new batches, and link them to the decision. Receipt requires enough funds in one account per product line. The UI does not send orders or transfer real money.

Lead time influences planning but the MVP does not run delivery scheduling or enforce a waiting period. Supplier shelf life is assumed to begin on actual receipt. Forecasts lack calibrated confidence intervals, stockout corrections, festival/monthly seasonality and demand-elasticity modeling. The current fitted weekday effects address only weekly patterns. No Python service is needed for this baseline; a FastAPI service is deliberately deferred until data and validation justify an ML model.

PurchaseGuard measures observed outcomes only. It currently accumulates lifetime outcomes and shows elapsed days; it does not freeze metrics at the horizon cutoff. Observed margin is sale-line revenue minus batch costs **before invoice discounts, fees and operating expenses**. Exact decision profitability, counterfactual savings and causal attribution are not claimed.

## Product imagery and inspiration

The six branded product references use retailer-hosted pack photographs with product source links. Owners can replace a reference photo in Inventory → Product studio. See [IMAGE_ASSETS.md](IMAGE_ASSETS.md) for source notes and image behavior.

Common professional workflows were informed by [myBillBook’s published feature overview](https://mybillbook.in/s/business-management-software/). This app is independently implemented and is not a myBillBook integration or feature-equivalent replacement. Real payment processing, WhatsApp/SMS sending, camera scanning, e-invoice/e-way bill authentication, offline synchronization, staff permissions and production security remain later phases. Reminder actions copy a draft only.

## Testing and user guide

See [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) for a complete walkthrough. Automated tests cover FEFO/expired batches, invoice discounts, credit settlement, supplier settlement, fee accounting, write-offs, duplicate requests, purchase constraints, approval/receipt/replay, transaction rollback, concurrent stock access, invalid API requests and authenticated sessions.

## Realistic next phases

1. **Accounting and data foundation:** normalized relational schema, versioned migrations, verified statutory tax treatments and rounding, partial/credit/purchase returns, accountant-reviewed stock-variance postings, configurable business timezone, advanced reconciliation, verified backup restore and account-specific UPI/card settlement.
2. **Operational security:** staff roles, durable authentication/session storage, password lifecycle, permissioned approvals, externally anchored audit verification, HTTPS deployment, backup/restore drills and PostgreSQL integration tests in CI.
3. **Research evaluation:** chronological train/validation/test split; compare reorder-threshold, forecast-only and ProfitShield policies using a reproducible simulator with common demand traces, delivery delays and FEFO expiry. Report fulfilled demand, stockouts, expired cost, realized net contribution, capital tied up, cash violations and MAE/WAPE. Never report simulated savings as observed shop savings.
4. **ML service:** Python/FastAPI for seasonal and intermittent demand models, category cold-start priors and empirical intervals; benchmark against the current baseline and retain a deterministic fallback.
5. **Advanced product:** recurring expense schedules, partial purchase-order receiving, supplier tax/landed-cost allocation, verified OCR, loyalty, broader supported-language advisor evaluation, anomaly review, offline idempotent synchronization and multi-shop isolation. No inactive placeholder screens are presented as working features.

The supplied original specification is preserved in [SPECIFICATION.txt](SPECIFICATION.txt).

Implementation references: [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite), [pg-mem adapters](https://github.com/oguimbal/pg-mem/wiki/Libraries-adapters).

OpenAI integration references: [Responses text generation](https://developers.openai.com/api/docs/guides/text), [API quickstart](https://developers.openai.com/api/docs/quickstart).
