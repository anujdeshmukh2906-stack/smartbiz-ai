import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  seed,
  mutate,
  day,
  shift,
  metrics,
  balances,
  recommend,
  approve,
  receive,
  replay,
} from "../server/domain.ts";
import { createStore } from "../server/store.ts";
import { createApp } from "../server/app.ts";
test("approved plans reserve incoming stock and cash; cancellation releases both", () => {
  const s = seed(),
    d = recommend(s, 200000, 10000, 7);
  s.decisions.push(d);
  approve(s, d.id, "approved");
  const second = recommend(s, 200000, 10000, 7);
  for (const x of second.items) {
    const first = d.items.find((y) => y.productId === x.productId)!;
    assert.equal(x.stock, first.stock + first.qty);
  }
  approve(s, d.id, "rejected");
  const third = recommend(s, 200000, 10000, 7);
  assert.deepEqual(
    third.items.map((x) => x.qty),
    d.items.map((x) => x.qty),
  );
});
test("stock changes invalidate an approved purchase snapshot before receipt", () => {
  const s = seed(),
    d = recommend(s, 200000, 10000, 7);
  s.decisions.push(d);
  approve(s, d.id, "approved");
  mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 2 }],
    paid: 13600,
    account: "cash",
  });
  assert.throws(() => receive(s, d.id), /changed/);
});
test("offer choice falls back to a feasible MOQ when a cheaper supplier is unaffordable", () => {
  const s = seed();
  s.products = s.products.filter((p) => p.id === "p1");
  s.batches = [];
  s.offers = [
    {
      id: "cheap",
      productId: "p1",
      supplierId: "s1",
      cost: 100,
      moq: 24,
      lead: 1,
      shelf: 30,
      fee: 0,
    },
    {
      id: "small",
      productId: "p1",
      supplierId: "s2",
      cost: 110,
      moq: 6,
      lead: 1,
      shelf: 30,
      fee: 0,
    },
  ];
  const d = recommend(s, 1000, 0, 7);
  assert.equal(d.items[0].offer.id, "small");
  assert.equal(d.items[0].qty, 9);
  assert.equal(d.items[0].spend, 990);
});
test("PurchaseGuard attributes FEFO sales to the actual recommended batch", () => {
  const s = seed();
  s.batches = [];
  const d = recommend(s, 200000, 0, 7);
  s.decisions.push(d);
  approve(s, d.id, "approved");
  receive(s, d.id);
  const batch = s.batches.find((b) => b.decisionId === d.id)!,
    p = s.products.find((p) => p.id === batch.productId)!;
  mutate(s, "sale", {
    lines: [{ productId: p.id, qty: 1 }],
    paid: p.price,
    account: "cash",
  });
  const r = replay(s, d);
  assert.equal(r.sold, 1);
  assert.equal(r.realizedMargin, p.price - batch.cost);
  assert.equal(r.remaining, r.received - 1);
});
function clean() {
  const s = seed();
  s.events = [];
  s.parties.forEach((p) => (p.due = 0));
  return s;
}
test("FEFO allocates earliest valid batch and recognizes actual costs, never expired stock", () => {
  const s = clean();
  s.batches = [
    {
      id: "expired",
      code: "X",
      productId: "p1",
      qty: 100,
      cost: 100,
      expiry: shift(-1),
    },
    {
      id: "later",
      code: "L",
      productId: "p1",
      qty: 8,
      cost: 4000,
      expiry: shift(8),
    },
    {
      id: "early",
      code: "E",
      productId: "p1",
      qty: 2,
      cost: 3000,
      expiry: day(),
    },
  ];
  const e = mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 4 }],
    paid: 27200,
    account: "cash",
  });
  assert.equal(e.cost, 14000);
  assert.equal(s.batches[0].qty, 100);
  assert.equal(s.batches[2].qty, 0);
  assert.equal(s.batches[1].qty, 6);
  assert.equal(metrics(s).gross, 13200);
});
test("credit collections affect cash and dues without recognizing revenue twice", () => {
  const s = clean(),
    cash = balances(s).cash;
  mutate(s, "sale", {
    lines: [{ productId: "p1", qty: 2 }],
    paid: 3600,
    discount: 1000,
    partyId: "c1",
    account: "cash",
  });
  assert.equal(metrics(s).customerDues, 9000);
  const profit = metrics(s).net;
  mutate(s, "customer-payment", { partyId: "c1", paid: 4000, account: "cash" });
  assert.equal(metrics(s).customerDues, 5000);
  assert.equal(metrics(s).net, profit);
  assert.equal(balances(s).cash, cash + 7600);
});
test("purchase is an asset, fees expense once, settlement does not reduce profit", () => {
  const s = clean(),
    before = metrics(s);
  mutate(s, "purchase", {
    productId: "p1",
    partyId: "s1",
    qty: 10,
    cost: 4000,
    fee: 1000,
    code: "NEW",
    expiry: shift(10),
    paid: 10000,
    account: "bank",
  });
  assert.equal(metrics(s).inventory, before.inventory + 40000);
  assert.equal(metrics(s).net, -1000);
  assert.equal(metrics(s).supplierDues, 31000);
  mutate(s, "supplier-payment", {
    partyId: "s1",
    paid: 31000,
    account: "bank",
  });
  assert.equal(metrics(s).net, -1000);
  assert.equal(balances(s).bank, before.balances.bank - 41000);
});
test("idempotent sale retries do not consume stock twice; altered duplicate is rejected", () => {
  const s = clean(),
    b = {
      key: randomUUID(),
      lines: [{ productId: "p1", qty: 1 }],
      paid: 6800,
      account: "cash",
    };
  const a = mutate(s, "sale", b);
  assert.equal(mutate(s, "sale", b).id, a.id);
  assert.equal(s.events.length, 1);
  assert.throws(() => mutate(s, "sale", { ...b, paid: 0 }));
});
test("write-off removes inventory and records loss, without a cash movement", () => {
  const s = clean(),
    cash = balances(s);
  const batch = s.batches[0],
    cost = batch.cost * 2;
  mutate(s, "writeoff", { batchId: batch.id, qty: 2, note: "Damage" });
  assert.equal(metrics(s).net, -cost);
  assert.deepEqual(balances(s), cash);
});
test("ProfitShield respects budget, reserved obligations, MOQ, expiry and profitability", () => {
  const s = seed();
  s.parties.find((p) => p.id === "s1")!.due = 100000;
  const d = recommend(s, 60000, 100000, 7);
  assert.ok(d.items.reduce((a, x) => a + x.spend, 0) <= 60000);
  for (const x of d.items.filter((x) => x.qty)) {
    assert.ok(x.qty >= x.offer.moq);
    assert.ok(x.qty <= x.offer.expiryCap);
    assert.ok(x.offer.margin > 0);
  }
  assert.equal(
    recommend(s, 60000, 999999999, 7).items.reduce((a, x) => a + x.qty, 0),
    0,
  );
});
test("replay follows received batches and blocks repeated receipt", () => {
  const s = seed(),
    d = recommend(s, 200000, 10000, 7);
  s.decisions.push(d);
  assert.throws(() => receive(s, d.id));
  approve(s, d.id, "approved");
  receive(s, d.id);
  const r = replay(s, d);
  assert.ok(r.received > 0);
  assert.equal(r.sold, 0);
  assert.equal(r.received, r.remaining);
  const batch = s.batches.find((b) => b.decisionId === d.id)!;
  mutate(s, "writeoff", { batchId: batch.id, qty: 1, note: "Damaged" });
  assert.equal(replay(s, d).waste, batch.cost);
  assert.throws(() => receive(s, d.id));
});
test("transaction rolls back all stock and ledger changes after a later line fails", async () => {
  const store = await createStore({ test: true });
  try {
    const before = await store.read();
    await assert.rejects(
      store.transaction((s) =>
        mutate(s, "sale", {
          lines: [
            { productId: "p1", qty: 1 },
            { productId: "p2", qty: 99999 },
          ],
          paid: 0,
          partyId: "c1",
        }),
      ),
    );
    assert.deepEqual(await store.read(), before);
  } finally {
    await store.close();
  }
});
test("concurrent checkouts cannot oversell available stock", async () => {
  const store = await createStore({ test: true });
  try {
    await store.transaction((s) => {
      s.batches = s.batches.filter((b) => b.productId !== "p1");
      s.batches.push({
        id: "one",
        productId: "p1",
        code: "ONE",
        qty: 1,
        cost: 100,
        expiry: shift(5),
      });
    });
    const result = await Promise.allSettled(
      [1, 2].map(() =>
        store.transaction((s) =>
          mutate(s, "sale", {
            lines: [{ productId: "p1", qty: 1 }],
            paid: 6800,
          }),
        ),
      ),
    );
    assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (await store.read()).batches.find((b) => b.id === "one")!.qty,
      0,
    );
  } finally {
    await store.close();
  }
});
test("API rejects invalid quantities and executes an end-to-end credit sale", async () => {
  const store = await createStore({ test: true }),
    server = createApp(store, { auth: false }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address() as { port: number },
    url = `http://127.0.0.1:${address.port}`;
  const post = (body: any) =>
    fetch(url + "/api/actions/sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    const invalid = await post({
      lines: [{ productId: "p1", qty: -1 }],
      paid: 0,
      account: "cash",
      key: randomUUID(),
    });
    assert.equal(invalid.status, 400);
    const ok = await post({
      lines: [{ productId: "p1", qty: 1 }],
      paid: 0,
      partyId: "c1",
      account: "cash",
      key: randomUUID(),
    });
    assert.equal(ok.status, 200);
    const e = (await ok.json()) as any;
    assert.equal(e.total, 6800);
    assert.equal(e.paid, 0);
    const state = (await (await fetch(url + "/api/state")).json()) as any;
    assert.equal(state.batches.find((b: any) => b.id === "b0").qty, 8);
  } finally {
    server.close();
    await store.close();
  }
});
test("owner login protects records with an HttpOnly session and logout invalidates it", async () => {
  const store = await createStore({ test: true }),
    server = createApp(store).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(url + "/api/state")).status, 401);
    const response = await fetch(url + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: process.env.AUTH_PASSWORD ?? "smartbiz-owner",
      }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!;
    assert.ok(cookie.includes("HttpOnly"));
    assert.equal(
      (await fetch(url + "/api/state", { headers: { cookie } })).status,
      200,
    );
    await fetch(url + "/api/logout", { method: "POST", headers: { cookie } });
    assert.equal(
      (await fetch(url + "/api/state", { headers: { cookie } })).status,
      401,
    );
  } finally {
    server.close();
    await store.close();
  }
});
