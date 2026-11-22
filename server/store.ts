import pg from "pg";
import { upgrade } from "./professional.ts";
import { newDb } from "pg-mem";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { seed, type State } from "./domain.ts";
import { appendAudit } from "./operations.ts";
export async function createStore(options: { test?: boolean } = {}) {
  const memory = !process.env.DATABASE_URL || options.test;
  const mem = memory ? newDb() : null;
  const Pool = mem ? mem.adapters.createPg().Pool : pg.Pool;
  const pool = new Pool(
    memory ? {} : { connectionString: process.env.DATABASE_URL },
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS shop (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, state JSONB NOT NULL)",
  );
  let initial = seed();
  const path = new URL("../data/shop.json", import.meta.url);
  if (memory && !options.test) {
    try {
      initial = JSON.parse(await readFile(path, "utf8"));
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  upgrade(initial);
  const existing = await pool.query("SELECT id FROM shop WHERE id=1");
  if (!existing.rows.length)
    await pool.query("INSERT INTO shop(id,version,state) VALUES(1,0,$1)", [
      JSON.stringify(initial),
    ]);
  let queue: Promise<any> = Promise.resolve();
  const read = async () =>
    upgrade(
      structuredClone(
        (await pool.query("SELECT state FROM shop WHERE id=1")).rows[0].state,
      ) as State,
    );
  function transaction<T>(fn: (s: State) => T, label?: string): Promise<T> {
    const job = queue.then(async () => {
      const client = await pool.connect();
      const backup = mem?.backup();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          "SELECT state FROM shop WHERE id=1 FOR UPDATE",
        );
        const s = upgrade(structuredClone(result.rows[0].state) as State);
        const before = structuredClone(s);
        const value = fn(s);
        if (JSON.stringify(s) === JSON.stringify(before)) {
          await client.query("COMMIT");
          return value;
        }
        s.version++;
        appendAudit(s, before, label);
        await client.query("UPDATE shop SET state=$1,version=$2 WHERE id=1", [
          JSON.stringify(s),
          s.version,
        ]);
        if (memory && !options.test) {
          await mkdir(new URL("../data/", import.meta.url), {
            recursive: true,
          });
          await writeFile(
            new URL("../data/shop.tmp", import.meta.url),
            JSON.stringify(s),
          );
          await rename(new URL("../data/shop.tmp", import.meta.url), path);
        }
        await client.query("COMMIT");
        return value;
      } catch (e) {
        await client.query("ROLLBACK");
        backup?.restore();
        throw e;
      } finally {
        client.release();
      }
    });
    queue = job.catch(() => {});
    return job;
  }
  return {
    read,
    transaction,
    close: () => pool.end(),
    mode: memory ? "Local workspace" : "PostgreSQL",
  };
}
