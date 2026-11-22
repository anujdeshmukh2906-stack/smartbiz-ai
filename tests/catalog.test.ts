import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../server/domain.ts";
import { enrichSampleCatalog } from "../server/catalog.ts";

test("catalogue migration adds branded image references without changing shop prices", () => {
  const state = seed();
  const prices = state.products.map((product) => product.price);

  assert.deepEqual(enrichSampleCatalog(state), { updated: 6 });
  assert.deepEqual(
    state.products.map((product) => product.price),
    prices,
  );
  assert.equal(state.products[0].name, "Amul Taaza Toned Milk");
  assert.equal(state.products[0].brand, "Amul");
  assert.equal(state.products[0].packSize, "1 L · Tetra Pak");
  assert.equal(state.products[0].unit, "pack");
  assert.match(state.products[0].image!, /^https:\/\//);
  assert.match(state.products[0].sourceUrl!, /^https:\/\//);
  assert.match(state.products[0].barcode, /^SB-SAMPLE-P1$/);
  assert.equal(enrichSampleCatalog(state).updated, 0);
});

test("catalogue migration leaves owner-renamed products untouched", () => {
  const state = seed();
  state.products[0].name = "My neighbourhood dairy milk";
  const originalImage = state.products[0].image;

  assert.deepEqual(enrichSampleCatalog(state), { updated: 5 });
  assert.equal(state.products[0].name, "My neighbourhood dairy milk");
  assert.equal(state.products[0].image, originalImage);
});
