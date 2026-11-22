import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  ShieldCheck,
  History,
  Users,
  Wallet,
  Receipt,
  BarChart3,
  Search,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Leaf,
  Download,
  Check,
  X,
  Truck,
  AlertTriangle,
  Printer,
} from "lucide-react";
import type { State, Decision } from "../server/domain";
import "./style.css";
import "./professional.css";
import "./operations.css";
import { Operations } from "./operations";
import { ClipboardCheck, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Settings, BrainCircuit, FileText } from "lucide-react";
import {
  ProductPhoto,
  Invoice,
  InvoiceCenter,
  BusinessSettingsPanel,
  CatalogManager,
  Reports,
  Intelligence,
  PartyReminder,
  Quotations,
  QuickFind,
} from "./professional";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((n ?? 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
type Data = State & {
  metrics: any;
  mode: string;
  replays: Record<string, any>;
};
const pages = [
  ["Operations desk", ClipboardCheck],
  ["Overview", LayoutDashboard],
  ["Billing / POS", ShoppingCart],
  ["Inventory", Boxes],
  ["Expiry manager", Leaf],
  ["Sales & purchases", Receipt],
  ["Customers & suppliers", Users],
  ["Cashbook", Wallet],
  ["Expenses", Receipt],
  ["Profit & loss", BarChart3],
  ["ProfitShield AI", ShieldCheck],
  ["PurchaseGuard Replay", History],
  ["Invoices & returns", FileText],
  ["Quotations", FileText],
  ["Reports & statements", BarChart3],
  ["AI insights", BrainCircuit],
  ["Business settings", Settings],
  ["Purchase orders", Truck],
  ["Stock count", Boxes],
  ["Cash closing", Wallet],
  ["Cash-flow planner", CalendarDays],
  ["What-if lab", SlidersHorizontal],
  ["Connected AI advisor", BrainCircuit],
  ["Audit history", History],
] as const;
async function api(path: string, body?: unknown) {
  const r = await fetch(
    "/api/" + path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const v = await r.json();
  if (!r.ok) throw Error(v.error ?? "Request failed");
  return v;
}
function App() {
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState("Operations desk"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [needsLogin, setNeedsLogin] = useState(false),
    [quoteForSale, setQuoteForSale] = useState<any>(null);
  const refresh = async () => setData(await api("state"));
  useEffect(() => {
    refresh().catch((e) => {
      if (e.message === "Sign in required") setNeedsLogin(true);
      else setError(e.message);
    });
  }, []);
  const run = async (path: string, body: unknown) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api(path, body);
      await refresh();
      setNotice("Saved successfully");
      return r;
    } catch (e: any) {
      setError(e.message);
      if (e.message === "Sign in required") setNeedsLogin(true);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  if (needsLogin)
    return (
      <Login
        onSuccess={async () => {
          await refresh();
          setNeedsLogin(false);
        }}
      />
    );
  if (!data)
    return (
      <main className="loading">
        <ShieldCheck size={44} />
        <h1>SMARTBIZ AI</h1>
        <p>{error || "Opening your shop…"}</p>
      </main>
    );
  const m = data.metrics,
    name = (id: string) => data.products.find((p) => p.id === id)?.name ?? id;
  const stock = (id: string) =>
    data.batches
      .filter((b) => b.productId === id && b.expiry >= today())
      .reduce((a, b) => a + b.qty, 0);
  const low = data.products.filter((p) => stock(p.id) < p.reorder),
    expiring = data.batches.filter(
      (b) =>
        b.qty > 0 &&
        b.expiry <=
          new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    );
  const navigate = (p: string) => {
    if (p !== "Billing / POS") setQuoteForSale(null);
    setPage(p);
    setSearch("");
    setNotice("");
    setError("");
  };
  return (
    <div className="shell">
      <aside>
        <a className="brand" onClick={() => navigate("Overview")}>
          <span className="brand-icon">
            <ShieldCheck />
          </span>
          <div>
            SMARTBIZ <b>AI</b>
            <small>YOUR SHOP. ONE SMARTER SYSTEM.</small>
          </div>
        </a>
        <div className="shop">
          <div className="shop-avatar">G</div>
          <div>
            <strong>{data.settings?.name ?? "Green Basket"}</strong>
            <small>Grocery & general store</small>
          </div>
          <ChevronRight size={16} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {pages.map(([p, Icon], i) => (
            <button
              key={p}
              className={page === p ? "selected" : ""}
              onClick={() => navigate(p)}
            >
              <Icon size={18} />
              {p}
              {p === "ProfitShield AI" && <span className="new">AI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-dot" /> Single-shop workspace
          <small>{data.mode}</small>
          <a href="/api/export">
            <Download size={15} /> Export backup
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <strong>{page}</strong>
          </div>
          <div className="header-right">
            <QuickFind
              data={data}
              onNavigate={(p, q) => {
                navigate(p);
                if (q) setSearch(q);
              }}
            />
            <span className="online">
              <i /> All records connected
            </span>
            <button
              className="text-button"
              onClick={async () => {
                await api("logout", {});
                setData(null);
                setNeedsLogin(true);
              }}
            >
              Sign out
            </button>
            <div className="avatar">GB</div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {(data.settings?.name ?? "Green Basket").toUpperCase()} •
                BUSINESS WORKSPACE
              </div>
              <h1>
                {page === "Overview"
                  ? "A clearer view of your business."
                  : page}
              </h1>
              <p>
                {page === "Overview"
                  ? "Everything your shop needs. Every decision, a little smarter."
                  : page === "ProfitShield AI"
                    ? "Buy what your shop can sell — and what your cash can support."
                    : page === "PurchaseGuard Replay"
                      ? "Follow each approved recommendation into its actual batch outcomes."
                      : "Connected records keep your stock, dues, profit and money in sync."}
              </p>
            </div>
            <div className="heading-actions">
              <span className="date">
                {new Date().toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                className="primary"
                onClick={() => {
                  setQuoteForSale(null);
                  navigate("Billing / POS");
                }}
              >
                <Plus size={17} /> New sale
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
              <button onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {[
            "Operations desk",
            "Purchase orders",
            "Stock count",
            "Cash closing",
            "Cash-flow planner",
            "What-if lab",
            "Connected AI advisor",
            "Audit history",
          ].includes(page) && (
            <Operations
              key={page}
              page={page}
              data={data}
              run={run}
              busy={busy}
            />
          )}
          {page === "Overview" && (
            <>
              <div className="metrics">
                {[
                  [
                    "Net sales",
                    m.revenue,
                    "All recorded sales, after discounts",
                  ],
                  [
                    "Net profit",
                    m.net,
                    "Sales − batch costs − expenses − write-offs",
                  ],
                  [
                    "Cash + bank",
                    m.balances.cash + m.balances.bank,
                    "Actual recorded funds across accounts",
                  ],
                  [
                    "Customer dues",
                    m.customerDues,
                    "Credit awaiting collection",
                  ],
                ].map(([label, value, sub], i) => (
                  <div className="metric" key={String(label)}>
                    <div>
                      {label}
                      <span className={"metric-icon c" + i}>
                        {i === 0 ? (
                          <ShoppingCart size={18} />
                        ) : i === 1 ? (
                          <BarChart3 size={18} />
                        ) : i === 2 ? (
                          <Wallet size={18} />
                        ) : (
                          <Users size={18} />
                        )}
                      </span>
                    </div>
                    <strong>{money(Number(value))}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <h2>Sales at a glance</h2>
                      <p>Daily billed amount · last 7 days</p>
                    </div>
                    <span className="pill">Recorded sales</span>
                  </div>
                  <Chart data={data} />
                  <div className="chart-footer">
                    <span>
                      <i /> Net sales
                    </span>
                    <span>All amounts in INR</span>
                  </div>
                </section>
                <section className="shield-card">
                  <span className="shield-label">
                    <ShieldCheck size={18} /> PROFITSHIELD AI
                  </span>
                  <h2>
                    Good stock decisions.
                    <br />
                    Healthier cash flow.
                  </h2>
                  <p>
                    Balance demand, expiry, supplier prices and your cash before
                    the next order.
                  </p>
                  <div className="shield-facts">
                    <span>
                      <Check size={15} /> Reserve upcoming dues
                    </span>
                    <span>
                      <Check size={15} /> Explain every recommendation
                    </span>
                    <span>
                      <Check size={15} /> Track actual outcomes
                    </span>
                  </div>
                  <button onClick={() => navigate("ProfitShield AI")}>
                    Plan a smarter purchase <ArrowUpRight size={18} />
                  </button>
                  <small>Backtested forecasts · Owner approval required</small>
                </section>
              </div>
              <div className="overview-grid bottom-grid">
                <section className="panel">
                  <div className="panel-title">
                    <h2>Needs your attention</h2>
                    <span className="pill amber">
                      {low.length + expiring.length} alerts
                    </span>
                  </div>
                  <Attention
                    title={`${low.length} products running low`}
                    text="Review forecast shortages before replenishing."
                    icon={<Boxes />}
                    onClick={() => navigate("Inventory")}
                  />
                  <Attention
                    title={`${expiring.length} batches near or past expiry`}
                    text="Prioritize FEFO selling and review at-risk stock."
                    icon={<Leaf />}
                    onClick={() => navigate("Expiry manager")}
                  />
                  <Attention
                    title={`${money(m.supplierDues)} supplier dues`}
                    text="Reserve existing obligations before new spending."
                    icon={<Wallet />}
                    onClick={() => navigate("Customers & suppliers")}
                  />
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>Recent activity</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("Sales & purchases")}
                    >
                      View all <ChevronRight size={15} />
                    </button>
                  </div>
                  {[...data.events]
                    .reverse()
                    .slice(0, 4)
                    .map((e) => (
                      <div className="activity" key={e.id}>
                        <div className="activity-icon">
                          <Receipt size={18} />
                        </div>
                        <div>
                          <strong>{e.type.replace("-", " ")}</strong>
                          <small>
                            {e.note || e.id.slice(0, 8)} · {e.at.slice(0, 10)}
                          </small>
                        </div>
                        <b>{money(e.total || e.cost)}</b>
                      </div>
                    ))}
                </section>
              </div>
              <div className="footnote">
                <ShieldCheck size={15} /> One connected ledger. Sales update
                stock, dues, cash and profit together.
                <span>Historical period: 28 days</span>
              </div>
            </>
          )}
          {page === "Billing / POS" && (
            <POS
              key={quoteForSale?.id ?? "new"}
              data={data}
              run={run}
              busy={busy}
              initialQuote={quoteForSale}
              onCompleted={() => setQuoteForSale(null)}
            />
          )}
          {page === "Quotations" && (
            <Quotations
              data={data}
              run={run}
              busy={busy}
              onBill={(q) => {
                setQuoteForSale(q);
                navigate("Billing / POS");
              }}
            />
          )}
          {page === "Invoices & returns" && (
            <InvoiceCenter data={data} run={run} busy={busy} />
          )}
          {page === "Reports & statements" && (
            <Reports data={data} run={run} busy={busy} />
          )}
          {page === "AI insights" && (
            <Intelligence data={data} run={run} busy={busy} />
          )}
          {page === "Business settings" && (
            <BusinessSettingsPanel data={data} run={run} busy={busy} />
          )}
          {page === "Inventory" && (
            <>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Search inventory"
                    placeholder="Search product or barcode…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="pill">FEFO stock rotation</span>
              </div>
              <Table
                headers={[
                  "Product",
                  "Category",
                  "Selling price",
                  "Usable stock",
                  "Status",
                ]}
                rows={data.products
                  .filter((p) =>
                    (p.name + p.barcode)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((p) => [
                    <div className="product-cell">
                      <ProductPhoto product={p} small />
                      <strong>
                        {p.name}
                        <small>
                          {p.barcode} · {p.unit ?? "pcs"}
                        </small>
                      </strong>
                    </div>,
                    p.category,
                    money(p.price),
                    `${stock(p.id)} units`,
                    <span
                      className={
                        "pill " + (stock(p.id) < p.reorder ? "amber" : "green")
                      }
                    >
                      {stock(p.id) < p.reorder ? "Low stock" : "Healthy"}
                    </span>,
                  ])}
              />
              <CatalogManager data={data} run={run} busy={busy} />
              <div className="two-forms">
                <Form
                  title="Add product"
                  busy={busy}
                  submit={(v) =>
                    run("products", {
                      name: v.name,
                      category: v.category,
                      barcode: v.barcode,
                      price: cents(v.price),
                      reorder: Number(v.reorder),
                    })
                  }
                  fields={[
                    ["name", "Product name"],
                    ["category", "Category"],
                    ["barcode", "Barcode / SKU"],
                    ["price", "Selling price (₹)", "number"],
                    ["reorder", "Low stock threshold", "number"],
                  ]}
                />
                <Form
                  title="Receive a purchase"
                  busy={busy}
                  submit={(v) =>
                    run("actions/purchase", {
                      ...v,
                      qty: Number(v.qty),
                      cost: cents(v.cost),
                      paid: cents(v.paid),
                      key: crypto.randomUUID(),
                    })
                  }
                  fields={[
                    ["productId", "Product", "select", data.products],
                    [
                      "partyId",
                      "Supplier",
                      "select",
                      data.parties.filter((p) => p.kind === "supplier"),
                    ],
                    ["code", "Batch code"],
                    ["qty", "Quantity", "number"],
                    ["cost", "Unit cost (₹)", "number"],
                    ["expiry", "Expiry", "date"],
                    ["paid", "Paid now (₹)", "number"],
                    [
                      "account",
                      "Payment account",
                      "select",
                      [
                        { id: "cash", name: "Cash" },
                        { id: "bank", name: "Bank / UPI / card" },
                      ],
                    ],
                  ]}
                />
              </div>
            </>
          )}
          {page === "Expiry manager" && (
            <>
              <div className="info">
                <Leaf size={20} /> Expired batches are blocked at checkout.
                Forecast risk uses the trailing 28-day daily average; it is an
                estimate.
              </div>
              <Table
                headers={[
                  "Product / batch",
                  "Expiry date",
                  "Remaining",
                  "Cost value",
                  "Estimated unsold",
                  "Action",
                ]}
                rows={[...data.batches]
                  .filter((b) => b.qty > 0)
                  .sort((a, b) => a.expiry.localeCompare(b.expiry))
                  .map((b) => {
                    const rate =
                      data.events
                        .filter(
                          (e) =>
                            e.type === "sale" &&
                            e.at.slice(0, 10) < today() &&
                            e.at.slice(0, 10) >=
                              new Date(Date.now() - 28 * 86400000)
                                .toISOString()
                                .slice(0, 10),
                        )
                        .flatMap((e) => e.lines)
                        .filter((l) => l.productId === b.productId)
                        .reduce((a, l) => a + l.qty, 0) / 28;
                    const days = Math.max(
                      0,
                      Math.floor(
                        (Date.parse(b.expiry) - Date.parse(today())) / 86400000,
                      ) + 1,
                    );
                    const ahead = data.batches
                      .filter(
                        (x) =>
                          x.productId === b.productId &&
                          x.expiry >= today() &&
                          (x.expiry < b.expiry ||
                            (x.expiry === b.expiry && x.id < b.id)),
                      )
                      .reduce((a, x) => a + x.qty, 0);
                    return [
                      <strong>
                        {name(b.productId)}
                        <small>{b.code}</small>
                      </strong>,
                      <span
                        className={
                          "pill " +
                          (b.expiry < today()
                            ? "red"
                            : days <= 7
                              ? "amber"
                              : "green")
                        }
                      >
                        {b.expiry}
                      </span>,
                      b.qty,
                      money(b.cost * b.qty),
                      Math.max(
                        0,
                        Math.ceil(b.qty - Math.max(0, rate * days - ahead)),
                      ),
                      <button
                        disabled={busy}
                        onClick={() =>
                          run("actions/writeoff", {
                            batchId: b.id,
                            qty: b.qty,
                            note: "Owner reviewed expiry / damage write-off",
                            key: crypto.randomUUID(),
                          }).catch(() => {})
                        }
                      >
                        Write off batch
                      </button>,
                    ];
                  })}
              />
            </>
          )}
          {page === "Sales & purchases" && (
            <>
              <div className="toolbar">
                <h2>Transaction register</h2>
                <a className="button" href="/api/export">
                  <Download size={16} /> Export records
                </a>
              </div>
              <Table
                headers={[
                  "Reference / date",
                  "Type",
                  "Amount",
                  "Paid",
                  "Batch cost / COGS",
                  "Account",
                ]}
                rows={[...data.events].reverse().map((e) => [
                  <strong>
                    {e.id.slice(0, 12)}
                    <small>
                      {e.at.slice(0, 10)} · {e.note}
                    </small>
                  </strong>,
                  <span className="pill">{e.type}</span>,
                  money(e.total),
                  money(e.paid),
                  money(e.cost),
                  e.account,
                ])}
              />
            </>
          )}
          {page === "Customers & suppliers" && (
            <>
              <Table
                headers={[
                  "Name",
                  "Type",
                  "Outstanding balance",
                  "Reminder draft",
                ]}
                rows={data.parties.map((p) => [
                  <strong>{p.name}</strong>,
                  <span className="pill">{p.kind}</span>,
                  money(p.due),
                  p.kind === "customer" ? (
                    <PartyReminder
                      name={p.name}
                      due={p.due}
                      business={data.settings?.name ?? "Green Basket"}
                    />
                  ) : (
                    <span>—</span>
                  ),
                ])}
              />
              <div className="two-forms">
                <Form
                  title="Add customer or supplier"
                  busy={busy}
                  fields={[
                    ["name", "Name"],
                    ["phone", "Phone"],
                    ["address", "Address"],
                    ["gstin", "GSTIN"],
                    [
                      "creditLimit",
                      "Credit limit (₹, 0 = unlimited)",
                      "number",
                    ],
                    [
                      "kind",
                      "Type",
                      "select",
                      [
                        { id: "customer", name: "Customer" },
                        { id: "supplier", name: "Supplier" },
                      ],
                    ],
                  ]}
                  submit={(v) =>
                    run("parties", { ...v, creditLimit: cents(v.creditLimit) })
                  }
                />
                <Form
                  title="Settle outstanding dues"
                  busy={busy}
                  fields={[
                    ["partyId", "Party", "select", data.parties],
                    ["paid", "Amount (₹)", "number"],
                    [
                      "account",
                      "Account",
                      "select",
                      [
                        { id: "cash", name: "Cash" },
                        { id: "bank", name: "Bank / UPI / card" },
                      ],
                    ],
                  ]}
                  submit={(v) =>
                    run(
                      "actions/" +
                        (data.parties.find((p) => p.id === v.partyId)?.kind ===
                        "customer"
                          ? "customer-payment"
                          : "supplier-payment"),
                      { ...v, paid: cents(v.paid), key: crypto.randomUUID() },
                    )
                  }
                />
              </div>
              <Form
                title="Add supplier quotation"
                busy={busy}
                fields={[
                  ["productId", "Product", "select", data.products],
                  [
                    "supplierId",
                    "Supplier",
                    "select",
                    data.parties.filter((p) => p.kind === "supplier"),
                  ],
                  ["cost", "Unit cost (₹)", "number"],
                  ["moq", "Minimum units", "number"],
                  ["lead", "Lead time (days)", "number"],
                  ["shelf", "Shelf life on receipt (days)", "number"],
                  ["fee", "Delivery fee per product line (₹)", "number"],
                ]}
                submit={(v) =>
                  run("offers", {
                    ...v,
                    cost: cents(v.cost),
                    fee: cents(v.fee),
                    moq: Number(v.moq),
                    lead: Number(v.lead),
                    shelf: Number(v.shelf),
                  })
                }
              />
              <Table
                headers={[
                  "Product",
                  "Supplier",
                  "Unit cost",
                  "MOQ",
                  "Lead / shelf life",
                  "Delivery fee",
                ]}
                rows={data.offers.map((o) => [
                  name(o.productId),
                  data.parties.find((p) => p.id === o.supplierId)?.name,
                  money(o.cost),
                  o.moq,
                  `${o.lead} / ${o.shelf} days`,
                  money(o.fee),
                ])}
              />
            </>
          )}
          {page === "Cashbook" && (
            <>
              <div className="metrics three">
                {[
                  ["Cash", m.balances.cash],
                  ["Bank / UPI / card", m.balances.bank],
                  ["Supplier obligations", m.supplierDues],
                ].map(([l, v]) => (
                  <div className="metric" key={String(l)}>
                    <div>{l}</div>
                    <strong>{money(Number(v))}</strong>
                  </div>
                ))}
              </div>
              <div className="info">
                <Wallet size={20} /> Customer collections reduce receivables;
                supplier payments reduce payables. Neither changes profit. Owner
                investment adds money without creating sales.
              </div>
              <Form
                title="Transfer between accounts"
                busy={busy}
                fields={[
                  ["paid", "Amount (₹)", "number"],
                  [
                    "account",
                    "From account",
                    "select",
                    [
                      { id: "cash", name: "Cash → Bank" },
                      { id: "bank", name: "Bank → Cash" },
                    ],
                  ],
                  ["note", "Reference"],
                ]}
                submit={(v) =>
                  run("actions/transfer", {
                    ...v,
                    paid: cents(v.paid),
                    key: crypto.randomUUID(),
                  })
                }
              />
              <Form
                title="Record owner investment"
                busy={busy}
                fields={[
                  ["paid", "Amount (₹)", "number"],
                  [
                    "account",
                    "Account",
                    "select",
                    [
                      { id: "cash", name: "Cash" },
                      { id: "bank", name: "Bank" },
                    ],
                  ],
                  ["note", "Reference"],
                ]}
                submit={(v) =>
                  run("actions/investment", {
                    ...v,
                    paid: cents(v.paid),
                    key: crypto.randomUUID(),
                  })
                }
              />
              <Table
                headers={["Date", "Type", "Account", "Money in", "Money out"]}
                rows={[...data.events]
                  .reverse()
                  .filter((e) => e.paid)
                  .map((e) => {
                    const out = [
                      "purchase",
                      "expense",
                      "supplier-payment",
                      "sale-return",
                      "transfer",
                    ].includes(e.type);
                    return [
                      e.at.slice(0, 10),
                      e.type,
                      e.type === "transfer"
                        ? `${e.account} → ${e.destination}`
                        : e.account,
                      out ? "—" : money(e.paid),
                      out ? money(e.paid) : "—",
                    ];
                  })}
              />
            </>
          )}
          {page === "Expenses" && (
            <>
              <Form
                title="Record operating expense"
                busy={busy}
                fields={[
                  ["note", "Description / category"],
                  ["paid", "Amount (₹)", "number"],
                  [
                    "account",
                    "Paid from",
                    "select",
                    [
                      { id: "cash", name: "Cash" },
                      { id: "bank", name: "Bank" },
                    ],
                  ],
                ]}
                submit={(v) =>
                  run("actions/expense", {
                    ...v,
                    paid: cents(v.paid),
                    key: crypto.randomUUID(),
                  })
                }
              />
              <Table
                headers={["Date", "Description", "Account", "Amount"]}
                rows={data.events
                  .filter((e) => e.type === "expense")
                  .reverse()
                  .map((e) => [
                    e.at.slice(0, 10),
                    e.note,
                    e.account,
                    money(e.total),
                  ])}
              />
            </>
          )}
          {page === "Profit & loss" && (
            <>
              <section className="panel report">
                <div className="panel-title">
                  <div>
                    <h2>Profit & loss statement</h2>
                    <p>
                      All recorded periods · INR · GST excluded from revenue
                    </p>
                  </div>
                  <BarChart3 />
                </div>
                {[
                  ["Net sales after discounts", m.revenue],
                  ["Less: actual batch cost of goods sold", -m.cogs],
                  ["Gross profit", m.gross],
                  ["Less: operating expenses", -m.expenses],
                  ["Less: stock write-offs", -m.waste],
                  ["Net profit", m.net],
                ].map(([l, v], i) => (
                  <div
                    className={
                      "report-row " + ([2, 5].includes(i) ? "subtotal" : "")
                    }
                    key={String(l)}
                  >
                    <span>{l}</span>
                    <b>{money(Number(v))}</b>
                  </div>
                ))}
              </section>
              <div className="info">
                Inventory purchases become stock assets; only sold units enter
                COGS. Purchase delivery fees are expensed on receipt. Credit
                sales recognize revenue before collection. Configured GST is
                excluded from revenue. Period closing and statutory filing
                remain outside the MVP.
              </div>
            </>
          )}
          {page === "ProfitShield AI" && (
            <>
              <div className="info">
                <ShieldCheck size={21} /> Transparent purchase planning: 28-day
                backtested forecast, expiry capacity, profitable supplier
                offers, MOQ and cash after reserves. Forecast uncertainty is
                uncalibrated; review before ordering.
              </div>
              <Form
                title="Create a purchase plan"
                busy={busy}
                defaults={{ budget: "10000", reserve: "5000", horizon: "7" }}
                fields={[
                  ["budget", "Maximum budget (₹)", "number"],
                  ["reserve", "Keep cash buffer (₹)", "number"],
                  ["horizon", "Forecast horizon (days)", "number"],
                ]}
                submit={(v) =>
                  run("recommendations", {
                    budget: cents(v.budget),
                    reserve: cents(v.reserve),
                    horizon: Number(v.horizon),
                  })
                }
                button="Generate recommendation"
              />
              {[...data.decisions].reverse().map((d) => (
                <DecisionCard key={d.id} d={d} run={run} busy={busy} />
              ))}
            </>
          )}
          {page === "PurchaseGuard Replay" && (
            <>
              <div className="info">
                <History size={21} /> PurchaseGuard links recommended quantities
                to received batches, sales and write-offs. Actual results
                accumulate as you run the shop. Future outcomes are never
                fabricated.
              </div>
              {data.decisions.length === 0 ? (
                <Empty text="Create your first ProfitShield plan to begin tracking decisions." />
              ) : (
                [...data.decisions].reverse().map((d) => {
                  const r = data.replays[d.id];
                  return (
                    <section className="panel" key={d.id}>
                      <div className="panel-title">
                        <h2>
                          Plan {d.id.slice(0, 8)}{" "}
                          <span className="pill">{d.status}</span>
                        </h2>
                        <span>
                          {d.created.slice(0, 10)} · {r.ageDays} days observed
                        </span>
                      </div>
                      <div className="metrics replay-metrics">
                        {[
                          [
                            "Recommended",
                            d.items.reduce((a, x) => a + x.qty, 0),
                          ],
                          ["Received", r.received],
                          ["Sold", r.sold],
                          ["Remaining", r.remaining],
                          ["Observed margin", money(r.realizedMargin)],
                          ["Written off", money(r.waste)],
                        ].map(([l, v]) => (
                          <div key={l}>
                            <small>{l}</small>
                            <strong>{v}</strong>
                          </div>
                        ))}
                      </div>
                      <p className="muted">{r.note}</p>
                      <p className="muted">
                        Evaluation window: {d.horizon} days.{" "}
                        {r.ageDays < d.horizon
                          ? "Still observing; no completed-window result."
                          : "Window elapsed; historical cutoff replay is a future extension."}
                      </p>
                    </section>
                  );
                })
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function Attention({ title, text, icon, onClick }: any) {
  return (
    <button className="attention" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table-wrap panel">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <Empty text="No records yet. Add your first record above." />
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Boxes size={28} />
      <p>{text}</p>
    </div>
  );
}
const cents = (v: string) => Math.round(Number(v) * 100);
type Field = [string, string, string?, { id: string; name: string }[]?];
function Form({
  title,
  fields,
  submit,
  busy,
  defaults = {},
  button = "Save record",
}: {
  title: string;
  fields: Field[];
  submit: (v: Record<string, string>) => Promise<any>;
  busy: boolean;
  defaults?: Record<string, string>;
  button?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map(([id, , type, options]) => [
        id,
        defaults[id] ?? (type === "select" ? (options?.[0]?.id ?? "") : ""),
      ]),
    ),
  );
  return (
    <section className="panel form-panel">
      <h2>{title}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await submit(values);
          } catch {}
        }}
      >
        <div className="form-grid">
          {fields.map(([id, label, type = "text", options]) => (
            <label key={id}>
              {label}
              {type === "select" ? (
                <select
                  required
                  value={values[id] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [id]: e.target.value })
                  }
                >
                  {!options?.length && (
                    <option value="">Add a record first</option>
                  )}
                  {options?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={!["phone", "address", "gstin", "hsn"].includes(id)}
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  step={type === "number" ? "0.01" : undefined}
                  value={values[id] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [id]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
        </div>
        <button disabled={busy} className="primary" type="submit">
          {busy ? "Saving…" : button}
        </button>
      </form>
    </section>
  );
}
function DecisionCard({
  d,
  run,
  busy,
}: {
  d: Decision;
  run: any;
  busy: boolean;
}) {
  return (
    <section className="panel decision">
      <div className="panel-title">
        <div>
          <h2>
            Purchase plan <span className="pill">{d.status}</span>
          </h2>
          <p>
            {d.created.slice(0, 16).replace("T", " ")} · {d.horizon}-day horizon
            · Available {money(d.available)}
          </p>
        </div>
        <strong>
          {money(d.items.reduce((a, x) => a + x.spend, 0))} planned
        </strong>
      </div>
      <Table
        headers={[
          "Product",
          "Forecast / stock",
          "Suggested order",
          "Cost",
          "Why this quantity?",
        ]}
        rows={d.items.map((x) => [
          <strong>{x.name}</strong>,
          `${x.forecast} / ${x.stock}`,
          `${x.qty} units`,
          money(x.spend),
          <span className="explanation">{x.explanation}</span>,
        ])}
      />
      <p className="muted">{d.reason}</p>
      <div className="actions">
        {d.status === "pending" && (
          <>
            <button
              className="primary"
              disabled={busy || !d.items.some((x) => x.qty > 0)}
              onClick={() =>
                run(`recommendations/${d.id}/approved`, {}).catch(() => {})
              }
            >
              <Check size={16} /> Approve plan
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(`recommendations/${d.id}/rejected`, {}).catch(() => {})
              }
            >
              Reject
            </button>
          </>
        )}
        {d.status === "approved" && (
          <button
            disabled={busy}
            onClick={() =>
              run(`recommendations/${d.id}/rejected`, {}).catch(() => {})
            }
          >
            Cancel approval
          </button>
        )}
        {d.status === "approved" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(`recommendations/${d.id}/receive`, {}).catch(() => {})
            }
          >
            <Truck size={16} /> Confirm physical receipt & pay
          </button>
        )}
      </div>
    </section>
  );
}
function POS({
  data,
  run,
  busy,
  initialQuote,
  onCompleted,
}: {
  data: Data;
  run: any;
  busy: boolean;
  initialQuote?: any;
  onCompleted: () => void;
}) {
  const [query, setQuery] = useState(""),
    [cart, setCart] = useState<Record<string, number>>(
      initialQuote
        ? Object.fromEntries(
            initialQuote.lines.map((l: any) => [l.productId, l.qty]),
          )
        : {},
    ),
    [customer, setCustomer] = useState(initialQuote?.partyId ?? ""),
    [account, setAccount] = useState("cash"),
    [paid, setPaid] = useState(""),
    [discount, setDiscount] = useState("0"),
    [receipt, setReceipt] = useState<any>(null),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [category, setCategory] = useState("All items"),
    [interstate, setInterstate] = useState(false),
    [dueDate, setDueDate] = useState(today()),
    [preview, setPreview] = useState<any>(null),
    [previewError, setPreviewError] = useState("");
  useEffect(() => {
    let active = true;
    setPreview(null);
    setPreviewError("");
    if (!Object.keys(cart).length) return;
    const timeout = setTimeout(() => {
      api("checkout-preview", {
        lines: Object.entries(cart).map(([productId, qty]) => ({
          productId,
          qty,
        })),
        discount: cents(discount),
        interstate,
      })
        .then((v) => {
          if (active) setPreview(v);
        })
        .catch((e) => {
          if (active) setPreviewError(e.message);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [JSON.stringify(cart), discount, interstate, data.version]);
  const total =
    preview?.total ??
    Object.entries(cart).reduce(
      (a, [id, q]) =>
        a + (data.products.find((p) => p.id === id)?.price ?? 0) * q,
      0,
    ) - cents(discount);
  return (
    <div className="pos-layout">
      <section>
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Search product or scan barcode"
            placeholder="Search a product or enter barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="category-tabs">
          {["All items", ...new Set(data.products.map((p) => p.category))].map(
            (c) => (
              <button
                className={c === category ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ),
          )}
        </div>
        <div className="product-grid">
          {data.products
            .filter(
              (p) =>
                (category === "All items" || p.category === category) &&
                (p.name + p.barcode)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((p) => {
              const stock = data.batches
                .filter((b) => b.productId === p.id && b.expiry >= today())
                .reduce((a, b) => a + b.qty, 0);
              return (
                <button
                  className="product-card"
                  disabled={!stock}
                  key={p.id}
                  onClick={() => {
                    setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 });
                    setReceipt(null);
                  }}
                >
                  <ProductPhoto product={p} />
                  <small>{p.category}</small>
                  <strong>{p.name}</strong>
                  <div>
                    <b>{money(p.price)}</b>
                    <span>{stock} available</span>
                  </div>
                  <Plus size={17} />
                </button>
              );
            })}
        </div>
      </section>
      <section className="panel checkout">
        <div className="panel-title">
          <h2>Current bill</h2>
          <span className="pill">FEFO</span>
        </div>
        {Object.entries(cart).map(([id, q]) => {
          const p = data.products.find((p) => p.id === id)!;
          return (
            <div className="cart-line" key={id}>
              <ProductPhoto product={p} small />
              <div>
                <strong>{p.name}</strong>
                <small>{money(p.price)} each</small>
              </div>
              <input
                aria-label={`Quantity ${p.name}`}
                type="number"
                min="1"
                max="100000"
                value={q}
                onChange={(e) =>
                  setCart({
                    ...cart,
                    [id]: Math.max(1, Number(e.target.value)),
                  })
                }
              />
              <button
                aria-label={`Remove ${p.name}`}
                onClick={() => {
                  const c = { ...cart };
                  delete c[id];
                  setCart(c);
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
        {!Object.keys(cart).length && (
          <Empty text="Select products to start a bill." />
        )}
        <label>
          Customer (required for credit)
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
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
          Invoice discount (₹)
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
        <label>
          Payment account
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank / UPI / card</option>
          </select>
        </label>
        <label>
          Paid now (₹) · blank = full payment
          <input
            type="number"
            min="0"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder={String(Math.max(0, total) / 100)}
          />
        </label>
        <div className="checkout-fields">
          <label>
            Payment due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          {data.settings?.gstEnabled && (
            <label>
              GST supply type
              <select
                value={interstate ? "inter" : "intra"}
                onChange={(e) => setInterstate(e.target.value === "inter")}
              >
                <option value="intra">Intrastate · CGST + SGST</option>
                <option value="inter">Interstate · IGST</option>
              </select>
            </label>
          )}
        </div>
        {preview && (
          <div className="tax-summary">
            <span>
              Taxable amount <b>{money(preview.subtotal)}</b>
            </span>
            <span>
              GST {data.settings?.gstEnabled ? "" : "(disabled)"}{" "}
              <b>{money(preview.tax)}</b>
            </span>
          </div>
        )}
        {previewError && (
          <p className="alert error" role="alert">
            {previewError}
          </p>
        )}
        <div className="bill-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        <button
          className="primary full"
          disabled={busy || !Object.keys(cart).length || total < 0 || !preview}
          onClick={async () => {
            try {
              const result = await run("actions/sale", {
                lines: Object.entries(cart).map(([productId, qty]) => ({
                  productId,
                  qty,
                })),
                discount: cents(discount),
                interstate,
                dueDate,
                quoteId: initialQuote?.id,
                paid: paid === "" ? total : cents(paid),
                account,
                partyId: customer || undefined,
                key,
              });
              setReceipt(result);
              setCart({});
              setPaid("");
              setDiscount("0");
              setKey(crypto.randomUUID());
            } catch {}
          }}
        >
          Complete sale
        </button>
        {receipt && (
          <Invoice event={receipt} onClose={() => setReceipt(null)} />
        )}
      </section>
    </div>
  );
}
function Chart({ data }: { data: Data }) {
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
  );
  const values = days.map((d) =>
    data.events
      .filter((e) => e.type === "sale" && e.at.slice(0, 10) === d)
      .reduce((a, e) => a + e.total, 0),
  );
  const max = Math.max(...values, 100);
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Daily sales: ${days.map((d, i) => d + ": " + money(values[i])).join(", ")}`}
    >
      <div className="chart-scale">
        {[1, 0.75, 0.5, 0.25, 0].map((x) => (
          <span key={x}>{money(max * x)}</span>
        ))}
      </div>
      <div className="chart-bars">
        {values.map((v, i) => (
          <div className="bar-column" key={days[i]}>
            <div className="bar-space">
              <div
                title={money(v)}
                style={{ height: `${Math.max(1, (v / max) * 100)}%` }}
                className={i === 6 ? "today" : ""}
              />
            </div>
            <small>
              {new Date(days[i] + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "short",
              })}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
function Login({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <section className="panel login-panel">
        <span className="brand-icon">
          <ShieldCheck />
        </span>
        <div className="eyebrow">SMARTBIZ AI · OWNER WORKSPACE</div>
        <h1>Welcome to your smarter shop.</h1>
        <p>
          One connected system for stock, sales and better purchase decisions.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("login", { password });
              await onSuccess();
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Owner password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary full">
            {busy ? "Signing in…" : "Open workspace"}
          </button>
        </form>
        <small>
          Owner workspace access
          <br />
          Set AUTH_PASSWORD before using this workspace outside your local
          machine.
        </small>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
