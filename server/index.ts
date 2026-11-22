import { createStore } from "./store.ts";
import { createApp } from "./app.ts";
import express from "express";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { enrichSampleCatalog } from "./catalog.ts";

// Local configuration belongs in .env, which is ignored by Git. Shell values
// win so deployment platforms can inject secrets without a file.
if (existsSync(".env")) process.loadEnvFile(".env");
const store = await createStore();
await store.transaction(
  enrichSampleCatalog,
  "Branded product catalogue installed",
);
const app = createApp(store);
app.use(express.static(fileURLToPath(new URL("../dist", import.meta.url))));
app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1", () =>
  console.log(
    `SMARTBIZ AI ready at http://127.0.0.1:${process.env.PORT ?? 3001} (${store.mode})`,
  ),
);
