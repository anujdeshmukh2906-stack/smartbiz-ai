import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  seed,
  shift,
  day,
  metrics,
  balances,
  recommend,
  approve,
  receive,
  replay,
  type State,
} from "../server/domain.ts";
import { upgrade } from "../server/professional.ts";
import { createStore } from "../server/store.ts";
import {
  createOrder,
  receiveOrder,
  stockCount,
  closeAccount,
  payObligation,
  planning,
  verifyAudit,
} from "../server/operations.ts";
import {
  contextForAdvisor,
  localAnswer,
  openAIAnswer,
} from "../server/advisor.ts";
import { createApp } from "../server/app.ts";

function clean() {
  const s = upgrade(seed());
  s.events = [];
  s.parties.forEach((p) => (p.due = 0));
  return s;
}
function orderInput() {
  return {
    supplierId: "s1",
    expected: shift(2),
    key: randomUUID(),
    lines: [
      { productId: "p1", qty: 3, cost: 4000 },
      { productId: "p2", qty: 2, cost: 8000 },
    ],
  };
}
function receiptInput() {
  return {
    paid: 10000,
    account: "cash",
    lines: [
      { productId: "p1", code: "PO-MILK", expiry: shift(8) },
      { productId: "p2", code: "PO-RICE", expiry: shift(80) },
    ],
  };
}
test("found-stock correction does not invent additional ProfitShield receipts", () => {
  const s = upgrade(seed()),
    d = recommend(s, 200000, 0, 7);
  s.decisions.push(d);
  approve(s, d.id, "approved");
  receive(s, d.id);
  const before = replay(s, d),
    batch = s.batches.find((b) => b.decisionId === d.id)!;
  stockCount(s, {
    batchId: batch.id,
    counted: batch.qty + 3,
    reason: "Count correction",
    key: randomUUID(),
  });
  const after = replay(s, d);
  assert.equal(after.received, before.received);
  assert.equal(after.remaining, before.remaining + 3);
  assert.equal(after.stockFound, 3);
});

test("purchase order is an idempotent commitment without changing cash, stock or dues", () => {
  const s = clean(),
    before = structuredClone(s),
    input = orderInput(),
    order = createOrder(s, input);
  assert.equal(order.total, 28000);
  assert.equal(createOrder(s, input).id, order.id);
  assert.equal(s.orders!.length, 1);
  assert.deepEqual(s.batches, before.batches);
  assert.deepEqual(balances(s), balances(before));
  assert.equal(metrics(s).supplierDues, 0);
  assert.throws(
    () => createOrder(s, { ...input, expected: shift(3) }),
    /different request/,
  );
  assert.throws(
    () =>
      createOrder(s, {
        ...orderInput(),
        lines: [input.lines[0], input.lines[0]],
      }),
    /duplicate/,
  );
});

test("partial payment on multi-line receipt records exact inventory and supplier due without expensing merchandise", () => {
  const s = clean(),
    before = metrics(s),
    order = createOrder(s, orderInput());
  receiveOrder(s, order.id, receiptInput());
  assert.equal(order.status, "received");
  assert.equal(metrics(s).inventory, before.inventory + 28000);
  assert.equal(metrics(s).supplierDues, 18000);
  assert.equal(balances(s).cash, before.balances.cash - 10000);
  assert.equal(metrics(s).net, 0);
  const purchases = s.events.filter((e) => e.type === "purchase");
  assert.equal(purchases.length, 2);
  assert.equal(
    purchases.reduce((a, e) => a + e.paid, 0),
    10000,
  );
  assert.equal(
    purchases.reduce((a, e) => a + e.total, 0),
    28000,
  );
});

test("same receipt retry never posts twice, while a changed receipt is rejected", () => {
  const s = clean(),
    order = createOrder(s, orderInput()),
    body = receiptInput();
  receiveOrder(s, order.id, body);
  const after = structuredClone(s);
  assert.equal(receiveOrder(s, order.id, body).id, order.id);
  assert.deepEqual(s, after);
  assert.throws(
    () => receiveOrder(s, order.id, { ...body, paid: 20000 }),
    /different receipt/,
  );
  assert.deepEqual(s, after);
});

test("receiving failure on a later order line rolls stock, money, dues and audit back together", async () => {
  const store = await createStore({ test: true });
  try {
    const order = await store.transaction(
      (s) => createOrder(s, orderInput()),
      "Create fixture order",
    );
    const before = await store.read();
    const receipt = receiptInput();
    receipt.lines[1].expiry = shift(-1);
    await assert.rejects(
      store.transaction(
        (s) => receiveOrder(s, order.id, receipt),
        "Receive fixture order",
      ),
      /expired/,
    );
    assert.deepEqual(await store.read(), before);
    assert.equal(verifyAudit(await store.read()).valid, true);
  } finally {
    await store.close();
  }
});

