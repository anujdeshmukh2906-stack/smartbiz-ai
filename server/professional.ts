import { randomUUID } from "node:crypto";
import { day, balances, type State, type Event } from "./domain.ts";
import { initOperations } from "./operations.ts";

export type Settings = {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  stateCode: string;
  invoicePrefix: string;
  gstEnabled: boolean;
  terms: string;
};
export const defaultSettings: Settings = {
  name: "Green Basket",
  address: "24 Market Road, Bengaluru, Karnataka",
  phone: "",
  gstin: "",
  stateCode: "29",
  invoicePrefix: "SB",
  gstEnabled: false,
  terms:
    "Thank you for shopping with us. Please retain this invoice for returns.",
};
export function upgrade(s: State) {
  initOperations(s);
  s.settings ??= { ...defaultSettings };
  s.quotes ??= [];
  s.products.forEach((p, i) => {
    p.unit ??= "pcs";
    p.gstRate ??= 0;
    p.hsn ??= "";
    if (/^p[1-6]$/.test(p.id)) p.image ??= `/products/${p.id}.png`;
  });
  return s;
}
export function finalizeInvoice(s: State, e: Event, b: any) {
  const settings = s.settings ?? defaultSettings;
  const discount = b.discount ?? 0;
  const base = e.lines.reduce((a, l) => a + l.price * l.qty, 0);
  let allocated = 0;
  e.lines = e.lines.map((l, i) => {
    const p = s.products.find((p) => p.id === l.productId)!;
    const reduction =
      i === e.lines.length - 1
        ? discount - allocated
        : Math.floor((discount * l.price * l.qty) / base);
    allocated += reduction;
    const taxable = l.price * l.qty - reduction;
    const rate = settings.gstEnabled ? (p.gstRate ?? 0) : 0;
    const tax = Math.round((taxable * rate) / 100);
    return {
      ...l,
      name: p.name,
      hsn: p.hsn ?? "",
      unit: p.unit ?? "pcs",
      discount: reduction,
      taxable,
      tax,
      rate,
    };
  });
  e.tax = e.lines.reduce((a, l) => a + l.tax, 0);
  e.subtotal = e.total;
  e.total += e.tax ?? 0;
  e.discount = discount;
  e.invoiceNo = `${settings.invoicePrefix}-${day().slice(0, 4)}-${String(s.events.filter((x) => x.type === "sale").length + 1).padStart(5, "0")}`;
  e.business = structuredClone(settings);
  e.customer = structuredClone(s.parties.find((p) => p.id === b.partyId));
  e.dueDate = b.dueDate ?? day();
  e.taxMode = b.interstate ? "IGST" : "CGST+SGST";
}
export function professionalAction(s: State, type: string, b: any): Event {
  const previous = s.events.find((e) => e.key === b.key);
  if (previous) {
    if (previous.type !== type || previous.request !== JSON.stringify(b))
      throw Error("Duplicate key with different request");
    return previous;
  }
  const e: Event = {
    id: randomUUID(),
    at: new Date().toISOString(),
    type,
    total: b.paid ?? 0,
    paid: b.paid ?? 0,
    account: b.account ?? "cash",
    cost: 0,
    lines: [],
    note: b.note ?? "",
    key: b.key,
    request: JSON.stringify(b),
  };
  if (type === "transfer") {
    const destination = b.account === "cash" ? "bank" : "cash";
    if (balances(s)[b.account as "cash" | "bank"] < b.paid)
      throw Error("Insufficient account balance");
    e.destination = destination;
  } else if (type === "sale-return") {
    const original = s.events.find(
      (x) => x.id === b.saleId && x.type === "sale",
    );
    if (!original) throw Error("Sale not found");
    if (
      s.events.some(
        (x) => x.type === "sale-return" && x.originalId === original.id,
      )
    )
      throw Error("Invoice already returned");
    if (original.paid !== original.total)
      throw Error(
        "Full refunds currently require a fully paid invoice; credit-note allocation is a later phase",
      );
    if (original.lines.some((l) => !l.batchId))
      throw Error(
        "Historical seed invoices have no reversible batch allocations",
      );
    if (balances(s)[e.account as "cash" | "bank"] < original.total)
      throw Error("Insufficient refund funds");
    for (const l of original.lines) {
      const batch = s.batches.find((x) => x.id === l.batchId);
      if (!batch) throw Error("Original batch not found");
      batch.qty += l.qty;
    }
    e.total = original.total;
    e.paid = original.total;
    e.cost = original.cost;
    e.tax = original.tax ?? 0;
    e.subtotal = original.subtotal ?? original.total;
    e.lines = structuredClone(original.lines);
    e.originalId = original.id;
    e.invoiceNo = `CN-${original.invoiceNo ?? original.id.slice(0, 8)}`;
    e.partyId = original.partyId;
    e.business = original.business;
    e.customer = original.customer;
    e.taxMode = original.taxMode;
  } else throw Error("Unknown professional action");
  s.events.push(e);
  return e;
}
export function reportRows(s: State, from: string, to: string) {
  return s.events
    .filter((e) => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= to)
    .map((e) => ({
      date: e.at.slice(0, 10),
      reference: e.invoiceNo ?? e.id,
      type: e.type,
      party: s.parties.find((p) => p.id === e.partyId)?.name ?? "",
      net_INR: (e.subtotal ?? e.total) / 100,
      tax_INR: (e.tax ?? 0) / 100,
      total_INR: e.total / 100,
      paid_INR: e.paid / 100,
      cogs_INR: e.cost / 100,
      account: e.account,
      note: e.note,
    }));
}
export function csv(rows: Record<string, unknown>[]) {
  const keys = rows.length
    ? Object.keys(rows[0])
    : [
        "date",
        "reference",
        "type",
        "party",
        "net_INR",
        "tax_INR",
        "total_INR",
        "paid_INR",
        "cogs_INR",
        "account",
        "note",
      ];
  const escape = (v: unknown) => {
    let value = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(escape).join(","),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
  ].join("\r\n");
}
