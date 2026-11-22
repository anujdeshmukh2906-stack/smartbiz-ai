import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  seed,
  mutate,
  metrics,
  balances,
  recommend,
  day,
  shift,
} from "../server/domain.ts";
import { upgrade, professionalAction, csv } from "../server/professional.ts";
import { forecast } from "../server/forecast.ts";
import { createStore } from "../server/store.ts";
import { createApp } from "../server/app.ts";
function clean() {
  const s = upgrade(seed());
  s.events = [];
  s.parties.forEach((p) => (p.due = 0));
  return s;
}
test("GST is charged after discounts, excluded from profit, and fully included in receivables", () => {
  const s = clean();
  s.settings!.gstEnabled = true;
  s.products[0].gstRate = 18;
  const e = mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 2 }],
    discount: 1000,
    paid: 0,
    partyId: "c1",
    account: "cash",
  });
  assert.equal(e.subtotal, 12600);
  assert.equal(e.tax, 2268);
  assert.equal(e.total, 14868);
  assert.equal(metrics(s).revenue, 12600);
  assert.equal(metrics(s).customerDues, 14868);
  assert.equal(metrics(s).gross, 12600 - e.cost);
  assert.equal(metrics(s).taxCollected, 2268);
});
test("invoice snapshots survive edits to product names and business identity", () => {
  const s = clean();
  const e = mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 1 }],
    paid: 6800,
  });
  s.products[0].name = "Changed name";
  s.settings!.name = "Changed business";
  assert.equal(e.lines[0].name, "Whole milk 1L");
  assert.equal(e.business!.name, "Green Basket");
  assert.match(e.invoiceNo!, /^SB-\d{4}-\d{5}$/);
});
test("full paid invoice return reverses stock, cash, COGS, revenue and tax once", () => {
  const s = clean(),
    before = structuredClone(s);
  s.settings!.gstEnabled = true;
  s.products[0].gstRate = 18;
  const e = mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 1 }],
    paid: 8024,
    account: "cash",
    interstate: true,
  });
  const returned = professionalAction(s, "sale-return", {
    saleId: e.id,
    account: "cash",
    note: "Unopened item",
    key: randomUUID(),
  });
  assert.equal(returned.taxMode, "IGST");
  assert.equal(metrics(s).revenue, 0);
  assert.equal(metrics(s).cogs, 0);
  assert.equal(metrics(s).taxCollected, 0);
  assert.deepEqual(balances(s), balances(before));
  assert.deepEqual(s.batches, before.batches);
  assert.throws(
    () =>
      professionalAction(s, "sale-return", {
        saleId: e.id,
        account: "cash",
        note: "Again",
        key: randomUUID(),
      }),
    /already/,
  );
});
test("credit-sale returns reject unsupported allocation instead of corrupting dues", () => {
  const s = clean();
  const e = mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 1 }],
    paid: 1000,
    account: "cash",
    partyId: "c1",
  });
  assert.throws(
    () =>
      professionalAction(s, "sale-return", {
        saleId: e.id,
        account: "cash",
        note: "Return",
        key: randomUUID(),
      }),
    /fully paid/,
  );
  assert.equal(metrics(s).customerDues, 5800);
});
test("account transfers conserve total funds and never change profit", () => {
  const s = clean(),
    before = balances(s);
  professionalAction(s, "transfer", {
    paid: 50000,
    account: "cash",
    key: randomUUID(),
  });
  assert.equal(balances(s).cash, before.cash - 50000);
  assert.equal(balances(s).bank, before.bank + 50000);
  assert.equal(metrics(s).net, 0);
});
test("tax reserve prevents ProfitShield spending money earmarked for GST", () => {
  const s = seed();
  upgrade(s);
  const before = recommend(s, 99999999, 0, 7).available;
  s.events.push({
    id: "tax-invoice",
    at: new Date().toISOString(),
    type: "sale",
    total: 100000,
    subtotal: 0,
    tax: 100000,
    paid: 0,
    account: "cash",
    cost: 0,
    lines: [],
    note: "Tax reserve fixture",
  });
  const after = recommend(s, 99999999, 0, 7).available;
  assert.equal(before - after, 100000);
});
test("weekday model is selected only after outperforming baseline on chronological holdout", () => {
  const s = clean();
  for (let i = 28; i >= 1; i--) {
    const d = shift(-i),
      qty = new Date(d + "T00:00:00Z").getUTCDay() === 0 ? 20 : 2;
    s.events.push({
      id: "train-" + i,
      at: d + "T12:00:00Z",
      type: "sale",
      total: qty * 6800,
      paid: qty * 6800,
      account: "cash",
      cost: 0,
      lines: [{ productId: "p1", qty }],
      note: "",
    });
  }
  const f = forecast(s, "p1");
  assert.equal(f.model, "weekday-shrinkage");
  assert.ok(f.mae < f.baselineMae);
  const future = {
    ...s.events[0],
    at: shift(10) + "T12:00:00Z",
    lines: [{ productId: "p1", qty: 99999 }],
  };
  s.events.push(future);
  assert.deepEqual(forecast(s, "p1"), f);
});
test("empty sales history produces zero forecast with honest fallback", () => {
  const f = forecast(clean(), "p1");
  assert.equal(f.next7, 0);
  assert.equal(f.next30, 0);
  assert.equal(f.model, "trailing-mean");
  assert.equal(f.wape, null);
});
test("CSV protects spreadsheet formula cells and escapes commas and quotes", () => {
  const result = csv([{ name: '=HYPERLINK("bad")', note: "one,two" }]);
  assert.ok(result.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(result.includes('"one,two"'));
});
test("preview and quotation do not move stock; quotation converts exactly once", async () => {
  const store = await createStore({ test: true }),
    server = createApp(store, { auth: false }).listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const post = async (path: string, b: any) => {
    const r = await fetch(base + "/api/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    return { status: r.status, body: (await r.json()) as any };
  };
  try {
    const before = await store.read();
    const preview = await post("checkout-preview", {
      lines: [{ productId: "p1", qty: 1 }],
      discount: 0,
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.total, 6800);
    assert.deepEqual(await store.read(), before);
    const q = await post("quotations", {
      partyId: "c1",
      dueDate: shift(7),
      note: "Quote",
      lines: [{ productId: "p1", qty: 1 }],
      key: randomUUID(),
    });
    assert.equal(q.status, 200);
    assert.deepEqual((await store.read()).batches, before.batches);
    const invoice = await post("actions/sale", {
      quoteId: q.body.id,
      partyId: "c1",
      lines: [{ productId: "p1", qty: 1 }],
      discount: 0,
      paid: 6800,
      account: "cash",
      key: randomUUID(),
    });
    assert.equal(invoice.status, 200);
    assert.equal((await store.read()).quotes![0].status, "invoiced");
    const second = await post("actions/sale", {
      quoteId: q.body.id,
      partyId: "c1",
      lines: [{ productId: "p1", qty: 1 }],
      discount: 0,
      paid: 6800,
      account: "cash",
      key: randomUUID(),
    });
    assert.equal(second.status, 422);
  } finally {
    server.close();
    await store.close();
  }
});