test("stock-count losses and gains are repeat-safe and never move cash", () => {
  const s = clean(),
    batch = s.batches[0],
    beforeCash = balances(s),
    cost = batch.cost,
    input = {
      batchId: batch.id,
      counted: batch.qty - 2,
      reason: "Physical count",
      key: randomUUID(),
    };
  const event = stockCount(s, input);
  assert.equal(event.type, "writeoff");
  assert.equal(metrics(s).waste, 2 * cost);
  assert.equal(stockCount(s, input).id, event.id);
  assert.equal(s.events.length, 1);
  assert.throws(
    () => stockCount(s, { ...input, counted: input.counted + 1 }),
    /different request/,
  );
  const gain = {
    batchId: batch.id,
    counted: batch.qty + 1,
    reason: "Found sealed item",
    key: randomUUID(),
  };
  const gained = stockCount(s, gain);
  assert.equal(gained.type, "stock-found");
  assert.equal(stockCount(s, gain).id, gained.id);
  assert.equal(metrics(s).waste, 2 * cost);
  assert.deepEqual(balances(s), beforeCash);
});

test("cash closing records discrepancy without silently changing ledger funds", () => {
  const s = clean(),
    before = balances(s),
    closing = closeAccount(s, {
      account: "cash",
      counted: before.cash - 1500,
      note: "Drawer counted",
    });
  assert.equal(closing.expected, before.cash);
  assert.equal(closing.difference, -1500);
  assert.deepEqual(balances(s), before);
  assert.equal(s.events.length, 0);
});

test("paying a planned expense releases its reservation and posts the expense only once", () => {
  const s = clean();
  s.obligations!.push({
    id: "rent",
    title: "Rent",
    dueDate: shift(3),
    amount: 100000,
    status: "planned",
  });
  const before = planning(s);
  const obligation = payObligation(s, "rent", { account: "cash" });
  assert.equal(obligation.status, "paid");
  assert.equal(metrics(s).expenses, 100000);
  assert.equal(planning(s).freeCash, before.freeCash);
  payObligation(s, "rent", { account: "cash" });
  assert.equal(s.events.length, 1);
  assert.equal(metrics(s).expenses, 100000);
});

test("cash planning reserves all commitments, moves overdue outflows to today, and excludes uncollected credit", () => {
  const s = clean();
  s.parties.find((p) => p.id === "s1")!.due = 5000;
  s.parties.find((p) => p.id === "c1")!.due = 999999;
  s.obligations!.push(
    {
      id: "past",
      title: "Overdue rent",
      amount: 10000,
      dueDate: shift(-2),
      status: "planned",
    },
    {
      id: "future",
      title: "Next quarter",
      amount: 20000,
      dueDate: shift(60),
      status: "planned",
    },
  );
  createOrder(s, {
    ...orderInput(),
    lines: [{ productId: "p1", qty: 3, cost: 4000 }],
  });
  s.decisions.push({
    id: "approved",
    created: new Date().toISOString(),
    status: "approved",
    budget: 6000,
    reserve: 0,
    horizon: 7,
    available: 6000,
    items: [{ spend: 6000 }],
    reason: "",
  });
  const p = planning(s);
  assert.equal(p.reserved, 53000);
  assert.equal(p.freeCash, p.cash - 53000);
  assert.equal(p.receivables, 999999);
  assert.equal(p.calendar[0].date, day());
  assert.equal(p.calendar[0].out, 10000);
  assert.equal(
    p.calendar.reduce((a, d) => a + d.out, 0),
    22000,
  );
  assert.equal(p.calendar.at(-1)!.balance, p.cash - 33000);
});

test("audit verification survives JSON object reordering, detects record edits and current-state drift, and ignores no-op retries", async () => {
  const store = await createStore({ test: true });
  try {
    const input = orderInput();
    await store.transaction((s) => createOrder(s, input), "Order created");
    await store.transaction((s) => createOrder(s, input), "Order retry");
    const s = await store.read();
    assert.equal(s.audit!.length, 1);
    assert.equal(s.version, 1);
    assert.equal(verifyAudit(s).valid, true);
    const reorder = (v: any): any =>
      Array.isArray(v)
        ? v.map(reorder)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.keys(v)
                .reverse()
                .map((k) => [k, reorder(v[k])]),
            )
          : v;
    assert.equal(verifyAudit(reorder(s)).valid, true);
    const modified = structuredClone(s);
    modified.audit![0].actor = "someone else";
    assert.equal(verifyAudit(modified).valid, false);
    const drift = structuredClone(s);
    drift.products[0].price += 100;
    assert.equal(verifyAudit(drift).valid, false);
  } finally {
    await store.close();
  }
});

