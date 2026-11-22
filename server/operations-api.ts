import express from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { createStore } from "./store.ts";
import {
  createOrder,
  receiveOrder,
  stockCount,
  closeAccount,
  payObligation,
  planning,
  verifyAudit,
} from "./operations.ts";
import { localAnswer, openAIAnswer } from "./advisor.ts";
import { forecast } from "./forecast.ts";
const amount = z.number().int().min(0).max(100000000),
  id = z.string().min(1).max(100),
  date = z.iso.date(),
  qty = z.number().int().min(1).max(100000),
  account = z.enum(["cash", "bank"]);
export function operationsRouter(
  store: Awaited<ReturnType<typeof createStore>>,
) {
  const router = express.Router();
  router.get("/", async (_req, res) => {
    const s = await store.read();
    res.json({
      orders: s.orders,
      obligations: s.obligations,
      closings: s.closings,
      tasks: s.tasks,
      audit: [...(s.audit ?? [])].reverse().slice(0, 200),
      auditHealth: verifyAudit(s),
      planning: planning(s),
      ai: {
        configured: Boolean(
          process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL,
        ),
        model: process.env.OPENAI_MODEL ?? null,
        localAvailable: true,
      },
    });
  });
  router.post("/orders", async (req, res) => {
    const b = z
      .object({
        supplierId: id,
        expected: date,
        key: z.string().uuid(),
        lines: z
          .array(z.object({ productId: id, qty, cost: amount.min(1) }))
          .min(1)
          .max(100),
      })
      .parse(req.body);
    res.json(
      await store.transaction(
        (s) => createOrder(s, b),
        "Purchase order created",
      ),
    );
  });
  router.post("/orders/:id/receive", async (req, res) => {
    const b = z
      .object({
        paid: amount,
        account,
        lines: z
          .array(z.object({ productId: id, code: id, expiry: date }))
          .min(1)
          .max(100),
      })
      .parse(req.body);
    res.json(
      await store.transaction(
        (s) => receiveOrder(s, String(req.params.id), b),
        "Purchase order received",
      ),
    );
  });
  router.post("/orders/:id/cancel", async (req, res) => {
    res.json(
      await store.transaction((s) => {
        const o = s.orders?.find((o) => o.id === req.params.id);
        if (!o || o.status !== "ordered")
          throw Error("Only an open order can be cancelled");
        o.status = "cancelled";
        return o;
      }, "Purchase order cancelled"),
    );
  });
  router.post("/stock-count", async (req, res) => {
    const b = z
      .object({
        batchId: id,
        counted: z.number().int().min(0).max(100000),
        reason: z.string().trim().min(1).max(500),
        key: z.string().uuid(),
      })
      .parse(req.body);
    res.json(
      await store.transaction(
        (s) => stockCount(s, b),
        "Inventory count correction",
      ),
    );
  });
  router.post("/closing", async (req, res) => {
    const b = z
      .object({
        account,
        counted: amount,
        note: z.string().trim().min(1).max(500),
      })
      .parse(req.body);
    res.json(
      await store.transaction(
        (s) => closeAccount(s, b),
        "Account reconciliation recorded",
      ),
    );
  });
  router.post("/obligations", async (req, res) => {
    const b = z
      .object({
        title: z.string().trim().min(1).max(120),
        dueDate: date,
        amount: amount.min(1),
      })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        const value = { ...b, id: randomUUID(), status: "planned" as const };
        s.obligations!.push(value);
        return value;
      }, "Planned expense created"),
    );
  });
  router.post("/obligations/:id/pay", async (req, res) => {
    const b = z.object({ account }).parse(req.body);
    res.json(
      await store.transaction(
        (s) => payObligation(s, String(req.params.id), b),
        "Planned expense paid",
      ),
    );
  });
  router.post("/obligations/:id/cancel", async (req, res) =>
    res.json(
      await store.transaction((s) => {
        const o = s.obligations?.find((o) => o.id === req.params.id);
        if (!o || o.status !== "planned")
          throw Error("Only planned expenses can be cancelled");
        o.status = "cancelled";
        return o;
      }, "Planned expense cancelled"),
    ),
  );
  router.post("/tasks", async (req, res) => {
    const b = z
      .object({ title: z.string().trim().min(1).max(180), dueDate: date })
      .parse(req.body);
    res.json(
      await store.transaction((s) => {
        const task = { ...b, id: randomUUID(), done: false };
        s.tasks!.push(task);
        return task;
      }, "Business task created"),
    );
  });
  router.post("/tasks/:id", async (req, res) => {
    const b = z.object({ done: z.boolean() }).parse(req.body);
    res.json(
      await store.transaction((s) => {
        const task = s.tasks?.find((t) => t.id === req.params.id);
        if (!task) throw Error("Task not found");
        task.done = b.done;
        return task;
      }, "Business task updated"),
    );
  });
  const requests = new Map<string, { count: number; until: number }>();
  router.post("/advisor", async (req, res) => {
    const b = z
      .object({
        question: z.string().trim().min(3).max(1500),
        provider: z.enum(["local", "openai"]),
        consent: z.boolean().default(false),
      })
      .parse(req.body);
    const s = await store.read();
    if (b.provider === "local") return res.json(localAnswer(s, b.question));
    if (!b.consent)
      return res
        .status(400)
        .json({
          error:
            "Confirm sharing your question and aggregate business figures with OpenAI",
        });
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
      return res
        .status(503)
        .json({
          error:
            "OpenAI is not configured. Set OPENAI_API_KEY and OPENAI_MODEL on the server.",
        });
    const ip = req.ip ?? "local",
      used = requests.get(ip);
    if (used && used.until > Date.now() && used.count >= 6)
      return res
        .status(429)
        .json({ error: "AI request limit reached; try again in one minute." });
    requests.set(ip, {
      count: used && used.until > Date.now() ? used.count + 1 : 1,
      until: Date.now() + 60000,
    });
    try {
      res.json(
        await openAIAnswer(s, b.question, {
          consent: b.consent,
          key: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        }),
      );
    } catch (e: any) {
      res
        .status(502)
        .json({
          error:
            e.name === "TimeoutError"
              ? "OpenAI timed out; local advice is still available."
              : e.message,
        });
    }
  });
  router.post("/simulate", async (req, res) => {
    const b = z
      .object({
        productId: id,
        price: amount.min(1),
        cost: amount.min(1),
        orderQty: z.number().int().min(0).max(10000),
        demandChange: z.number().min(-80).max(100),
      })
      .parse(req.body);
    const s = await store.read(),
      p = s.products.find((p) => p.id === b.productId);
    if (!p) throw Error("Product not found");
    const f = forecast(s, p.id),
      stock = s.batches
        .filter(
          (x) =>
            x.productId === p.id &&
            x.expiry >= new Date().toISOString().slice(0, 10),
        )
        .reduce((a, x) => a + x.qty, 0),
      demand = Math.max(0, Math.round(f.next7 * (1 + b.demandChange / 100))),
      sold = Math.min(demand, stock + b.orderQty),
      revenue = sold * b.price,
      estimatedCogs = sold * b.cost;
    res.json({
      demand,
      sold,
      revenue,
      estimatedCogs,
      contribution: revenue - estimatedCogs,
      purchaseSpend: b.orderQty * b.cost,
      unfilled: Math.max(0, demand - sold),
      remaining: stock + b.orderQty - sold,
      warning:
        "Illustrative 7-day scenario. Demand change is your assumption, not learned price elasticity. Uses one assumed unit cost; excludes tax, fees, batch expiry, existing batch-cost differences and operating expenses.",
    });
  });
  return router;
}
