import express from "express";
import { operationsRouter } from "./operations-api.ts";
import { forecast } from "./forecast.ts";
import { z } from "zod";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  metrics,
  mutate,
  recommend,
  approve,
  receive,
  replay,
  type State,
} from "./domain.ts";
import type { createStore } from "./store.ts";
import {
  csv,
  reportRows,
  professionalAction,
  finalizeInvoice,
} from "./professional.ts";
const money = z.number().int().min(0).max(100000000),
  qty = z.number().int().min(1).max(100000),
  id = z.string().min(1).max(100),
  date = z.iso.date();
const base = {
  paid: money,
  account: z.enum(["cash", "bank"]),
  note: z.string().max(500).default(""),
  key: z.string().uuid(),
};
const schemas: Record<string, z.ZodType> = {
  sale: z.object({
    ...base,
    partyId: id.optional(),
    discount: money.default(0),
    interstate: z.boolean().default(false),
    dueDate: date.optional(),
    quoteId: id.optional(),
    lines: z
      .array(z.object({ productId: id, qty }))
      .min(1)
      .max(100),
  }),
  purchase: z.object({
    ...base,
    partyId: id,
    productId: id,
    qty,
    cost: money,
    fee: money.default(0),
    code: id,
    expiry: date,
  }),
  expense: z.object({
    ...base,
    paid: money.min(1),
    note: z.string().min(1).max(500),
  }),
  investment: z.object({ ...base, paid: money.min(1) }),
  "customer-payment": z.object({ ...base, partyId: id, paid: money.min(1) }),
  "supplier-payment": z.object({ ...base, partyId: id, paid: money.min(1) }),
  writeoff: z.object({
    batchId: id,
    qty,
    note: z.string().min(1).max(500),
    key: z.string().uuid(),
  }),
  transfer: z.object({ ...base, paid: money.min(1) }),
  "sale-return": z.object({
    saleId: id,
    account: z.enum(["cash", "bank"]),
    note: z.string().min(1).max(500),
    key: z.string().uuid(),
  }),
};
export function createApp(
  store: Awaited<ReturnType<typeof createStore>>,
  options: { auth?: boolean } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin)
    )
      return res.status(403).json({ error: "Local origin required" });
    next();
  });
  const sessions = new Map<string, number>(),
    attempts = new Map<string, { count: number; until: number }>();
  const salt = randomBytes(16);
  const hash = scryptSync(
    process.env.AUTH_PASSWORD ?? "smartbiz-owner",
    salt,
    32,
  );
  app.post("/api/login", (req, res) => {
    const ip = req.ip ?? "local",
      attempt = attempts.get(ip);
    if (attempt && attempt.until > Date.now() && attempt.count >= 8)
      return res
        .status(429)
        .json({ error: "Too many attempts; try again in one minute" });
    const value = z.object({ password: z.string().max(200) }).parse(req.body);
    if (!timingSafeEqual(hash, scryptSync(value.password, salt, 32))) {
      attempts.set(ip, {
        count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1,
        until: Date.now() + 60000,
      });
      return res.status(401).json({ error: "Incorrect password" });
    }
    attempts.delete(ip);
    for (const [token, expiry] of sessions)
      if (expiry < Date.now()) sessions.delete(token);
    const token = randomBytes(32).toString("hex");
    sessions.set(token, Date.now() + 8 * 3600000);
    res.setHeader(
      "Set-Cookie",
      `smartbiz_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
    );
    res.json({ ok: true });
  });
  app.post("/api/logout", (req, res) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("smartbiz_session="))
      ?.split("=")[1];
    if (token) sessions.delete(token);
    res.setHeader(
      "Set-Cookie",
      "smartbiz_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    );
    res.json({ ok: true });
  });
  app.use("/api", (req, res, next) => {
    if (options.auth === false) return next();
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("smartbiz_session="))
      ?.split("=")[1];
    if (!token || (sessions.get(token) ?? 0) < Date.now())
      return res.status(401).json({ error: "Sign in required" });
    next();
  });
  app.use("/api/operations", operationsRouter(store));
  app.get("/api/state", async (_req, res) => {
    const s = await store.read();
    res.json({
      ...s,
      metrics: metrics(s),
      mode: store.mode,
      replays: Object.fromEntries(s.decisions.map((d) => [d.id, replay(s, d)])),
    });
  });
  app.post("/api/actions/:type", async (req, res) => {
    const schema = schemas[String(req.params.type)];
    if (!schema) return res.status(404).json({ error: "Unknown action" });
    const body = schema.parse(req.body);
    res.json(
      await store.transaction((s) =>
        ["transfer", "sale-return"].includes(String(req.params.type))
          ? professionalAction(s, String(req.params.type), body)
          : mutate(s, String(req.params.type), body),
      ),
    );
  });
  app.post("/api/checkout-preview", async (req, res) => {
    const s = await store.read();
    s.parties.push({
      id: "preview",
      kind: "customer",
      name: "Preview",
      due: 0,
    });
    const body = schemas.sale.parse({
      ...req.body,
      partyId: "preview",
      paid: 0,
      account: "cash",
      key: randomUUID(),
    });
    const invoice = mutate(s, "sale", body);
    res.json({
      total: invoice.total,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
    });
  });
  app.post("/api/quotations", async (req, res) => {
    const b = z
      .object({
        partyId: id.optional(),
        dueDate: date,
        note: z.string().max(500),
        key: z.string().uuid(),
        lines: z
          .array(z.object({ productId: id, qty }))
          .min(1)
          .max(100),
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        const prior = s.quotes?.find((q) => q.key === b.key);
        if (prior) return prior;
        if (b.dueDate < new Date().toISOString().slice(0, 10))
          throw Error("Quotation validity cannot be in the past");
        if (
          b.partyId &&
          !s.parties.some((p) => p.id === b.partyId && p.kind === "customer")
        )
          throw Error("Customer not found");
        const quote: any = {
          id: randomUUID(),
          at: new Date().toISOString(),
          type: "quotation",
          total: 0,
          paid: 0,
          cost: 0,
          account: "cash",
          lines: [],
          note: b.note,
          key: b.key,
          partyId: b.partyId,
          status: "open",
        };
        for (const line of b.lines) {
          const p = s.products.find((p) => p.id === line.productId);
          if (!p) throw Error("Unknown product");
          quote.lines.push({
            productId: p.id,
            name: p.name,
            qty: line.qty,
            price: p.price,
            cost: 0,
          });
          quote.total += p.price * line.qty;
        }
        finalizeInvoice(s, quote, b);
        quote.invoiceNo = `QT-${String((s.quotes?.length ?? 0) + 1).padStart(5, "0")}`;
        s.quotes ??= [];
        s.quotes.push(quote);
        return quote;
      }),
    );
  });
  app.post("/api/products", async (req, res) => {
    const p = z
      .object({
        name: z.string().min(1).max(100),
        category: z.string().min(1).max(60),
        barcode: id,
        price: money.min(1),
        reorder: qty,
        image: z.string().max(700000).optional(),
        unit: z.string().max(20).default("pcs"),
        gstRate: z
          .number()
          .refine((v) => [0, 5, 12, 18, 28].includes(v))
          .default(0),
        hsn: z.string().max(10).default(""),
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        if (s.products.some((x) => x.barcode === p.barcode))
          throw Error("Barcode already exists");
        const value = { ...p, id: randomUUID() };
        s.products.push(value);
        return value;
      }),
    );
  });
  app.post("/api/parties", async (req, res) => {
    const p = z
      .object({
        name: z.string().min(1).max(100),
        kind: z.enum(["customer", "supplier"]),
        phone: z.string().max(20).default(""),
        address: z.string().max(300).default(""),
        gstin: z.string().max(15).default(""),
        creditLimit: money.default(0),
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        const value = { ...p, id: randomUUID(), due: 0 };
        s.parties.push(value);
        return value;
      }),
    );
  });
  app.post("/api/offers", async (req, res) => {
    const o = z
      .object({
        productId: id,
        supplierId: id,
        cost: money.min(1),
        moq: qty,
        lead: z.number().int().min(0).max(180),
        shelf: qty,
        fee: money,
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        if (
          !s.products.some((p) => p.id === o.productId) ||
          !s.parties.some((p) => p.id === o.supplierId && p.kind === "supplier")
        )
          throw Error("Invalid product or supplier");
        const value = { ...o, id: randomUUID() };
        s.offers.push(value);
        return value;
      }),
    );
  });
  app.post("/api/recommendations", async (req, res) => {
    const b = z
      .object({
        budget: money,
        reserve: money,
        horizon: z.number().int().min(1).max(90),
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        const d = recommend(s, b.budget, b.reserve, b.horizon);
        s.decisions.push(d);
        return d;
      }),
    );
  });
  app.post("/api/recommendations/:id/:action", async (req, res) => {
    const action = z
      .enum(["approved", "rejected", "receive"])
      .parse(req.params.action);
    res.json(
      await store.transaction((s) =>
        action === "receive"
          ? receive(s, String(req.params.id))
          : approve(s, String(req.params.id), action),
      ),
    );
  });
  app.post("/api/settings", async (req, res) => {
    const value = z
      .object({
        name: z.string().min(1).max(100),
        address: z.string().max(300),
        phone: z.string().max(20),
        gstin: z.string().max(15),
        stateCode: z.string().regex(/^\d{2}$/),
        invoicePrefix: z.string().regex(/^[A-Z0-9-]{1,12}$/),
        gstEnabled: z.boolean(),
        terms: z.string().max(500),
      })
      .parse(req.body);
    if (
      value.gstEnabled &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(value.gstin)
    )
      throw Error("Enter a valid-format GSTIN before enabling GST");
    res.json(
      await store.transaction((s) => {
        s.settings = value;
        return value;
      }),
    );
  });
  app.post("/api/products/:id", async (req, res) => {
    const value = z
      .object({
        price: money.min(1),
        reorder: qty,
        unit: z.string().min(1).max(20),
        gstRate: z.number().refine((v) => [0, 5, 12, 18, 28].includes(v)),
        hsn: z.string().max(10),
        image: z
          .string()
          .max(700000)
          .refine(
            (v) =>
              !v ||
              /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
              /^\/products\/[a-zA-Z0-9.-]+$/.test(v) ||
              /^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/.test(v),
          ),
        brand: z.string().max(80).optional(),
        packSize: z.string().max(80).optional(),
        manufacturer: z.string().max(140).optional(),
        countryOfOrigin: z.string().max(80).optional(),
        productType: z.string().max(120).optional(),
        description: z.string().max(500).optional(),
        ingredients: z.string().max(1000).optional(),
        allergens: z.string().max(500).optional(),
        storage: z.string().max(500).optional(),
        mrp: money.optional(),
        sourceUrl: z.string().max(2000).url().startsWith("https://").optional(),
        sourceLabel: z.string().max(100).optional(),
        verifiedAt: z.string().max(40).optional(),
        imageSourceUrl: z
          .string()
          .max(2000)
          .url()
          .startsWith("https://")
          .optional(),
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        const p = s.products.find((p) => p.id === req.params.id);
        if (!p) throw Error("Product not found");
        Object.assign(p, value);
        return p;
      }),
    );
  });
  app.get("/api/intelligence", async (_req, res) => {
    const s = await store.read();
    res.json({
      forecasts: s.products.map((p) => ({
        ...forecast(s, p.id),
        name: p.name,
      })),
      metrics: metrics(s),
      engine:
        "Local statistical forecasting, model selection and deterministic constrained allocation. No external LLM or API key required.",
    });
  });
  app.get("/api/reports.csv", async (req, res) => {
    const from = z.iso.date().parse(req.query.from ?? "2000-01-01"),
      to = z.iso.date().parse(req.query.to ?? "2100-01-01");
    res
      .type("text/csv")
      .setHeader(
        "Content-Disposition",
        "attachment; filename=smartbiz-transactions.csv",
      );
    res.send(csv(reportRows(await store.read(), from, to)));
  });
  app.get("/api/export", async (_req, res) => {
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=smartbiz-backup.json",
    );
    res.json(await store.read());
  });
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err instanceof z.ZodError ? 400 : 422).json({
      error:
        err instanceof z.ZodError
          ? err.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")
          : err.message,
    });
  });
  return app;
}
