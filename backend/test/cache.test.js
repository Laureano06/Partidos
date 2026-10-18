const { test } = require("node:test");
const assert = require("node:assert/strict");
const { useTempDataDir, sleep } = require("./helpers");

useTempDataDir();
const { getCached, getCachedMeta, setCached, isExpired } = require("../cache");

test("una clave que nunca se guardó cuenta como vencida", () => {
  assert.equal(isExpired("nunca-guardada"), true);
  assert.equal(getCached("nunca-guardada"), null);
  assert.equal(getCachedMeta("nunca-guardada"), null);
});

test("guarda y devuelve el mismo dato (ida y vuelta por JSON)", () => {
  const data = { matches: [{ id: 1, home: "Racing", away: "Independiente" }] };
  setCached("feed:2026-10-18", data, 60_000);
  assert.deepEqual(getCached("feed:2026-10-18"), data);
  assert.equal(isExpired("feed:2026-10-18"), false);
});

test("pasado el TTL, el dato queda vencido pero se sigue pudiendo leer", async () => {
  setCached("ttl-corto", { ok: true }, 20);
  assert.equal(isExpired("ttl-corto"), false);
  await sleep(40);
  assert.equal(isExpired("ttl-corto"), true);
  assert.deepEqual(getCached("ttl-corto"), { ok: true });
});

test("guardar de nuevo una clave pisa el dato y reinicia el TTL", async () => {
  setCached("pisable", { version: 1 }, 20);
  await sleep(40);
  assert.equal(isExpired("pisable"), true);

  setCached("pisable", { version: 2 }, 60_000);
  assert.equal(isExpired("pisable"), false);
  assert.deepEqual(getCached("pisable"), { version: 2 });
});

test("getCachedMeta devuelve cuándo se guardó y con qué TTL", () => {
  const before = Date.now();
  setCached("meta", [1, 2, 3], 5_000);
  const meta = getCachedMeta("meta");
  assert.equal(meta.ttlMs, 5_000);
  assert.deepEqual(meta.data, [1, 2, 3]);
  assert.ok(meta.updatedAt >= before && meta.updatedAt <= Date.now());
});
