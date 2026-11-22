import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Download,
  Printer,
  ImagePlus,
  Check,
  ArrowUpRight,
  Settings,
  BrainCircuit,
  FileText,
  Copy,
  ChevronRight,
  SlidersHorizontal,
  Package,
  TrendingUp,
} from "lucide-react";
import type { Product, Event, State } from "../server/domain";
import type { Settings as BusinessSettings } from "../server/professional";
import { ProductDetails } from "./product-details";
const money = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((v ?? 0) / 100);
const date = () => new Date().toISOString().slice(0, 10);
const cents = (s: string) => Math.round(Number(s) * 100);
type Props = {
  data: State & { metrics: any };
  run: (path: string, body: any) => Promise<any>;
  busy: boolean;
};
async function get(path: string) {
  const r = await fetch("/api/" + path);
  const b = await r.json();
  if (!r.ok) throw Error(b.error);
  return b;
}
export function ProductPhoto({
  product,
  small = false,
}: {
  product: Product;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  return (
    <span
      className={"product-photo " + (small ? "compact" : "")}
      aria-label={product.name}
    >
      {product.image && !failed ? (
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={small ? 21 : 48} />
      )}
    </span>
  );
}
export function Invoice({
  event: e,
  onClose,
}: {
  event: Event;
  onClose?: () => void;
}) {
  const b = e.business;
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", close);
    };
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invoice preview"
      className={onClose ? "modal-backdrop" : ""}
      onClick={onClose}
    >
      <section className="invoice-paper" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-tools no-print">
          <span>
            <FileText size={17} /> Document preview
          </span>
          <div>
            <button onClick={() => window.print()}>
              <Printer size={15} /> Print / Save PDF
            </button>
            {onClose && (
              <button aria-label="Close invoice" onClick={onClose}>
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="print-document">
          <div className="invoice-top">
            <div>
              <div className="invoice-logo">
                {(b?.name ?? "Green Basket").slice(0, 1)}
              </div>
              <h2>{b?.name ?? "Green Basket"}</h2>
              <p>{b?.address}</p>
              <p>
                {b?.phone}
                {b?.gstin && ` · GSTIN: ${b.gstin}`}
              </p>
            </div>
            <div className="invoice-meta">
              <span className="eyebrow">
                {e.type === "sale-return"
                  ? "CREDIT NOTE"
                  : e.type === "quotation"
                    ? "QUOTATION"
                    : e.tax
                      ? "TAX INVOICE"
                      : "SALES INVOICE"}
              </span>
              <h3>{e.invoiceNo ?? e.id.slice(0, 12)}</h3>
              <p>Issued {e.at.slice(0, 10)}</p>
              <p>
                {e.type === "quotation" ? "Valid until" : "Due date"}{" "}
                {e.dueDate ?? e.at.slice(0, 10)}
              </p>
            </div>
          </div>
          <div className="invoice-customer">
            <span className="eyebrow">
              {e.type === "sale-return" ? "CREDIT TO" : "BILL TO"}
            </span>
            <h3>{e.customer?.name ?? "Walk-in customer"}</h3>
            <p>{e.customer?.address}</p>
            <p>
              {e.customer?.phone}
              {e.customer?.gstin && ` · GSTIN ${e.customer.gstin}`}
            </p>
          </div>
          <table className="invoice-lines">
            <thead>
              <tr>
                <th>Item / HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {e.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <strong>{l.name ?? l.productId}</strong>
                    <small>{l.hsn || "—"}</small>
                  </td>
                  <td>
                    {l.qty} {l.unit ?? "pcs"}
                  </td>
                  <td>{money(l.price)}</td>
                  <td>{money(l.discount ?? 0)}</td>
                  <td>
                    {l.rate ?? 0}%<small>{money(l.tax ?? 0)}</small>
                  </td>
                  <td>
                    {money((l.taxable ?? l.price * l.qty) + (l.tax ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="invoice-bottom">
            <div>
              <h4>Notes & terms</h4>
              <p>{e.note || b?.terms || "Thank you for your business."}</p>
              {e.type === "sale-return" && (
                <p>Original invoice reference: {e.originalId}</p>
              )}
              <span className="pill green">
                {e.type === "quotation"
                  ? "Estimate only"
                  : e.type === "sale-return"
                    ? "Refund recorded"
                    : e.paid >= e.total
                      ? "Paid in full"
                      : "Payment pending"}
              </span>
            </div>
            <dl>
              <div>
                <dt>Taxable value</dt>
                <dd>{money(e.subtotal ?? e.total)}</dd>
              </div>
              {e.taxMode === "IGST" ? (
                <div>
                  <dt>IGST</dt>
                  <dd>{money(e.tax ?? 0)}</dd>
                </div>
              ) : (
                <>
                  <div>
                    <dt>CGST</dt>
                    <dd>{money(Math.floor((e.tax ?? 0) / 2))}</dd>
                  </div>
                  <div>
                    <dt>SGST</dt>
                    <dd>
                      {money((e.tax ?? 0) - Math.floor((e.tax ?? 0) / 2))}
                    </dd>
                  </div>
                </>
              )}
              <div className="invoice-grand">
                <dt>Total</dt>
                <dd>{money(e.total)}</dd>
              </div>
              <div>
                <dt>Amount {e.type === "sale-return" ? "refunded" : "paid"}</dt>
                <dd>{money(e.paid)}</dd>
              </div>
              <div>
                <dt>Balance due</dt>
                <dd>{money(e.type === "quotation" ? 0 : e.total - e.paid)}</dd>
              </div>
            </dl>
          </div>
          <div className="invoice-sign">
            <span>Computer-generated document · SMARTBIZ AI</span>
            <span>Authorized signatory</span>
          </div>
          <p className="invoice-disclaimer">
            GST calculations use your configured rates and sale type. This
            document has not been authenticated by GSTN; e-invoicing and
            statutory filing are not connected.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
export function InvoiceCenter({ data, run, busy }: Props) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Event | null>(null),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [refund, setRefund] = useState<Event | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const sales = [...data.events]
    .reverse()
    .filter((e) => ["sale", "sale-return"].includes(e.type));
  const rows = sales.filter(
    (e) =>
      (!from || e.at.slice(0, 10) >= from) &&
      (!to || e.at.slice(0, 10) <= to) &&
      ((e.invoiceNo ?? e.id) + (e.customer?.name ?? ""))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "paid" ? e.paid === e.total : e.paid < e.total)),
  );
  useEffect(() => setPage(1), [query, filter, from, to]);
  return (
    <>
      <div className="section-stats">
        <Summary
          label="Invoices"
          value={sales.filter((e) => e.type === "sale").length}
        />
        <Summary
          label="Returns"
          value={sales.filter((e) => e.type === "sale-return").length}
        />
        <Summary
          label="GST collected, net of returns"
          value={money(data.metrics.taxCollected ?? 0)}
        />
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="search">
            <Search size={17} />
            <input
              placeholder="Search invoice or customer…"
              aria-label="Search invoices"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Payment status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="due">Payment due</option>
          </select>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Invoice",
                  "Customer",
                  "Net / GST",
                  "Total",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 20, page * 20).map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.invoiceNo ?? e.id.slice(0, 12)}</strong>
                    <small>
                      {e.at.slice(0, 10)}{" "}
                      {e.type === "sale-return" ? " · Credit note" : ""}
                    </small>
                  </td>
                  <td>
                    {e.customer?.name ??
                      data.parties.find((p) => p.id === e.partyId)?.name ??
                      "Walk-in"}
                  </td>
                  <td>
                    {money(e.subtotal ?? e.total)}
                    <small>GST {money(e.tax ?? 0)}</small>
                  </td>
                  <td>
                    <strong>{money(e.total)}</strong>
                  </td>
                  <td>
                    <span
                      className={
                        "pill " + (e.paid >= e.total ? "green" : "amber")
                      }
                    >
                      {e.paid >= e.total
                        ? "Paid"
                        : "Due " + money(e.total - e.paid)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setSelected(e)}>View</button>
                      {e.type === "sale" &&
                        e.lines.every((l) => l.batchId) &&
                        e.paid === e.total &&
                        !data.events.some((x) => x.originalId === e.id) && (
                          <button
                            onClick={() => {
                              setRefund(e);
                              setReason("");
                              setError("");
                            }}
                          >
                            Return
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span>
              Showing{" "}
              {rows.length ? Math.min((page - 1) * 20 + 1, rows.length) : 0}–
              {Math.min(page * 20, rows.length)} of {rows.length} invoices
            </span>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button
              disabled={page * 20 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
          {!rows.length && <p className="empty">No matching invoices.</p>}
        </div>
      </section>
      {selected && (
        <Invoice event={selected} onClose={() => setSelected(null)} />
      )}{" "}
      {refund && (
        <div className="modal-backdrop">
          <section className="panel dialog">
            <h2>Review full invoice return</h2>
            <p>
              {refund.invoiceNo} · {money(refund.total)}
            </p>
            <div className="info">
              Refunds the original paid amount to cash and restores the original
              batches. Expired batches remain blocked for sale. Partial and
              credit-sale returns are not supported yet.
            </div>
            <label>
              Reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button onClick={() => setRefund(null)}>Cancel</button>
              <button
                className="danger"
                disabled={busy || !reason.trim()}
                onClick={async () => {
                  try {
                    await run("actions/sale-return", {
                      saleId: refund.id,
                      account: "cash",
                      note: reason,
                      key: crypto.randomUUID(),
                    });
                    setRefund(null);
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                Confirm full refund
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
export function QuickFind({
  data,
  onNavigate,
}: {
  data: State;
  onNavigate: (page: string, query?: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const options = [
    ...[
      "Billing / POS",
      "Inventory",
      "Invoices & returns",
      "Quotations",
      "Reports & statements",
      "AI insights",
      "Business settings",
      "Operations desk",
      "Purchase orders",
      "Stock count",
      "Cash closing",
      "Cash-flow planner",
      "What-if lab",
      "Connected AI advisor",
      "Audit history",
    ].map((page) => ({
      label: page,
      page,
      query: undefined as string | undefined,
      kind: "Page",
    })),
    ...data.products.map((p) => ({
      label: p.name,
      page: "Inventory",
      query: p.name,
      kind: "Product",
    })),
  ].filter((r) => r.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <button
        className="quick-find-trigger"
        aria-label="Search workspace"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <Search size={15} />
        <span>Search workspace</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <section
            className="panel command-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace search"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-input">
              <Search size={20} />
              <input
                autoFocus
                placeholder="Find a product or open a page…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button aria-label="Close search" onClick={() => setOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="command-results">
              {options.map((o) => (
                <button
                  key={o.kind + o.label}
                  onClick={() => {
                    onNavigate(o.page, o.query);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{o.label}</strong>
                    <small>{o.kind}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
              {!options.length && (
                <p className="empty">No matching products or pages.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export function BusinessSettingsPanel({ data, run, busy }: Props) {
  const [settings, setSettings] = useState<BusinessSettings>(data.settings!),
    [saved, setSaved] = useState(false);
  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Business & invoice settings</h2>
            <p>Your business identity is captured on each new invoice.</p>
          </div>
          <Settings size={21} />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await run("settings", settings);
              setSaved(true);
            } catch {}
          }}
        >
          <div className="form-grid">
            {(
              [
                ["name", "Business name"],
                ["phone", "Business phone"],
                ["address", "Business address"],
                ["gstin", "GSTIN"],
                ["stateCode", "State code"],
                ["invoicePrefix", "Invoice prefix"],
                ["terms", "Invoice terms"],
              ] as const
            ).map(([id, label]) => (
              <label key={id}>
                {label}
                <input
                  required={["name", "stateCode", "invoicePrefix"].includes(id)}
                  value={settings[id]}
                  onChange={(e) => {
                    setSettings({ ...settings, [id]: e.target.value });
                    setSaved(false);
                  }}
                />
              </label>
            ))}
          </div>
          <label className="switch-label">
            <input
              type="checkbox"
              checked={settings.gstEnabled}
              onChange={(e) =>
                setSettings({ ...settings, gstEnabled: e.target.checked })
              }
            />
            <span>
              <strong>Enable GST on new sales</strong>
              <small>
                Uses item rates, discounts, and selected intra/interstate sale
                type.
              </small>
            </span>
          </label>
          <button className="primary" disabled={busy}>
            Save settings
          </button>
          {saved && (
            <span className="saved-label">
              <Check size={15} /> Settings saved
            </span>
          )}
        </form>
      </section>
      <section className="panel settings-note">
        <span className="feature-icon">
          <FileText />
        </span>
        <h2>Consistent, traceable documents.</h2>
        <p>
          New invoices receive sequential numbers, item and business snapshots,
          payment status, and tax details. Earlier invoices retain the
          information they were issued with.
        </p>
        <ul>
          <li>Full JSON backup export</li>
          <li>Date-filtered transaction CSV</li>
          <li>Print or save invoices as PDF</li>
          <li>Separate tax collections from sales profit</li>
        </ul>
        <a className="button" href="/api/export">
          <Download size={16} /> Export business backup
        </a>
      </section>
    </div>
  );
}
export function CatalogManager({ data, run, busy }: Props) {
  const [selected, setSelected] = useState(data.products[0]?.id ?? ""),
    [detailsOpen, setDetailsOpen] = useState(false),
    [saved, setSaved] = useState(""),
    [error, setError] = useState("");
  const product = data.products.find((p) => p.id === selected);
  const [form, setForm] = useState({
    price: "",
    reorder: "",
    unit: "pcs",
    gstRate: 0,
    hsn: "",
    image: "",
  });
  useEffect(() => {
    if (product)
      setForm({
        price: String(product.price / 100),
        reorder: String(product.reorder),
        unit: product.unit ?? "pcs",
        gstRate: product.gstRate ?? 0,
        hsn: product.hsn ?? "",
        image: product.image ?? "",
      });
    setSaved("");
  }, [selected, data.version]);
  if (!product) return null;
  async function upload(file: File) {
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    try {
      const reader = new FileReader();
      const raw = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = raw;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 480;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#f7f8f4";
      context.fillRect(0, 0, 480, 480);
      const scale = Math.min(440 / image.width, 440 / image.height);
      context.drawImage(
        image,
        (480 - image.width * scale) / 2,
        (480 - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
      setForm((f) => ({ ...f, image: canvas.toDataURL("image/jpeg", 0.82) }));
    } catch {
      setError("This image could not be read. Try another file.");
    }
  }
  return (
    <>
      <section className="panel catalog-manager">
        <div className="panel-title">
          <div>
            <h2>Product studio</h2>
            <p>Manage product imagery, pricing, units and tax details.</p>
          </div>
          <ImagePlus size={21} />
        </div>
        <div className="catalog-edit">
          <div className="catalog-preview">
            <ProductPhoto product={{ ...product, image: form.image }} />
            <label className="upload-button">
              <ImagePlus size={16} /> Upload product photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) =>
                  e.target.files?.[0] && upload(e.target.files[0])
                }
              />
            </label>
            <small>JPG, PNG or WebP · compressed locally</small>
            <button
              type="button"
              className="button product-details-open"
              onClick={() => setDetailsOpen(true)}
            >
              <Package size={15} /> View branded product details
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await run("products/" + selected, {
                  ...form,
                  price: cents(form.price),
                  reorder: Number(form.reorder),
                  gstRate: Number(form.gstRate),
                });
                setSaved("Product updated");
              } catch {}
            }}
          >
            <div className="form-grid">
              <label>
                Product
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Selling price (₹)
                <input
                  required
                  type="number"
                  min=".01"
                  step=".01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label>
                Low-stock threshold
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.reorder}
                  onChange={(e) =>
                    setForm({ ...form, reorder: e.target.value })
                  }
                />
              </label>
              <label>
                Unit
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  {["pcs", "kg", "g", "L", "ml", "pack", "box"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label>
                GST rate
                <select
                  value={form.gstRate}
                  onChange={(e) =>
                    setForm({ ...form, gstRate: Number(e.target.value) })
                  }
                >
                  {[0, 5, 12, 18, 28].map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </label>
              <label>
                HSN code
                <input
                  maxLength={10}
                  value={form.hsn}
                  onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                />
              </label>
            </div>
            <button disabled={busy} className="primary">
              Save product
            </button>
            {saved && <span className="saved-label">{saved}</span>}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </div>
      </section>
      {detailsOpen && (
        <ProductDetails
          product={product}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </>
  );
}
export function Reports({ data }: Props) {
  const [from, setFrom] = useState(
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(date()),
    [party, setParty] = useState("");
  const events = data.events.filter(
    (e) => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= to,
  );
  const signed = (e: Event) => (e.type === "sale-return" ? -1 : 1);
  const sales = events.filter(
      (e) => e.type === "sale" || e.type === "sale-return",
    ),
    revenue = sales.reduce(
      (a, e) => a + signed(e) * (e.subtotal ?? e.total),
      0,
    ),
    cogs = sales.reduce((a, e) => a + signed(e) * e.cost, 0),
    expenses = events
      .filter((e) => e.type === "expense")
      .reduce((a, e) => a + e.total, 0),
    waste = events
      .filter((e) => e.type === "writeoff")
      .reduce((a, e) => a + e.cost, 0);
  const transactions = events.filter((e) => !party || e.partyId === party);
  const productRows = data.products
    .map((p) => {
      const lines = sales.flatMap((e) =>
        e.lines
          .filter((l) => l.productId === p.id)
          .map((l) => ({ ...l, sign: signed(e) })),
      );
      return {
        p,
        qty: lines.reduce((a, l) => a + l.qty * l.sign, 0),
        net: lines.reduce(
          (a, l) => a + (l.taxable ?? l.price * l.qty) * l.sign,
          0,
        ),
        cost: lines.reduce((a, l) => a + l.cost * l.sign, 0),
      };
    })
    .sort((a, b) => b.net - a.net);
  return (
    <>
      <section className="panel">
        <div className="filter-bar">
          <h2>Performance reports</h2>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <a className="button" href={`/api/reports.csv?from=${from}&to=${to}`}>
            <Download size={16} /> Download CSV
          </a>
        </div>
      </section>
      <div className="section-stats">
        <Summary label="Net sales" value={money(revenue)} />
        <Summary label="Gross profit" value={money(revenue - cogs)} />
        <Summary
          label="Net profit"
          value={money(revenue - cogs - expenses - waste)}
        />
        <Summary
          label="GST collected"
          value={money(sales.reduce((a, e) => a + signed(e) * (e.tax ?? 0), 0))}
        />
      </div>
      <section className="panel table-wrap">
        <div className="panel-title padded">
          <h2>Product performance</h2>
          <span className="pill">Net of recorded returns</span>
        </div>
        <table>
          <thead>
            <tr>
              {[
                "Product",
                "Units sold",
                "Net revenue",
                "COGS",
                "Gross margin",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productRows.map((r) => (
              <tr key={r.p.id}>
                <td>
                  <div className="product-cell">
                    <ProductPhoto product={r.p} small />
                    <strong>{r.p.name}</strong>
                  </div>
                </td>
                <td>{r.qty}</td>
                <td>{money(r.net)}</td>
                <td>{money(r.cost)}</td>
                <td>{money(r.net - r.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Party statement</h2>
            <p>Period activity and current aggregate outstanding balance.</p>
          </div>
          <select
            aria-label="Statement party"
            value={party}
            onChange={(e) => setParty(e.target.value)}
          >
            <option value="">All parties</option>
            {data.parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {party && (
          <div className="info">
            Current outstanding:{" "}
            {money(data.parties.find((p) => p.id === party)?.due ?? 0)}. Period
            activity below does not represent invoice-level payment allocation.
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Date", "Reference", "Type", "Total", "Money paid"].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {transactions
                .slice()
                .reverse()
                .map((e) => (
                  <tr key={e.id}>
                    <td>{e.at.slice(0, 10)}</td>
                    <td>{e.invoiceNo ?? e.id.slice(0, 12)}</td>
                    <td>{e.type}</td>
                    <td>{money(e.total)}</td>
                    <td>{money(e.paid)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function Intelligence({ data }: Props) {
  const [intel, setIntel] = useState<any>(null),
    [error, setError] = useState(""),
    [question, setQuestion] = useState("Can I afford to buy more stock?"),
    [answer, setAnswer] = useState("");
  useEffect(() => {
    get("intelligence")
      .then(setIntel)
      .catch((e) => setError(e.message));
  }, [data.version]);
  const m = data.metrics;
  function ask(q: string) {
    setQuestion(q);
    const lower = q.toLowerCase();
    if (/profit|sales|revenue/.test(lower))
      setAnswer(
        `Across all recorded periods: net sales ${money(m.revenue)}, batch COGS ${money(m.cogs)}, expenses ${money(m.expenses)}, write-offs ${money(m.waste)}. Net profit = ${money(m.net)}. GST collected ${money(m.taxCollected ?? 0)} is excluded from revenue. Source: recorded sale, refund, expense and write-off events.`,
      );
    else if (/due|owe|customer|supplier/.test(lower))
      setAnswer(
        `Customers owe ${money(m.customerDues)}; suppliers are owed ${money(m.supplierDues)}. These are current aggregate party balances, not overdue-by-invoice amounts. Source: parties and posted payment records.`,
      );
    else if (/expir|waste|stock/.test(lower) && !/afford|buy/.test(lower)) {
      const risk = data.batches.filter(
        (b) =>
          b.qty > 0 &&
          b.expiry <=
            new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      );
      setAnswer(
        `${risk.length} batches are near or past expiry within seven days, carrying ${money(risk.reduce((a, b) => a + b.qty * b.cost, 0))} of stock cost. This is stock exposed, not guaranteed loss. Source: current batch quantities and expiry dates. Review the Expiry manager.`,
      );
    } else if (/afford|cash|buy|money/.test(lower))
      setAnswer(
        `Recorded funds are ${money(m.balances.cash + m.balances.bank)}. Reserving all supplier dues leaves ${money(m.balances.cash + m.balances.bank - m.supplierDues)} before your cash buffer and approved purchase commitments. Use ProfitShield for a stock-aware affordable allocation. Future unrecorded expenses and customer collections are not assumed.`,
      );
    else
      setAnswer(
        "I can calculate profit, cash, customer/supplier dues and near-expiry exposure. Try one of the suggested questions. This is a local ledger assistant with supported intents; it does not invent answers to arbitrary questions.",
      );
  }
  return (
    <>
      <section className="ai-hero">
        <div>
          <span className="eyebrow">PROFITSHIELD INTELLIGENCE</span>
          <h2>Know what the numbers are telling you.</h2>
          <p>
            Local forecasting, visible validation and answers grounded in your
            shop records.
          </p>
        </div>
        <span className="ai-status">
          <span /> Engine running locally
        </span>
      </section>
      <div className="section-stats">
        <Summary label="Forecast engine" value="Statistical models" />
        <Summary label="Validation" value="21-day fit / 7-day holdout" />
        <Summary label="Purchasing" value="Cash & expiry constrained" />
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Demand forecast & model health</h2>
            <p>
              Automatic selection between a mean baseline and fitted weekday
              effects.
            </p>
          </div>
          <BrainCircuit size={23} />
        </div>
        {error && <p role="alert">{error}</p>}
        {!intel && !error ? (
          <p className="empty">Fitting local forecast models…</p>
        ) : (
          intel && (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Product",
                        "Selected model",
                        "Next 7 days",
                        "Next 30 days",
                        "Holdout MAE",
                        "Baseline MAE",
                        "WAPE",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {intel.forecasts.map((f: any) => (
                      <tr key={f.productId}>
                        <td>
                          <strong>{f.name}</strong>
                          <small>{f.observedDays} observed sales days</small>
                        </td>
                        <td>
                          <span className="pill green">{f.model}</span>
                        </td>
                        <td>{f.next7} units</td>
                        <td>{f.next30} units</td>
                        <td>{f.mae} units/day</td>
                        <td>{f.baselineMae} units/day</td>
                        <td>{f.wape === null ? "—" : f.wape + "%"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="info">
                MAE measures units/day error on the held-out week; lower is
                better. Models fall back to a mean with sparse history. Bands
                are heuristic, not calibrated confidence intervals. Sales may
                understate demand during stockouts. This is not a large language
                model or a guarantee of future profit.
              </div>
            </>
          )
        )}
      </section>
      <section className="panel advisor">
        <div className="panel-title">
          <div>
            <h2>Ask your business records</h2>
            <p>Calculated answers with sources and assumptions.</p>
          </div>
          <BrainCircuit />
        </div>
        <div className="question-chips">
          {[
            "How much profit have I made?",
            "Can I afford to buy more stock?",
            "Which batches are near expiry?",
            "Show customer and supplier dues",
          ].map((q) => (
            <button key={q} onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="advisor-input"
        >
          <input
            aria-label="Ask business records"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="primary">
            Calculate answer <ArrowUpRight size={16} />
          </button>
        </form>
        {answer && (
          <div className="advisor-answer">
            <BrainCircuit size={20} />
            <p>{answer}</p>
          </div>
        )}
      </section>
    </>
  );
}
export function PartyReminder({
  name,
  due,
  business,
}: {
  name: string;
  due: number;
  business: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      disabled={!due}
      onClick={async () => {
        await navigator.clipboard.writeText(
          `Hello ${name}, our records at ${business} show an outstanding balance of ${money(due)}. Please contact us to confirm or arrange payment. Thank you.`,
        );
        setCopied(true);
      }}
    >
      <Copy size={14} />
      {copied ? "Copied" : "Copy reminder"}
    </button>
  );
}
export function Quotations({
  data,
  run,
  busy,
  onBill,
}: Props & { onBill: (q: any) => void }) {
  const [party, setParty] = useState(""),
    [until, setUntil] = useState(
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    ),
    [note, setNote] = useState(
      "Prices valid until the date shown. Availability is confirmed when invoiced.",
    ),
    [cart, setCart] = useState<Record<string, number>>({}),
    [product, setProduct] = useState(data.products[0]?.id ?? ""),
    [selected, setSelected] = useState<any>(null),
    [key, setKey] = useState(() => crypto.randomUUID());
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Create a quotation</h2>
            <p>
              Send a clear estimate before a sale. Stock and cash change only
              when invoiced.
            </p>
          </div>
          <FileText />
        </div>
        <div className="form-grid">
          <label>
            Customer
            <select value={party} onChange={(e) => setParty(e.target.value)}>
              <option value="">Walk-in customer</option>
              {data.parties
                .filter((p) => p.kind === "customer")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Valid until
            <input
              type="date"
              min={date()}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <label>
            Add product
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() =>
              setCart({ ...cart, [product]: (cart[product] ?? 0) + 1 })
            }
          >
            Add item
          </button>
        </div>
        {Object.entries(cart).map(([id, qty]) => (
          <div className="quote-line" key={id}>
            <strong>{data.products.find((p) => p.id === id)?.name}</strong>
            <input
              aria-label={`Quoted quantity ${id}`}
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) =>
                setCart({ ...cart, [id]: Math.max(1, Number(e.target.value)) })
              }
            />
            <span>
              {money(
                (data.products.find((p) => p.id === id)?.price ?? 0) * qty,
              )}
            </span>
            <button
              aria-label="Remove quoted item"
              onClick={() => {
                const next = { ...cart };
                delete next[id];
                setCart(next);
              }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <label>
          Notes
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="actions">
          <button
            className="primary"
            disabled={busy || !Object.keys(cart).length || !until}
            onClick={async () => {
              try {
                const q = await run("quotations", {
                  partyId: party || undefined,
                  dueDate: until,
                  note,
                  lines: Object.entries(cart).map(([productId, qty]) => ({
                    productId,
                    qty,
                  })),
                  key,
                });
                setSelected(q);
                setCart({});
                setKey(crypto.randomUUID());
              } catch {}
            }}
          >
            Create quotation
          </button>
        </div>
      </section>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "Quotation",
                "Customer",
                "Valid until",
                "Total",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...(data.quotes ?? [])].reverse().map((q) => (
              <tr key={q.id}>
                <td>
                  <strong>{q.invoiceNo}</strong>
                  <small>{q.at.slice(0, 10)}</small>
                </td>
                <td>{q.customer?.name ?? "Walk-in"}</td>
                <td>{q.dueDate}</td>
                <td>{money(q.total)}</td>
                <td>
                  <span className="pill">
                    {q.status === "open" && q.dueDate < date()
                      ? "expired"
                      : q.status}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => setSelected(q)}>View</button>
                    {q.status === "open" && q.dueDate >= date() && (
                      <button onClick={() => onBill(q)}>Convert to bill</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.quotes?.length && (
          <p className="empty">Your quotations will appear here.</p>
        )}
      </section>
      {selected && (
        <Invoice event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
