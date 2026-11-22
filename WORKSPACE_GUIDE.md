# Professional workspace walkthrough

1. Sign in at http://127.0.0.1:3001 with `smartbiz-owner` or your configured owner password.
2. **Billing / POS:** browse category tabs and standard product renders. Add an item; a server-side preview validates available stock and calculates the exact payable total. Complete the sale and inspect the numbered A4 invoice. Print / Save PDF opens the browser's print dialog.
3. **Invoices & returns:** search by invoice/customer, filter dates/payment status, and page through results. View an invoice to reprint it. A fully paid non-seed invoice can be returned once; review the cash refund and stock restoration before confirming. Partial and credit-sale returns are deliberately blocked.
4. **Inventory → Product studio:** choose a product, replace its image with a PNG/JPG/WebP, and edit price, unit, HSN or configured GST rate. Historical invoices retain their issued values.
5. **Business settings:** edit the business identity, invoice prefix and terms. GST remains off by default. Enabling it requires a GSTIN in the expected format; format validation does not verify registration. Product rates are your configuration, not an automatic classification.
6. **Quotations:** create an estimate, view/print it, then convert it into POS. A quote changes no stock or money. Actual invoicing rechecks stock and quoted pricing/taxes; a quote cannot be invoiced twice.
7. **Customers & suppliers:** add contact details and a customer credit limit. Copy a customer reminder draft; the app does not send messages.
8. **Cashbook:** record an internal cash-to-bank transfer. Combined funds and profit stay unchanged.
9. **Reports & statements:** choose a period, inspect product profitability and party activity, then download CSV. Financial columns ending `_INR` are in rupees. Current party balances are aggregate balances, not historical invoice-level allocations.
10. **AI insights:** inspect the selected model, seven/thirty-day forecasts and holdout errors. A mean fallback is expected when weekday fitting does not outperform it. Ask supported questions about profit, funds, dues or expiry exposure and inspect the answer's sources and limitations.
11. **ProfitShield:** generate a plan. It now reserves net configured GST liability as well as dues, approved commitments and your cash buffer. Approval and replay continue to use linked batch records.

Use **Ctrl K** to find a page or product quickly. Export a complete JSON backup from the sidebar before experimenting with data you want to preserve. The source archive excludes runtime data and starts fresh.
