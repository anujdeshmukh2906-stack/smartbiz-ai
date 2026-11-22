import { forecast } from "./forecast.ts";
import { randomUUID } from "node:crypto";
import { finalizeInvoice, type Settings } from "./professional.ts";
import type {
  PurchaseOrder,
  Obligation,
  Closing,
  Audit,
} from "./operations.ts";
export const day = () => new Date().toISOString().slice(0, 10);
export const shift = (n: number, from = day()) =>
  new Date(new Date(from + "T00:00:00Z").getTime() + n * 86400000)
    .toISOString()
    .slice(0, 10);
export type Product = {
  id: string;
  name: string;
  category: string;
  barcode: string;
  price: number;
  reorder: number;
  image?: string;
  unit?: string;
  gstRate?: number;
  hsn?: string;
  brand?: string;
  packSize?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  productType?: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
  storage?: string;
  mrp?: number;
  sourceUrl?: string;
  sourceLabel?: string;
  verifiedAt?: string;
  imageSourceUrl?: string;
  catalogVersion?: number;
};
export type Batch = {
  id: string;
  productId: string;
  code: string;
  qty: number;
  cost: number;
  expiry: string;
  decisionId?: string;
};
export type Party = {
  id: string;
  name: string;
  kind: "customer" | "supplier";
  phone?: string;
  address?: string;
  gstin?: string;
  creditLimit?: number;
  due: number;
};
export type Offer = {
  id: string;
  productId: string;
  supplierId: string;
  cost: number;
  moq: number;
  lead: number;
  shelf: number;
  fee: number;
};
export type Event = {
  id: string;
  at: string;
  type: string;
  total: number;
  paid: number;
  account: string;
  partyId?: string;
  cost: number;
  lines: any[];
  note: string;
  key?: string;
  request?: string;
  decisionId?: string;
  invoiceNo?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  business?: Settings;
  customer?: Party;
  dueDate?: string;
  taxMode?: string;
  destination?: "cash" | "bank";
  originalId?: string;
};
export type Decision = {
  id: string;
  created: string;
  status: "pending" | "approved" | "rejected" | "received";
  budget: number;
  reserve: number;
  horizon: number;
  items: any[];
  reason: string;
  available: number;
};
export type State = {
  products: Product[];
  batches: Batch[];
  parties: Party[];
  offers: Offer[];
  events: Event[];
  decisions: Decision[];
  opening: { cash: number; bank: number };
  version: number;
  settings?: Settings;
  quotes?: any[];
  orders?: PurchaseOrder[];
  obligations?: Obligation[];
  closings?: Closing[];
  audit?: Audit[];
  tasks?: { id: string; title: string; dueDate: string; done: boolean }[];
};
export function seed(): State {
  const products = [
    ["p1", "Whole milk 1L", "Dairy", 6800, 12],
    ["p2", "Basmati rice 1kg", "Staples", 12500, 15],
    ["p3", "Brown bread", "Bakery", 5000, 10],
    ["p4", "Sunflower oil 1L", "Staples", 15500, 12],
    ["p5", "Greek yogurt", "Dairy", 4500, 15],
    ["p6", "Assam tea 250g", "Beverages", 14000, 8],
  ].map(([id, name, category, price, reorder], i) => ({
    id: String(id),
    name: String(name),
    category: String(category),
    price: Number(price),
    reorder: Number(reorder),
    barcode: `89010000000${i}`,
  }));
  const s: State = {
    products,
    batches: [],
    parties: [
      { id: "c1", name: "Ananya Sharma", kind: "customer", due: 0 },
      { id: "c2", name: "Rahul Stores", kind: "customer", due: 0 },
      { id: "s1", name: "Freshway Distributors", kind: "supplier", due: 0 },
      { id: "s2", name: "Metro Wholesale", kind: "supplier", due: 0 },
    ],
    offers: [],
    events: [],
    decisions: [],
    opening: { cash: 1200000, bank: 2300000 },
    version: 0,
  };
  products.forEach((p, i) => {
    s.batches.push({
      id: `b${i}`,
      productId: p.id,
      code: `LOT-${210 + i}`,
      qty: [9, 30, 12, 8, 28, 18][i],
      cost: Math.round(p.price * 0.7),
      expiry: shift([3, 180, 4, 120, 5, 240][i]),
    });
    s.offers.push(
      {
        id: `o${i}a`,
        productId: p.id,
        supplierId: "s1",
        cost: Math.round(p.price * 0.69),
        moq: 6,
        lead: 1,
        shelf: [7, 180, 6, 120, 12, 240][i],
        fee: 0,
      },
      {
        id: `o${i}b`,
        productId: p.id,
        supplierId: "s2",
        cost: Math.round(p.price * 0.64),
        moq: 24,
        lead: 3,
        shelf: [5, 180, 4, 120, 8, 240][i],
        fee: 2000,
      },
    );
  });
  for (let d = 28; d >= 1; d--)
    for (let i = 0; i < products.length; i++) {
      const p = products[i],
        qty = [5, 2, 4, 2, 3, 1][i] + (d % 7 === 0 ? 2 : 0),
        total = p.price * qty,
        paid = d < 4 ? Math.round(total * 0.8) : total;
      s.events.push({
        id: `history-${d}-${i}`,
        at: shift(-d) + "T12:00:00Z",
        type: "sale",
        total,
        paid,
        account: d % 2 ? "cash" : "bank",
        cost: Math.round(p.price * 0.7) * qty,
        partyId: paid < total ? "c1" : undefined,
        lines: [
          {
            productId: p.id,
            qty,
            price: p.price,
            cost: Math.round(p.price * 0.7) * qty,
          },
        ],
        note: "Seeded historical sales; opening stock is independent",
      });
      if (paid < total) s.parties[0].due += total - paid;
    }
  s.events.push({
    id: "seed-expense",
    at: day() + "T09:00:00Z",
    type: "expense",
    total: 85000,
    paid: 85000,
    account: "bank",
    cost: 0,
    lines: [],
    note: "Electricity and delivery",
  });
  return s;
}
export function balances(s: State) {
  const b = { ...s.opening };
  for (const e of s.events) {
    const sign = [
      "purchase",
      "expense",
      "supplier-payment",
      "sale-return",
    ].includes(e.type)
      ? -1
      : ["sale", "customer-payment", "investment"].includes(e.type)
        ? 1
        : 0;
    if (e.account === "cash" || e.account === "bank")
      b[e.account] += sign * e.paid;
    if (e.type === "transfer" && e.destination) {
      b[e.account as "cash" | "bank"] -= e.paid;
      b[e.destination] += e.paid;
    }
  }
  return b;
}
export function metrics(s: State) {
  const sales = s.events.filter((e) => e.type === "sale"),
    refunds = s.events.filter((e) => e.type === "sale-return"),
    revenue =
      sales.reduce((a, e) => a + (e.subtotal ?? e.total), 0) -
      refunds.reduce((a, e) => a + (e.subtotal ?? e.total), 0),
    cogs =
      sales.reduce((a, e) => a + e.cost, 0) -
      refunds.reduce((a, e) => a + e.cost, 0),
    expenses = s.events
      .filter((e) => e.type === "expense")
      .reduce((a, e) => a + e.total, 0),
    waste = s.events
      .filter((e) => e.type === "writeoff")
      .reduce((a, e) => a + e.cost, 0);
  return {
    revenue,
    taxCollected:
      sales.reduce((a, e) => a + (e.tax ?? 0), 0) -
      refunds.reduce((a, e) => a + (e.tax ?? 0), 0),
    cogs,
    expenses,
    waste,
    gross: revenue - cogs,
    net: revenue - cogs - expenses - waste,
    balances: balances(s),
    customerDues: s.parties
      .filter((p) => p.kind === "customer")
      .reduce((a, p) => a + p.due, 0),
    supplierDues: s.parties
      .filter((p) => p.kind === "supplier")
      .reduce((a, p) => a + p.due, 0),
    inventory: s.batches.reduce((a, b) => a + b.qty * b.cost, 0),
  };
}
export function daily(s: State, id: string) {
  const start = shift(-28);
  return (
    s.events
      .filter(
        (e) =>
          e.type === "sale" &&
          e.at.slice(0, 10) >= start &&
          e.at.slice(0, 10) < day(),
      )
      .flatMap((e) => e.lines)
      .filter((l) => l.productId === id)
      .reduce((a, l) => a + l.qty, 0) / 28
  );
}
export function recommend(
  s: State,
  budget: number,
  reserve: number,
  horizon: number,
): Decision {
  const committed = s.decisions.filter((d) => d.status === "approved"),
    committedSpend = committed.reduce(
      (a, d) => a + d.items.reduce((n, x) => n + x.spend, 0),
      0,
    );
  const orderCommitment = (s.orders ?? [])
      .filter((o) => o.status === "ordered")
      .reduce((a, o) => a + o.total, 0),
    expenseCommitment = (s.obligations ?? [])
      .filter((o) => o.status === "planned")
      .reduce((a, o) => a + o.amount, 0);
  const cash = Object.values(balances(s)).reduce((a, b) => a + b, 0),
    obligations = s.parties
      .filter((p) => p.kind === "supplier")
      .reduce((a, p) => a + p.due, 0),
    taxReserve = Math.max(0, metrics(s).taxCollected),
    available = Math.max(
      0,
      Math.min(
        budget,
        cash -
          reserve -
          obligations -
          taxReserve -
          committedSpend -
          orderCommitment -
          expenseCommitment,
      ),
    );
  let remaining = available;
  const items = s.products
    .map((p) => {
      const rate = forecast(s, p.id).dailyMean,
        stock =
          s.batches
            .filter((b) => b.productId === p.id && b.expiry >= day())
            .reduce((a, b) => a + b.qty, 0) +
          committed
            .flatMap((d) => d.items)
            .filter((x) => x.productId === p.id)
            .reduce((a, x) => a + x.qty, 0) +
          (s.orders ?? [])
            .filter((o) => o.status === "ordered")
            .flatMap((o) => o.lines)
            .filter((l) => l.productId === p.id)
            .reduce((a, l) => a + l.qty, 0);
      const options = s.offers
        .filter((o) => o.productId === p.id)
        .map((o) => {
          const demand = Math.ceil(rate * (horizon + o.lead)),
            need = Math.max(0, demand - stock),
            expiryCap = Math.max(0, Math.floor(rate * o.shelf) - stock),
            qty = Math.min(need, expiryCap),
            effective = o.cost + (qty ? Math.ceil(o.fee / qty) : 0);
          return {
            ...o,
            qty,
            need,
            expiryCap,
            effective,
            margin: p.price - effective,
          };
        })
        .filter((o) => o.qty >= o.moq && o.margin > 0)
        .sort((a, b) => a.effective - b.effective);
      const o = options[0];
      return {
        productId: p.id,
        name: p.name,
        price: p.price,
        options,
        rate: Number(rate.toFixed(2)),
        forecast: Math.ceil(rate * horizon),
        stock,
        offer: o,
        priority: o ? o.margin * o.qty : 0,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .map((x) => {
      const affordable = x.options
        .map((o) => {
          const q = Math.min(
            o.qty,
            Math.floor(Math.max(0, remaining - o.fee) / o.cost),
          );
          return {
            ...o,
            qty: q,
            effective: q ? o.cost + Math.ceil(o.fee / q) : Infinity,
          };
        })
        .filter((o) => o.qty >= o.moq && x.price > o.effective)
        .sort((a, b) => a.effective - b.effective);
      const o = affordable[0] ?? x.offer;
      let qty = affordable[0]?.qty ?? 0;
      const spend = qty && o ? qty * o.cost + o.fee : 0;
      remaining -= spend;
      return {
        ...x,
        offer: o,
        qty,
        spend,
        explanation: o
          ? `${x.rate}/day fitted 28-day forecast; ${x.stock} usable units; expiry cap ${o.expiryCap}; MOQ ${o.moq}; ${o.lead}-day delivery. ${qty ? "Budget allocated by expected contribution." : "Cash constraint blocks order."}`
          : "No profitable offer meeting demand, expiry capacity, and minimum quantity.",
      };
    });
  return {
    id: randomUUID(),
    created: new Date().toISOString(),
    status: "pending",
    budget,
    reserve,
    horizon,
    available,
    items,
    reason:
      "Backtested statistical forecast + constrained greedy allocation v2. All supplier dues reserved conservatively. No optimality guarantee; owner approval required.",
  };
}
function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function mutate(s: State, type: string, b: any): any {
  if (b.key) {
    const prior = s.events.find((e) => e.key === b.key);
    if (prior) {
      ensure(
        prior.type === type && prior.request === JSON.stringify(b),
        "Duplicate key with different request",
      );
      return prior;
    }
  }
  const e: Event = {
    id: randomUUID(),
    at: new Date().toISOString(),
    type,
    total: 0,
    paid: b.paid ?? 0,
    account: b.account ?? "cash",
    partyId: b.partyId,
    cost: 0,
    lines: [],
    note: b.note ?? "",
    key: b.key,
    request: JSON.stringify(b),
  };
  if (type === "sale") {
    const quote = b.quoteId ? s.quotes?.find((q) => q.id === b.quoteId) : null;
    if (b.quoteId) {
      ensure(
        quote && quote.status === "open" && quote.dueDate >= day(),
        "Quotation is expired or already invoiced",
      );
      const group = (lines: any[]) =>
        [
          ...lines.reduce(
            (m: Map<string, number>, l: any) =>
              m.set(l.productId, (m.get(l.productId) ?? 0) + l.qty),
            new Map<string, number>(),
          ),
        ].sort();
      ensure(
        JSON.stringify(group(b.lines)) === JSON.stringify(group(quote.lines)),
        "Quoted quantities changed",
      );
      ensure(
        quote.lines.every(
          (l: any) =>
            s.products.find((p) => p.id === l.productId)?.price === l.price,
        ),
        "Product prices changed; issue a revised quotation",
      );
    }

    ensure(b.lines.length > 0, "Add at least one item");
    const merged = new Map<string, number>();
    for (const l of b.lines)
      merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.qty);
    for (const [id, qty] of merged) {
      const p = s.products.find((p) => p.id === id);
      ensure(p, "Unknown product");
      const batches = s.batches
        .filter((x) => x.productId === id && x.expiry >= day() && x.qty > 0)
        .sort(
          (a, b) =>
            a.expiry.localeCompare(b.expiry) || a.id.localeCompare(b.id),
        );
      ensure(
        batches.reduce((a, b) => a + b.qty, 0) >= qty,
        `Insufficient unexpired stock: ${p.name}`,
      );
      let left = qty;
      for (const batch of batches) {
        const take = Math.min(left, batch.qty);
        if (!take) continue;
        batch.qty -= take;
        left -= take;
        e.cost += take * batch.cost;
        e.lines.push({
          productId: id,
          batchId: batch.id,
          decisionId: batch.decisionId,
          qty: take,
          price: p.price,
          cost: take * batch.cost,
        });
      }
      e.total += p.price * qty;
    }
    const discount = b.discount ?? 0;
    ensure(discount <= e.total, "Discount exceeds bill");
    e.total -= discount;
    finalizeInvoice(s, e, b);
    if (quote) {
      ensure(
        e.total === quote.total && b.partyId === quote.partyId,
        "Quote customer or tax settings changed; issue a revised quotation",
      );
      quote.status = "invoiced";
      quote.saleId = e.id;
    }

    ensure(e.paid <= e.total, "Payment exceeds bill");
    if (e.paid < e.total) {
      const p = s.parties.find(
        (p) => p.id === b.partyId && p.kind === "customer",
      );
      ensure(p, "Choose customer for credit sale");
      if (p.creditLimit && p.due + e.total - e.paid > p.creditLimit)
        throw Error("Customer credit limit exceeded");
      p.due += e.total - e.paid;
    }
  } else if (type === "purchase") {
    const supplier = s.parties.find(
      (p) => p.id === b.partyId && p.kind === "supplier",
    );
    ensure(supplier, "Choose supplier");
    ensure(b.expiry >= day(), "Cannot receive expired stock");
    ensure(
      s.products.some((p) => p.id === b.productId),
      "Unknown product",
    );
    e.total = b.qty * b.cost + (b.fee ?? 0);
    ensure(e.paid <= e.total, "Payment exceeds purchase");
    s.batches.push({
      id: randomUUID(),
      productId: b.productId,
      code: b.code,
      qty: b.qty,
      cost: b.cost,
      expiry: b.expiry,
    });
    supplier.due += e.total - e.paid;
    e.lines = [{ productId: b.productId, qty: b.qty, cost: b.cost }];
  } else if (type === "customer-payment" || type === "supplier-payment") {
    const party = s.parties.find(
      (p) =>
        p.id === b.partyId &&
        p.kind === (type === "customer-payment" ? "customer" : "supplier"),
    );
    ensure(party, "Unknown party");
    ensure(e.paid <= party.due, "Payment exceeds outstanding due");
    party.due -= e.paid;
    e.total = e.paid;
  } else if (type === "expense" || type === "investment") {
    e.total = e.paid;
  } else if (type === "writeoff") {
    const batch = s.batches.find((x) => x.id === b.batchId);
    ensure(batch && batch.qty >= b.qty, "Invalid write-off quantity");
    batch.qty -= b.qty;
    e.cost = batch.cost * b.qty;
    e.lines = [
      {
        batchId: batch.id,
        productId: batch.productId,
        decisionId: batch.decisionId,
        qty: b.qty,
        cost: e.cost,
      },
    ];
    e.paid = 0;
  } else throw new Error("Unknown action");
  if (["purchase", "expense", "supplier-payment"].includes(type))
    ensure(
      balances(s)[e.account as "cash" | "bank"] >= e.paid,
      "Insufficient account balance",
    );
  s.events.push(e);
  if (type === "purchase" && b.fee > 0)
    s.events.push({
      id: randomUUID(),
      at: e.at,
      type: "expense",
      total: b.fee,
      paid: 0,
      account: e.account,
      cost: 0,
      lines: [],
      note: `Delivery charge recognized on purchase ${e.id}; cash included in purchase payment`,
    });
  return e;
}
export function approve(s: State, id: string, status: "approved" | "rejected") {
  const d = s.decisions.find((d) => d.id === id);
  ensure(
    d &&
      (d.status === "pending" ||
        (d.status === "approved" && status === "rejected")),
    "Decision already handled or missing",
  );
  d.status = status;
  return d;
}
export function receive(s: State, id: string) {
  const d = s.decisions.find((d) => d.id === id);
  ensure(d && d.status === "approved", "Approve recommendation first");
  const fresh = recommend(
    { ...s, decisions: s.decisions.filter((x) => x.id !== id) },
    d.budget,
    d.reserve,
    d.horizon,
  );
  ensure(
    JSON.stringify(fresh.items.map((x) => [x.productId, x.qty, x.spend])) ===
      JSON.stringify(d.items.map((x) => [x.productId, x.qty, x.spend])),
    "Stock or commitments changed; cancel this plan and generate a fresh recommendation",
  );
  const spend = d.items.reduce((a, x) => a + x.spend, 0),
    cash = balances(s);
  ensure(
    cash.cash + cash.bank - spend >=
      d.reserve +
        Math.max(0, metrics(s).taxCollected) +
        s.parties
          .filter((p) => p.kind === "supplier")
          .reduce((a, p) => a + p.due, 0),
    "Cash changed: generate a fresh plan",
  );
  for (const x of d.items.filter((x) => x.qty > 0)) {
    const o = x.offer as Offer;
    const account = cash.bank >= x.spend ? "bank" : "cash";
    ensure(
      cash[account] >= x.spend,
      "Insufficient single-account balance; choose a smaller plan",
    );
    cash[account] -= x.spend;
    const event = mutate(s, "purchase", {
      partyId: o.supplierId,
      productId: x.productId,
      qty: x.qty,
      cost: o.cost,
      fee: o.fee,
      code: `AI-${id.slice(0, 6)}`,
      expiry: shift(o.shelf),
      paid: x.spend,
      account,
      note: "Owner received ProfitShield order",
    });
    event.decisionId = id;
    s.batches[s.batches.length - 1].decisionId = id;
  }
  d.status = "received";
  return d;
}
export function replay(s: State, d: Decision) {
  const batches = s.batches.filter((b) => b.decisionId === d.id);
  const sold = s.events
    .filter((e) => e.type === "sale" || e.type === "sale-return")
    .flatMap((e) =>
      e.lines.map((l) =>
        e.type === "sale-return" ? { ...l, qty: -l.qty, cost: -l.cost } : l,
      ),
    )
    .filter((l) => l.decisionId === d.id);
  const written = s.events
    .filter((e) => e.type === "writeoff")
    .flatMap((e) => e.lines)
    .filter((l) => l.decisionId === d.id);
  return {
    received: s.events
      .filter((e) => e.type === "purchase" && e.decisionId === d.id)
      .flatMap((e) => e.lines)
      .reduce((a, l) => a + l.qty, 0),
    stockFound: s.events
      .filter((e) => e.type === "stock-found")
      .flatMap((e) => e.lines)
      .filter((l) => batches.some((b) => b.id === l.batchId))
      .reduce((a, l) => a + l.qty, 0),
    sold: sold.reduce((a, l) => a + l.qty, 0),
    remaining: batches.reduce((a, b) => a + b.qty, 0),
    realizedMargin: sold.reduce((a, l) => a + l.price * l.qty - l.cost, 0),
    waste: written.reduce((a, l) => a + l.cost, 0),
    ageDays: Math.floor((Date.now() - Date.parse(d.created)) / 86400000),
    note: "Observed batch outcomes only. Received quantities come from original purchase records; found-stock corrections may increase remaining units. Realized margin is before invoice discounts, delivery fees and operating expenses. No causal savings claim or simulated counterfactual.",
  };
}
