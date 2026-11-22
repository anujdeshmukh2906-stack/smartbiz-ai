# Five-minute workspace walkthrough

1. Start the app and sign in with `smartbiz-owner` (or your configured owner password). The overview contains sample historical sales and current opening stock.
2. Open **Billing / POS**, select milk, choose Ananya Sharma, enter `0` as the amount paid and complete the sale. Inventory falls using the earliest unexpired batch; customer dues rise; revenue and COGS are recognized; cash stays unchanged. Print the receipt if desired.
3. Open **Customers & suppliers**, collect ₹68 from Ananya using cash. Receivables fall and cash rises. Net profit is unchanged. This demonstrates the difference between profit and cash.
4. In **Inventory**, receive a purchase from a supplier with less paid than its total. Verify stock and supplier dues rise. Use the party screen to settle part of the supplier balance.
5. In **Expenses**, record a small delivery or electricity cost. Verify it lowers both available money and net profit.
6. Open **Expiry manager** to inspect batches and projected unsold units. Write off a batch only when it is no longer sellable. The loss affects profit and stock, with no new cash outflow.
7. Open **ProfitShield AI**, use a ₹10,000 maximum budget, ₹5,000 reserve and seven-day horizon. Generate a plan. Inspect forecasts, existing plus approved incoming stock, supplier alternatives stored in the backup, MOQ, shelf-life limits, planned spending and explanations.
8. Approve a nonzero plan, then confirm physical receipt and payment. No real supplier order or bank transfer occurs. Stock and accounting entries are recorded locally. A second receipt is blocked.
9. Open **PurchaseGuard Replay**: received and remaining units are now visible. Sell or write off the linked batch to accumulate observed outcomes. Older batches are sold first under FEFO, so the linked batch may not sell immediately. Do not claim a savings result from a just-received plan.
10. Export the JSON backup. Restart the server and sign in again to confirm normal persistence. Authentication sessions reset on restart.

Try a very large reserve to demonstrate a zero-allocation plan. Try a sale larger than usable stock to demonstrate atomic rejection. Generate a plan, change stock, and attempt to receive the approved old plan to demonstrate stale-plan checks; cancel and regenerate it when rejected.

The purchase policy is designed to balance availability, wastage and available cash against simple reorder thresholds. Controlled evaluation with a real dataset remains a future improvement.
