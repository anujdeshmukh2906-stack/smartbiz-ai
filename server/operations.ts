import { randomUUID, createHash } from "node:crypto";
import { balances, day, shift, metrics, mutate, type State } from "./domain.ts";
export type PurchaseOrder = {
  id: string;
  number: string;
  key: string;
  request: string;
  status: "ordered" | "received" | "cancelled";
  supplierId: string;
  created: string;
  expected: string;
  lines: { productId: string; qty: number; cost: number }[];
  total: number;
  receivedAt?: string;
  receiptRequest?: string;
};
export type Obligation = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  status: "planned" | "paid" | "cancelled";
  eventId?: string;
};
export type Closing = {
  id: string;
  at: string;
  account: "cash" | "bank";
  expected: number;
  counted: number;
  difference: number;
  note: string;
};
export type Audit = {
  id: string;
  at: string;
  version: number;
  action: string;
  actor: string;
  stateHash: string;
  previousHash: string;
  hash: string;
  algorithm?: "sha256-canonical-v1";
};
export function initOperations(s: State) {
  s.orders ??= [];
  s.obligations ??= [];
  s.closings ??= [];
  s.audit ??= [];
  s.tasks ??= [];
  return s;
}
function canonical(value: unknown): string {
  const normalize = (item: any): any =>
    Array.isArray(item)
      ? item.map(normalize)
      : item && typeof item === "object"
        ? Object.fromEntries(
            Object.keys(item)
              .sort()
              .map((key) => [key, normalize(item[key])]),
          )
        : item;
  return JSON.stringify(normalize(JSON.parse(JSON.stringify(value))));
}
function digest(value: unknown, canonicalOrder = true) {
  return createHash("sha256")
    .update(canonicalOrder ? canonical(value) : JSON.stringify(value))
    .digest("hex");
}
export function appendAudit(s: State, before: State, label?: string) {
  initOperations(s);
  const { audit, ...contents } = s;
  const added = s.events.filter(
    (e) => !before.events.some((x) => x.id === e.id),
  );
  const action =
    label ??
    (added.length
      ? added.map((e) => e.type).join(", ")
      : JSON.stringify(s.settings) !== JSON.stringify(before.settings)
        ? "Business settings updated"
        : "Business records updated");
  const entry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    version: s.version,
    actor: "owner",
    action,
    stateHash: digest(contents),
    previousHash: s.audit?.at(-1)?.hash ?? "GENESIS",
    algorithm: "sha256-canonical-v1" as const,
  };
  s.audit!.push({ ...entry, hash: digest(entry) });
}
export function verifyAudit(s: State) {
  let previous = "GENESIS";
  for (const record of s.audit ?? []) {
    const { hash, ...body } = record;
    if (
      body.previousHash !== previous ||
      digest(body, body.algorithm === "sha256-canonical-v1") !== hash
    )
      return {
        valid: false,
        brokenAt: record.id,
        reason: "Audit record or link changed",
      };
    previous = hash;
  }
  const latest = s.audit?.at(-1);
  if (latest) {
    const { audit, ...contents } = s;
    if (
      latest.stateHash !==
      digest(contents, latest.algorithm === "sha256-canonical-v1")
    )
      return {
        valid: false,
        brokenAt: "current-state",
        reason: "Current business state differs from its last audit snapshot",
      };
  }
  return { valid: true, entries: s.audit?.length ?? 0, head: previous };
}
export function createOrder(s: State, b: any) {
  initOperations(s);
  const prior = s.orders!.find((o) => o.key === b.key);
  if (prior) {
    if (prior.request !== JSON.stringify(b))
      throw Error("Order key reused with a different request");
    return prior;
  }
  if (!s.parties.some((p) => p.id === b.supplierId && p.kind === "supplier"))
    throw Error("Supplier not found");
  if (b.expected < day()) throw Error("Expected date cannot be in the past");
  const seen = new Set();
  for (const l of b.lines) {
    if (!s.products.some((p) => p.id === l.productId))
      throw Error("Product not found");
    if (seen.has(l.productId)) throw Error("Combine duplicate product lines");
    seen.add(l.productId);
  }
  const order: PurchaseOrder = {
    ...b,
    id: randomUUID(),
    number: `PO-${String(s.orders!.length + 1).padStart(5, "0")}`,
    request: JSON.stringify(b),
    status: "ordered",
    created: new Date().toISOString(),
    total: b.lines.reduce((a: number, l: any) => a + l.qty * l.cost, 0),
  };
  s.orders!.push(order);
  return order;
}
export function receiveOrder(s: State, id: string, b: any) {
  const order = s.orders?.find((o) => o.id === id);
  if (!order) throw Error("Order not found");
  if (order.status === "received") {
    if (order.receiptRequest !== JSON.stringify(b))
      throw Error("Order already received with different receipt details");
    return order;
  }
  if (order.status !== "ordered")
    throw Error("Cancelled order cannot be received");
  if (b.paid > order.total) throw Error("Payment exceeds order total");
  if (
    b.lines.length !== order.lines.length ||
    new Set(b.lines.map((l: any) => l.productId)).size !== order.lines.length
  )
    throw Error("Supply expiry and batch information for every line");
  let paid = b.paid;
  for (const line of order.lines) {
    const batch = b.lines.find((x: any) => x.productId === line.productId);
    if (!batch) throw Error("Missing batch information");
    const part = Math.min(paid, line.qty * line.cost);
    mutate(s, "purchase", {
      partyId: order.supplierId,
      productId: line.productId,
      qty: line.qty,
      cost: line.cost,
      paid: part,
      account: b.account,
      expiry: batch.expiry,
      code: batch.code,
      note: `Received ${order.number}`,
      key: randomUUID(),
    });
    paid -= part;
  }
  order.status = "received";
  order.receiptRequest = JSON.stringify(b);
  order.receivedAt = new Date().toISOString();
  return order;
}
export function stockCount(s: State, b: any) {
  const repeated = s.events.find((e) => e.key === b.key);
  if (repeated) {
    if (repeated.request !== JSON.stringify(b))
      throw Error("Count key reused with a different request");
    return repeated;
  }
  const batch = s.batches.find((x) => x.id === b.batchId);
  if (!batch) throw Error("Batch not found");
  const difference = b.counted - batch.qty;
  if (!difference)
    throw Error("Count matches recorded stock; no correction needed");
  if (difference < 0) {
    const event = mutate(s, "writeoff", {
      batchId: batch.id,
      qty: -difference,
      note: `Stock count: ${b.reason}`,
      key: b.key,
    });
    event.request = JSON.stringify(b);
    return event;
  }
  const prior = s.events.find((e) => e.key === b.key);
  if (prior) {
    if (prior.request !== JSON.stringify(b))
      throw Error("Changed count request");
    return prior;
  }
  batch.qty = b.counted;
  const event = {
    id: randomUUID(),
    at: new Date().toISOString(),
    type: "stock-found",
    total: 0,
    paid: 0,
    account: "cash",
    cost: batch.cost * difference,
    lines: [
      {
        batchId: batch.id,
        productId: batch.productId,
        qty: difference,
        cost: batch.cost * difference,
      },
    ],
    note: b.reason,
    key: b.key,
    request: JSON.stringify(b),
  };
  s.events.push(event);
  return event;
}
export function closeAccount(s: State, b: any) {
  initOperations(s);
  const closing: Closing = {
    id: randomUUID(),
    at: new Date().toISOString(),
    account: b.account,
    expected: balances(s)[b.account as "cash" | "bank"],
    counted: b.counted,
    difference: b.counted - balances(s)[b.account as "cash" | "bank"],
    note: b.note,
  };
  s.closings!.push(closing);
  return closing;
}
export function payObligation(s: State, id: string, b: any) {
  const obligation = s.obligations?.find((o) => o.id === id);
  if (!obligation || obligation.status === "cancelled")
    throw Error("Planned expense not found");
  if (obligation.status === "paid") return obligation;
  const e = mutate(s, "expense", {
    paid: obligation.amount,
    account: b.account,
    note: obligation.title,
    key: randomUUID(),
  });
  obligation.status = "paid";
  obligation.eventId = e.id;
  return obligation;
}
export function planning(s: State) {
  initOperations(s);
  const m = metrics(s),
    start = m.balances.cash + m.balances.bank,
    planned = s.obligations!.filter((o) => o.status === "planned"),
    orders = s.orders!.filter((o) => o.status === "ordered"),
    approved = s.decisions.filter((d) => d.status === "approved");
  const reserved =
    planned.reduce((a, o) => a + o.amount, 0) +
    orders.reduce((a, o) => a + o.total, 0) +
    approved.reduce((a, d) => a + d.items.reduce((n, x) => n + x.spend, 0), 0) +
    m.supplierDues +
    Math.max(0, m.taxCollected);
  let running =
    start -
    m.supplierDues -
    Math.max(0, m.taxCollected) -
    approved.reduce((a, d) => a + d.items.reduce((n, x) => n + x.spend, 0), 0);
  const calendar = Array.from({ length: 30 }, (_, i) => {
    const date = shift(i),
      out =
        planned
          .filter((o) => (o.dueDate < day() ? day() : o.dueDate) === date)
          .reduce((a, o) => a + o.amount, 0) +
        orders
          .filter((o) => (o.expected < day() ? day() : o.expected) === date)
          .reduce((a, o) => a + o.total, 0);
    running -= out;
    return { date, out, balance: running };
  });
  return {
    cash: start,
    reserved,
    freeCash: start - reserved,
    calendar,
    receivables: m.customerDues,
    assumptions:
      "Conservative outflow scenario: all current supplier dues, net configured GST and approved AI commitments reserved immediately. Planned expenses and full purchase-order costs paid on their dates. No future sales or credit collections assumed. Plans beyond 30 days affect reserved funds, not the calendar.",
  };
}
