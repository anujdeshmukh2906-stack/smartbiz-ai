# Operations edition

This edition connects routine shop operations to the existing stock and financial records. It is designed for a single shop and does not claim feature parity with every commercial billing product or production deployment readiness.

## Workflows and accounting boundaries

### Purchase orders

Create a supplier order with one or more product lines, quantities, unit costs and an expected delivery date. Creation records a commitment; it does not change current inventory, supplier dues, cash or profit. Open order quantities count as incoming inventory in ProfitShield and their full costs are reserved in purchasing and cash planning.

Receive an order after entering batch codes, expiry dates, the amount paid and the payment account. All order lines are received together in one store transaction. Received quantities create batches, payments reduce the selected account, and unpaid purchase costs become supplier dues. A later line failing validation must not leave earlier lines posted. An order is received once or cancelled while still open. Purchase-order creation accepts an idempotency key; a changed request must use a new key.

The current workflow handles full receiving, not partial deliveries. Unit costs are the agreed costs captured on the order. Supplier GST/input-tax credits, freight allocation, supplier returns and order amendments need further accounting workflows. These orders are local records; the application does not send orders to suppliers or transfer money to a bank.

### Stock counts

Choose a batch, enter the physically counted whole-unit quantity and give a reason. A shortage posts a write-off using the recorded unit cost. A surplus records a stock-found correction at that cost. Neither creates a cash movement. Surpluses are inventory corrections and are not included as sales profit; an accountant-reviewed general-ledger treatment is a later extension.

Expired stock remains blocked from checkout even after a count correction. Repeated count requests use the same key to avoid applying an adjustment twice. A count matching recorded stock needs no correction.

### Account closing

Record a counted cash or bank amount and a reconciliation note. The record captures the expected balance at that moment, the counted amount, and their difference. It is a discrepancy for review, not an automatic change to the ledger. A zero discrepancy confirms agreement with recorded movements. Investigate differences before posting a separate correction.

### Planned expenses and cash planning

Add an expense title, expected payment date and amount. A planned expense reserves money without immediately reducing profit. Marking it paid posts a single operating-expense event from the chosen account; cancellation releases an unposted plan.

The 30-day planner is a conservative outflow scenario:

- Current supplier dues, configured net GST liability and approved AI purchase commitments are reserved immediately.
- Planned expenses and full open purchase-order costs reduce the scenario balance on their dates; overdue dates are treated as today.
- Future sales and customer collections are not assumed. Receivables are shown separately.
- Commitments beyond 30 days affect total reserved funds but appear outside the displayed calendar.

This is not a prediction that the bank balance will exactly match the scenario. It does not infer payment deadlines for aggregate supplier balances, future income, or missing expenses. A planned expense and a separate record of the same obligation can double-count a reserve; record each commitment once.

### Tasks, what-if scenarios and audit review

Dated business tasks support a simple open/done workflow. They are local task records, not scheduled notifications or messages.

The what-if calculator uses a seven-day forecast, a proposed selling price, one assumed unit cost, an order quantity and a user-entered demand change. It calculates possible units sold, contribution, purchase spend, remaining units and unmet demand. Changing assumed demand is not learned price elasticity. The scenario excludes tax, fees, batch expiry, actual mixed batch costs and operating expenses. It changes no stock or financial records.

Store mutations append versioned audit entries with an actor label, action, timestamp, state digest and previous-entry hash. The review API exposes the latest 200 entries and a verification result. The current owner is recorded as `owner`; staff identities and role permissions are not implemented. A local hash chain is a review aid, not protection against a database administrator who can rewrite both records and hashes. Production audit assurance needs external anchoring, durable identities and protected storage. Read-only previews and scenarios do not create financial events.

## AI modes

Local statistical forecasting still fits sales history, backtests mean versus weekday effects, and feeds ProfitShield's constrained allocator. The local calculated advisor supports profit, cash, dues and expiry questions without any external service.