test("OpenAI requires explicit consent and configuration before any network call", async () => {
  let called = false;
  const fetcher = (async () => {
    called = true;
    throw Error("Should not call");
  }) as typeof fetch;
  await assert.rejects(
    openAIAnswer(clean(), "How much cash?", {
      consent: false,
      key: "test-key",
      model: "test-model",
      fetcher,
    }),
    /Confirm sharing/,
  );
  await assert.rejects(
    openAIAnswer(clean(), "How much cash?", { consent: true, fetcher }),
    /not configured/,
  );
  assert.equal(called, false);
});

test("OpenAI sends only computed evidence and question with storage disabled, and parses message text", async () => {
  const s = clean();
  s.parties[0].name = "PRIVATE_CUSTOMER";
  s.parties[0].phone = "PRIVATE_PHONE";
  s.settings!.address = "PRIVATE_ADDRESS";
  s.products[0].name = "PRIVATE_PRODUCT";
  s.events.push({
    id: "private-note",
    at: new Date().toISOString(),
    type: "investment",
    total: 100,
    paid: 100,
    account: "cash",
    cost: 0,
    lines: [],
    note: "PRIVATE_NOTE",
  });
  const before = structuredClone(s);
  let payload: any;
  let receivedUrl = "";
  const fetcher = (async (url: any, init: any) => {
    receivedUrl = String(url);
    payload = JSON.parse(init.body);
    assert.equal(init.headers.Authorization, "Bearer test-only-key");
    return new Response(
      JSON.stringify({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "First" }],
          },
          {
            type: "message",
            content: [{ type: "output_text", text: "Second" }],
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  const result = await openAIAnswer(s, "How much cash?", {
    consent: true,
    key: "test-only-key",
    model: "test-model",
    fetcher,
  });
  assert.equal(receivedUrl, "https://api.openai.com/v1/responses");
  assert.equal(payload.store, false);
  assert.equal(payload.model, "test-model");
  assert.equal(payload.max_output_tokens, 900);
  assert.equal(payload.tools, undefined);
  const transmitted = JSON.stringify(payload);
  for (const secret of [
    "PRIVATE_CUSTOMER",
    "PRIVATE_PHONE",
    "PRIVATE_ADDRESS",
    "PRIVATE_PRODUCT",
    "PRIVATE_NOTE",
    "test-only-key",
  ])
    assert.equal(transmitted.includes(secret), false);
  assert.equal(result.answer, "First\nSecond");
  assert.equal(result.provider, "openai");
  assert.deepEqual(s, before);
  assert.equal(contextForAdvisor(s).version, s.version);
});

test("OpenAI failures expose safe status without copying upstream errors, and incomplete responses are rejected", async () => {
  const errorFetch = (async () =>
    new Response("PRIVATE_UPSTREAM_ERROR", { status: 429 })) as typeof fetch;
  await assert.rejects(
    openAIAnswer(clean(), "How much cash?", {
      consent: true,
      key: "test-key",
      model: "test-model",
      fetcher: errorFetch,
    }),
    (e) =>
      e instanceof Error &&
      e.message.includes("(429)") &&
      !e.message.includes("PRIVATE_UPSTREAM_ERROR"),
  );
  const incomplete = (async () =>
    new Response(
      JSON.stringify({
        status: "incomplete",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Partial answer" }],
          },
        ],
      }),
      { status: 200 },
    )) as typeof fetch;
  await assert.rejects(
    openAIAnswer(clean(), "How much cash?", {
      consent: true,
      key: "test-key",
      model: "test-model",
      fetcher: incomplete,
    }),
    /incomplete/,
  );
});

test("local advisor calculates current figures without mutating state", () => {
  const s = clean(),
    before = structuredClone(s),
    answer = localAnswer(s, "Can I afford to buy more stock?");
  assert.equal(answer.provider, "local");
  assert.ok(answer.answer.includes("uncommitted funds"));
  assert.deepEqual(s, before);
});

test("operations endpoints remain protected and validate quantities before mutation", async () => {
  const store = await createStore({ test: true }),
    server = createApp(store).listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", r));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(url + "/api/operations")).status, 401);
    const login = await fetch(url + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: process.env.AUTH_PASSWORD ?? "smartbiz-owner",
        }),
      }),
      cookie = login.headers.get("set-cookie")!;
    const invalid = await fetch(url + "/api/operations/orders", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...orderInput(),
        lines: [{ productId: "p1", qty: -1, cost: 100 }],
      }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await store.read()).orders!.length, 0);
    const local = await fetch(url + "/api/operations/advisor", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ question: "How much cash?", provider: "local" }),
    });
    assert.equal(local.status, 200);
    assert.equal(((await local.json()) as any).provider, "local");
    const consent = await fetch(url + "/api/operations/advisor", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "How much cash?",
        provider: "openai",
        consent: false,
      }),
    });
    assert.equal(consent.status, 400);
  } finally {
    server.close();
    await store.close();
  }
});
