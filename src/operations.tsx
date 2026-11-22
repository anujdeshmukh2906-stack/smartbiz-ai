import React, { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Truck,
  CalendarDays,
  ShieldCheck,
  BrainCircuit,
  ArrowUpRight,
  X,
  Plus,
  Check,
  AlertTriangle,
  Wallet,
  SlidersHorizontal,
} from "lucide-react";
import type { State } from "../server/domain";
const money = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format((v ?? 0) / 100),
  today = () => new Date().toISOString().slice(0, 10),
  cents = (v: string) => Math.round(Number(v) * 100);
type Props = {
  data: State & { metrics: any };
  run: (path: string, body: any) => Promise<any>;
  busy: boolean;
  page: string;
};
type Field = {
  id: string;
  label: string;
  type?: string;
  options?: { id: string; name: string }[];
  default?: string;
  min?: number;
  max?: number;
};
async function request(path: string, body?: unknown) {
  const response = await fetch(
    "/api/operations" + path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const value = await response.json();
  if (!response.ok) throw Error(value.error ?? "Request failed");
  return value;
}
function Form({
  title,
  fields,
  submit,
  button = "Save record",
  busy = false,
}: {
  title: string;
  fields: Field[];
  submit: (values: Record<string, string>, key: string) => Promise<any>;
  button?: string;
  busy?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        fields.map((f) => [f.id, f.default ?? f.options?.[0]?.id ?? ""]),
      ),
    ),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>{title}</h2>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await submit(values, key);
            setKey(crypto.randomUUID());
          } catch (e: any) {
            setError(e.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="form-grid">
          {fields.map((f) => (
            <label key={f.id}>
              {f.label}
              {f.options ? (
                <select
                  value={values[f.id]}
                  onChange={(e) =>
                    setValues({ ...values, [f.id]: e.target.value })
                  }
                  required
                >
                  {f.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  type={f.type ?? "text"}
                  min={f.min ?? (f.type === "number" ? 0 : undefined)}
                  max={f.max}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={values[f.id]}
                  onChange={(e) =>
                    setValues({ ...values, [f.id]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        <button disabled={busy || saving} className="primary">
          {saving ? "Saving…" : button}
        </button>
      </form>
    </section>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  const [page, setPage] = useState(1);
  const count = Math.max(1, Math.ceil(rows.length / 15));
  const current = Math.min(page, count);
  return (
    <section className="panel table-wrap">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * 15, current * 15).map((row, i) => (
              <tr key={i}>
                {row.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            No records yet. Your entries will appear here.
          </div>
        )}
      </div>
      {rows.length > 15 && (
        <div className="pagination">
          <span>
            {rows.length} records · Page {current} of {count}
          </span>
          <button disabled={current <= 1} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <button
            disabled={current >= count}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
function Stats({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div className="section-stats">
      {items.map(([label, value]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
export function Operations({ data, run, busy, page }: Props) {
  const [ops, setOps] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request("/")
      .then((v) => active && setOps(v))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [data.version]);
  const act = (path: string, b: any) => run("operations" + path, b);
  if (error)
    return (
      <div role="alert" className="alert error">
        {error}
      </div>
    );
  if (!ops)
    return (
      <section className="panel">
        <p className="empty">Loading connected business records…</p>
      </section>
    );
  const party = (id: string) =>
      data.parties.find((p) => p.id === id)?.name ?? id,
    product = (id: string) =>
      data.products.find((p) => p.id === id)?.name ?? id;
  if (page === "Operations desk")
    return (
      <>
        <section className="ai-hero">
          <div>
            <span className="eyebrow">DAILY BUSINESS CONTROL</span>
            <h2>A place for everything that needs action.</h2>
            <p>
              Purchasing commitments, daily checks, cash plans and shop tasks in
              one connected workspace.
            </p>
          </div>
          <ClipboardCheck size={48} color="#b1d8c4" />
        </section>
        <Stats
          items={[
            [
              "Open purchase orders",
              ops.orders.filter((o: any) => o.status === "ordered").length,
            ],
            [
              "Planned expenses",
              money(
                ops.obligations
                  .filter((o: any) => o.status === "planned")
                  .reduce((a: number, o: any) => a + o.amount, 0),
              ),
            ],
            ["Uncommitted funds", money(ops.planning.freeCash)],
            ["Open tasks", ops.tasks.filter((t: any) => !t.done).length],
          ]}
        />
        <div className="two-forms">
          <Form
            title="Add a business task"
            busy={busy}
            fields={[
              { id: "title", label: "Task" },
              {
                id: "dueDate",
                label: "Due date",
                type: "date",
                default: today(),
              },
            ]}
            submit={(v) => act("/tasks", v)}
          />
          <section className="panel">
            <div className="panel-title">
              <h2>Today’s checks</h2>
              <ShieldCheck />
            </div>
            <ul className="checklist">
              <li>Check expiry batches before restocking</li>
              <li>Count physical cash and record discrepancies</li>
              <li>Receive orders only after checking batches</li>
              <li>Review planned expenses before new purchases</li>
            </ul>
            <p className="muted">
              Tasks are in-app records. No email, SMS or background reminders
              are sent.
            </p>
          </section>
        </div>
        <Table
          headers={["Task", "Due", "Status", "Action"]}
          rows={ops.tasks.map((t: any) => [
            <strong>{t.title}</strong>,
            t.dueDate,
            <span
              className={
                "pill " +
                (t.done ? "green" : t.dueDate < today() ? "amber" : "")
              }
            >
              {t.done ? "Complete" : t.dueDate < today() ? "Overdue" : "Open"}
            </span>,
            <button
              disabled={busy}
              onClick={() =>
                act("/tasks/" + t.id, { done: !t.done }).catch(() => {})
              }
            >
              {t.done ? "Reopen" : "Mark complete"}
            </button>,
          ])}
        />
      </>
    );
  if (page === "Purchase orders")
    return (
      <OrderScreen data={data} orders={ops.orders} act={act} busy={busy} />
    );
  if (page === "Stock count")
    return (
      <>
        <div className="info">
          <ClipboardCheck size={22} /> Record physical quantities by batch.
          Shortages create a cost write-off; found stock creates an explicit
          inventory correction at the recorded cost. Neither moves cash.
          Positive corrections are not sales revenue.
        </div>
        <Form
          title="Review a batch count"
          busy={busy}
          fields={[
            {
              id: "batchId",
              label: "Batch / recorded quantity",
              options: data.batches.map((b) => ({
                id: b.id,
                name: `${product(b.productId)} · ${b.code} · ${b.qty} recorded`,
              })),
            },
            { id: "counted", label: "Actual counted units", type: "number" },
            { id: "reason", label: "Reason for the difference" },
          ]}
          button="Record count correction"
          submit={(v, key) =>
            act("/stock-count", { ...v, counted: Number(v.counted), key })
          }
        />
        <Table
          headers={["Date", "Correction", "Cost value", "Reason"]}
          rows={[...data.events]
            .reverse()
            .filter((e) => e.type === "stock-found" || e.type === "writeoff")
            .map((e) => [e.at.slice(0, 10), e.type, money(e.cost), e.note])}
        />
      </>
    );
  if (page === "Cash closing")
    return (
      <>
        <Stats
          items={[
            ["Recorded cash", money(data.metrics.balances.cash)],
            ["Recorded bank", money(data.metrics.balances.bank)],
            ["Checks recorded", ops.closings.length],
          ]}
        />
        <div className="info">
          <Wallet size={22} /> Compare counted cash or your bank statement to
          the recorded balance. A closing records a discrepancy for review; it
          does not overwrite the account or create an invented expense.
        </div>
        <Form
          title="Record an account check"
          busy={busy}
          fields={[
            {
              id: "account",
              label: "Account",
              options: [
                { id: "cash", name: "Cash" },
                { id: "bank", name: "Bank / UPI / card" },
              ],
            },
            { id: "counted", label: "Actual balance (₹)", type: "number" },
            { id: "note", label: "Check reference / explanation" },
          ]}
          submit={(v) => act("/closing", { ...v, counted: cents(v.counted) })}
        />
        <Table
          headers={[
            "Date",
            "Account",
            "Expected",
            "Counted",
            "Difference",
            "Review note",
          ]}
          rows={[...ops.closings]
            .reverse()
            .map((c: any) => [
              c.at.slice(0, 16).replace("T", " "),
              c.account,
              money(c.expected),
              money(c.counted),
              <span className={"pill " + (c.difference ? "amber" : "green")}>
                {money(c.difference)}
              </span>,
              c.note,
            ])}
        />
      </>
    );
  if (page === "Cash-flow planner")
    return (
      <>
        <Stats
          items={[
            ["Recorded funds", money(ops.planning.cash)],
            ["Reserved commitments", money(ops.planning.reserved)],
            ["Uncommitted funds", money(ops.planning.freeCash)],
          ]}
        />
        <div className="info">{ops.planning.assumptions}</div>
        <Form
          title="Schedule an operating expense"
          busy={busy}
          fields={[
            { id: "title", label: "Expense / obligation" },
            { id: "amount", label: "Amount (₹)", type: "number", min: 0.01 },
            {
              id: "dueDate",
              label: "Expected payment date",
              type: "date",
              default: today(),
            },
          ]}
          submit={(v) => act("/obligations", { ...v, amount: cents(v.amount) })}
        />
        <Table
          headers={["Planned expense", "Due", "Amount", "Status", "Actions"]}
          rows={ops.obligations.map((o: any) => [
            o.title,
            o.dueDate,
            money(o.amount),
            <span className="pill">{o.status}</span>,
            o.status === "planned" ? (
              <div className="row-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    act("/obligations/" + o.id + "/pay", {
                      account: "cash",
                    }).catch(() => {})
                  }
                >
                  Record cash payment
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    act("/obligations/" + o.id + "/cancel", {}).catch(() => {})
                  }
                >
                  Cancel
                </button>
              </div>
            ) : (
              "—"
            ),
          ])}
        />
        <Table
          headers={["Date", "Planned outflow", "Scenario balance"]}
          rows={ops.planning.calendar.map((d: any) => [
            d.date,
            money(d.out),
            <strong className={d.balance < 0 ? "negative" : ""}>
              {money(d.balance)}
            </strong>,
          ])}
        />
      </>
    );
  if (page === "What-if lab") return <Simulator data={data} />;
  if (page === "Connected AI advisor") return <Advisor status={ops.ai} />;
  return (
    <>
      <div className={"info " + (!ops.auditHealth.valid ? "error" : "")}>
        <ShieldCheck size={22} />
        {ops.auditHealth.valid
          ? `Audit chain verified · ${ops.auditHealth.entries} entries`
          : "Audit integrity check failed. Review the stored history."}
      </div>
      <p className="muted">
        Changes are logged from this upgrade onward, under the single owner
        account. The hash chain detects record edits; it is not externally
        anchored or a substitute for staff identities and off-device audit
        storage. Latest 200 entries shown.
      </p>
      <Table
        headers={["Time", "Version", "Actor", "Action", "Fingerprint"]}
        rows={ops.audit.map((a: any) => [
          a.at.slice(0, 19).replace("T", " "),
          a.version,
          a.actor,
          a.action,
          <code title={a.hash}>{a.hash.slice(0, 16)}…</code>,
        ])}
      />
    </>
  );
}
function OrderScreen({
  data,
  orders,
  act,
  busy,
}: {
  data: State;
  orders: any[];
  act: (path: string, b: any) => Promise<any>;
  busy: boolean;
}) {
  const [supplier, setSupplier] = useState(
      data.parties.find((p) => p.kind === "supplier")?.id ?? "",
    ),
    [expected, setExpected] = useState(today()),
    [selected, setSelected] = useState(data.products[0]?.id ?? ""),
    [qty, setQty] = useState("6"),
    [cost, setCost] = useState(""),
    [lines, setLines] = useState<any[]>([]),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<any>(null),
    [batches, setBatches] = useState<
      Record<string, { code: string; expiry: string }>
    >({}),
    [paid, setPaid] = useState("0"),
    [account, setAccount] = useState("cash");
  return (
    <>
      <div className="info">
        <Truck size={22} /> Orders reserve spending and count as incoming stock
        in ProfitShield. They do not change stock or supplier dues until
        physical receipt. Amounts use entered purchase costs; purchase GST/input
        credits are not calculated.
      </div>
      <section className="panel">
        <h2>Create purchase order</h2>
        <div className="form-grid order-fields">
          <label>
            Supplier
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              {data.parties
                .filter((p) => p.kind === "supplier")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Expected delivery
            <input
              type="date"
              min={today()}
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
            />
          </label>
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
            Units
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
          <label>
            Unit cost (₹)
            <input
              type="number"
              min=".01"
              step=".01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
          <button
            disabled={
              !cost ||
              Number(cost) <= 0 ||
              !Number.isInteger(Number(qty)) ||
              Number(qty) < 1
            }
            onClick={() => {
              if (lines.some((l) => l.productId === selected)) {
                setError(
                  "Remove the existing line before adding this product again.",
                );
                return;
              }
              setLines([
                ...lines,
                { productId: selected, qty: Number(qty), cost: cents(cost) },
              ]);
              setError("");
            }}
          >
            <Plus size={16} /> Add line
          </button>
        </div>
        {lines.map((l) => (
          <div className="quote-line" key={l.productId}>
            <strong>
              {data.products.find((p) => p.id === l.productId)?.name}
            </strong>
            <span>
              {l.qty} × {money(l.cost)}
            </span>
            <b>{money(l.qty * l.cost)}</b>
            <button
              aria-label="Remove order line"
              onClick={() => setLines(lines.filter((x) => x !== l))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        <div className="actions">
          <button
            className="primary"
            disabled={busy || !lines.length || !supplier}
            onClick={async () => {
              try {
                await act("/orders", {
                  supplierId: supplier,
                  expected,
                  key,
                  lines,
                });
                setLines([]);
                setKey(crypto.randomUUID());
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            Create order ·{" "}
            {money(lines.reduce((a, l) => a + l.qty * l.cost, 0))}
          </button>
        </div>
      </section>
      <Table
        headers={[
          "Order",
          "Supplier",
          "Expected",
          "Amount",
          "Status",
          "Actions",
        ]}
        rows={[...orders].reverse().map((o) => [
          <strong>
            {o.number}
            <small>{o.lines.length} product lines</small>
          </strong>,
          data.parties.find((p) => p.id === o.supplierId)?.name,
          o.expected,
          money(o.total),
          <span className="pill">{o.status}</span>,
          o.status === "ordered" ? (
            <div className="row-actions">
              <button
                disabled={busy}
                onClick={() => {
                  setReceipt(o);
                  setBatches(
                    Object.fromEntries(
                      o.lines.map((l: any) => [
                        l.productId,
                        {
                          code: `${o.number}-${l.productId.slice(0, 6)}`,
                          expiry: "",
                        },
                      ]),
                    ),
                  );
                  setPaid("0");
                  setError("");
                }}
              >
                Receive
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  act("/orders/" + o.id + "/cancel", {}).catch(() => {})
                }
              >
                Cancel
              </button>
            </div>
          ) : (
            "—"
          ),
        ])}
      />
      {receipt && (
        <div className="modal-backdrop">
          <section className="panel receiving-dialog">
            <div className="panel-title">
              <div>
                <h2>Receive {receipt.number}</h2>
                <p>Confirm the whole delivery, its batches and payment.</p>
              </div>
              <button
                aria-label="Close receiving"
                onClick={() => setReceipt(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await act("/orders/" + receipt.id + "/receive", {
                    paid: cents(paid),
                    account,
                    lines: receipt.lines.map((l: any) => ({
                      productId: l.productId,
                      ...batches[l.productId],
                    })),
                  });
                  setReceipt(null);
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              {receipt.lines.map((l: any) => (
                <div className="receive-line" key={l.productId}>
                  <strong>
                    {data.products.find((p) => p.id === l.productId)?.name} ·{" "}
                    {l.qty} units
                  </strong>
                  <div className="form-grid">
                    <label>
                      Batch code
                      <input
                        required
                        value={batches[l.productId]?.code ?? ""}
                        onChange={(e) =>
                          setBatches({
                            ...batches,
                            [l.productId]: {
                              ...batches[l.productId],
                              code: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Expiry
                      <input
                        required
                        type="date"
                        min={today()}
                        value={batches[l.productId]?.expiry ?? ""}
                        onChange={(e) =>
                          setBatches({
                            ...batches,
                            [l.productId]: {
                              ...batches[l.productId],
                              expiry: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <div className="form-grid">
                <label>
                  Paid now (₹)
                  <input
                    required
                    type="number"
                    min="0"
                    max={receipt.total / 100}
                    step=".01"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                  />
                </label>
                <label>
                  Account
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank / UPI / card</option>
                  </select>
                </label>
              </div>
              <p className="muted">
                Unpaid value {money(receipt.total - cents(paid))} becomes
                supplier dues. This records payment; it does not transfer real
                funds.
              </p>
              {error && (
                <p role="alert" className="alert error">
                  {error}
                </p>
              )}
              <button disabled={busy} className="primary">
                Confirm full receipt
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function Simulator({ data }: { data: State }) {
  const [result, setResult] = useState<any>(null);
  return (
    <>
      <section className="ai-hero">
        <div>
          <span className="eyebrow">WHAT-IF LAB</span>
          <h2>Try a decision before committing.</h2>
          <p>
            Change a price, purchase quantity or demand assumption. Your records
            stay unchanged.
          </p>
        </div>
        <SlidersHorizontal size={44} color="#b1d8c4" />
      </section>
      <Form
        title="Explore a seven-day scenario"
        button="Calculate scenario"
        fields={[
          {
            id: "productId",
            label: "Product",
            options: data.products.map((p) => ({ id: p.id, name: p.name })),
          },
          {
            id: "price",
            label: "Assumed selling price (₹)",
            type: "number",
            min: 0.01,
          },
          {
            id: "cost",
            label: "Assumed unit cost (₹)",
            type: "number",
            min: 0.01,
          },
          {
            id: "orderQty",
            label: "Units to order",
            type: "number",
            default: "0",
          },
          {
            id: "demandChange",
            label: "Assumed demand change (%)",
            type: "number",
            default: "0",
            min: -80,
            max: 100,
          },
        ]}
        submit={async (v) => {
          const r = await request("/simulate", {
            productId: v.productId,
            price: cents(v.price),
            cost: cents(v.cost),
            orderQty: Number(v.orderQty),
            demandChange: Number(v.demandChange),
          });
          setResult(r);
        }}
      />
      {result && (
        <>
          <Stats
            items={[
              ["Estimated units sold", result.sold],
              ["Estimated contribution", money(result.contribution)],
              ["Purchase spending", money(result.purchaseSpend)],
              ["Unsold units", result.remaining],
            ]}
          />
          <div className="info">
            <AlertTriangle size={22} />
            {result.warning}
          </div>
        </>
      )}
    </>
  );
}
function Advisor({ status }: { status: any }) {
  const [provider, setProvider] = useState("local"),
    [consent, setConsent] = useState(false),
    [question, setQuestion] = useState(
      "What can I afford to purchase after my commitments?",
    ),
    [answer, setAnswer] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <section className="ai-hero">
        <div>
          <span className="eyebrow">CONNECTED BUSINESS ADVISOR</span>
          <h2>Ask. Inspect the evidence. Decide.</h2>
          <p>
            Local calculations are always available. Connect your OpenAI account
            for broader explanations.
          </p>
        </div>
        <BrainCircuit size={46} color="#b1d8c4" />
      </section>
      <div className="section-stats">
        <div>
          <small>Local analysis</small>
          <strong>Ready</strong>
        </div>
        <div>
          <small>OpenAI connection</small>
          <strong>{status.configured ? "Configured" : "Not configured"}</strong>
        </div>
        <div>
          <small>Record access</small>
          <strong>Read only</strong>
        </div>
      </div>
      {!status.configured && (
        <div className="info">
          To connect OpenAI, copy <code>.env.example</code> to <code>.env</code>
          in the project folder, add OPENAI_API_KEY and OPENAI_MODEL, then
          restart. The server reads .env securely and Git ignores it. Never put
          a key in frontend code or a chat message.
        </div>
      )}
      <section className="panel advisor">
        <div
          className="advisor-prompts"
          aria-label="Suggested business questions"
        >
          <span>Ask about your records</span>
          {[
            "What can I afford to purchase after my commitments?",
            "Which stock is close to expiry?",
            "Summarize my recorded profit and cash position.",
            "What customer and supplier dues need attention?",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuestion(prompt);
                setAnswer(null);
                setError("");
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              setAnswer(
                await request("/advisor", { question, provider, consent }),
              );
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label>
              Analysis provider
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setConsent(false);
                }}
              >
                <option value="local">
                  Local · calculated business answers
                </option>
                <option value="openai" disabled={!status.configured}>
                  OpenAI · {status.model ?? "configure server first"}
                </option>
              </select>
            </label>
          </div>
          <label>
            Question
            <textarea
              required
              maxLength={1500}
              minLength={3}
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          {provider === "openai" && (
            <label className="switch-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Send this question and aggregate business figures to OpenAI.
                <small>
                  Names, contact details, free-text ledger notes and credentials
                  are excluded from the supplied record context. Your question
                  is sent as typed. API usage may incur charges to your account.
                </small>
              </span>
            </label>
          )}
          <div className="actions">
            <button
              className="primary"
              disabled={busy || (provider === "openai" && !consent)}
            >
              {busy ? "Analyzing…" : "Analyze records"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </div>
          {error && (
            <p role="alert" className="alert error">
              {error}
            </p>
          )}
        </form>
        {answer && (
          <>
            <div className="advisor-answer">
              <BrainCircuit size={22} />
              <div>
                <span className="pill">
                  {answer.provider} · Record version {answer.context.version}
                </span>
                <p className="answer-text">{answer.answer}</p>
                <small>{answer.disclaimer}</small>
              </div>
            </div>
            <details className="evidence">
              <summary>Inspect calculation evidence</summary>
              <pre>{JSON.stringify(answer.context, null, 2)}</pre>
            </details>
          </>
        )}
      </section>
    </>
  );
}