Optional OpenAI mode uses the Responses API for a broader explanation of the computed snapshot. The model is read-only and has no transaction tools. It cannot approve an order, change prices, create bills or post payments. Review AI interpretation against the returned figures and assumptions.

No private API key is included or supplied by Codex. Configure your own account credentials on the server. Do not enter a key in frontend code, a product field, a screenshot or this chat.

In PowerShell 7, set the environment before starting the server:

```powershell
$env:OPENAI_API_KEY = Read-Host 'Your OpenAI API key' -MaskInput
$env:OPENAI_MODEL = '<a Responses-compatible model your account can access>'
npm start
```

Model access and API billing belong to the configured account. The application does not choose a substitute model or borrow another account's credentials. Missing either variable leaves OpenAI mode unconfigured; local mode remains available. Restart the server after changing its environment. The current `.env.example` is a reference, not an automatically loaded secrets file; follow the release's setup instructions if startup behavior changes.

Before a connected request, confirm sharing the question and computed shop context with OpenAI. The automatic context includes accounting totals, cash-planning figures, internal product/batch IDs, prices, quantities and expiry exposure. It does not automatically add customer names, phone numbers, addresses, invoice notes or product photos. The typed question itself is sent as entered. “Aggregate” or contact-free context is not a guarantee of anonymity if its contents can be linked to other data.

The key stays in the backend environment and is not returned to the browser or saved in the shop snapshot. Requests use `store: false`, a bounded output length, a timeout, and a small local request limit. Disabling response storage is not a promise of zero provider retention; consult the configured account's OpenAI data controls. Network/model/billing failures are reported rather than being disguised as successful OpenAI answers.

Live OpenAI execution has not been verified with real credentials in this implementation environment. Mocked request tests can verify request shape and error handling; they do not establish actual model access, billing, answer quality or production availability.

## Authenticated API reference

All paths below are under `/api/operations` and require the existing owner session. Financial amounts are integer INR paise and quantities are whole units. Validation rejects unsupported values. No endpoint initiates a real external payment.

| Method | Path                      | Purpose                                                                                                            |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/`                       | Read orders, plans, closings, tasks, recent audit entries, verification, cash scenario and AI configuration status |
| POST   | `/orders`                 | Create a supplier order using `supplierId`, `expected`, UUID `key` and product/quantity/cost `lines`               |
| POST   | `/orders/:id/receive`     | Receive all lines with `paid`, `account` and per-product batch `code`/`expiry`                                     |
| POST   | `/orders/:id/cancel`      | Cancel an open order                                                                                               |
| POST   | `/stock-count`            | Record `batchId`, `counted`, `reason` and UUID `key`                                                               |
| POST   | `/closing`                | Capture `account`, `counted` and reconciliation `note`                                                             |
| POST   | `/obligations`            | Create a planned expense with `title`, `dueDate` and `amount`                                                      |
| POST   | `/obligations/:id/pay`    | Post a planned expense from `account`                                                                              |
| POST   | `/obligations/:id/cancel` | Cancel an unpaid plan                                                                                              |
| POST   | `/tasks`                  | Create a task with `title` and `dueDate`                                                                           |
| POST   | `/tasks/:id`              | Set task `done` status                                                                                             |
| POST   | `/advisor`                | Ask a `question` using `local` or `openai`; connected mode requires `consent: true`                                |
| POST   | `/simulate`               | Calculate a scenario from `productId`, `price`, `cost`, `orderQty` and assumed `demandChange`                      |

## Verification and deployment scope

Run `npm test` and `npm run build` from this project folder. Read [VERIFICATION.md](VERIFICATION.md) for the release's recorded results rather than assuming the existence of an API proves verification.

Local mode uses pg-mem plus the persisted JSON snapshot and should run in one server process. PostgreSQL support uses one locked JSONB aggregate row, not normalized relational tables. Native PostgreSQL integration was not available for verification in the implementation environment. Public deployment still needs HTTPS, durable sessions, staff authorization, account isolation, backups/restores, operational monitoring and native-database CI coverage.

References: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart), and the [project README](README.md).
