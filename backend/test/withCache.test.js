const { test } = require("node:test");
const assert = require("node:assert/strict");
const { useTempDataDir, sleep } = require("./helpers");

useTempDataDir();
const { getOrFetch } = require("../withCache");
const { setCached, getCachedMeta } = require("../cache");

function countingFetcher(result, delayMs = 30) {
  const fetcher = async () => {
    fetcher.calls++;
    await sleep(delayMs);
    return typeof result === "function" ? result(fetcher.calls) : result;
  };
  fetcher.calls = 0;
  return fetcher;
}

test("sin caché, llama a la API y guarda el resultado", async () => {
  const fetcher = countingFetcher({ score: "1-1" });
  const data = await getOrFetch("partido:1", fetcher, 60_000);
  assert.deepEqual(data, { score: "1-1" });
  assert.equal(fetcher.calls, 1);
  assert.deepEqual(getCachedMeta("partido:1").data, { score: "1-1" });
});

test("con el dato vigente en caché, no vuelve a llamar a la API", async () => {
  setCached("partido:2", { score: "2-0" }, 60_000);
  const fetcher = countingFetcher({ score: "otro" });
  const data = await getOrFetch("partido:2", fetcher, 60_000);
  assert.deepEqual(data, { score: "2-0" });
  assert.equal(fetcher.calls, 0);
});

test("pedidos simultáneos de la misma clave vencida hacen UNA sola llamada (sin cache stampede)", async () => {
  const fetcher = countingFetcher((n) => ({ llamada: n }), 50);
  const results = await Promise.all([
    getOrFetch("feed:hoy", fetcher, 60_000),
    getOrFetch("feed:hoy", fetcher, 60_000),
    getOrFetch("feed:hoy", fetcher, 60_000),
  ]);
  assert.equal(fetcher.calls, 1);
  for (const r of results) assert.deepEqual(r, { llamada: 1 });
});

test("claves distintas no se bloquean entre sí", async () => {
  const fetcher = countingFetcher({ ok: true });
  await Promise.all([
    getOrFetch("liga:1", fetcher, 60_000),
    getOrFetch("liga:2", fetcher, 60_000),
  ]);
  assert.equal(fetcher.calls, 2);
});

test("el TTL puede depender del dato (ej: más corto si el partido está en vivo)", async () => {
  const ttlFor = (data) => (data.status === "live" ? 30_000 : 7 * 24 * 60 * 60 * 1000);
  await getOrFetch("partido:vivo", async () => ({ status: "live" }), ttlFor);
  await getOrFetch("partido:final", async () => ({ status: "finished" }), ttlFor);
  assert.equal(getCachedMeta("partido:vivo").ttlMs, 30_000);
  assert.equal(getCachedMeta("partido:final").ttlMs, 7 * 24 * 60 * 60 * 1000);
});

test("si la API falla, el error llega a todos los que esperaban y no se cachea nada", async () => {
  const failing = countingFetcher(() => {
    throw new Error("BSD caído");
  });
  const results = await Promise.allSettled([
    getOrFetch("falla", failing, 60_000),
    getOrFetch("falla", failing, 60_000),
  ]);
  assert.equal(failing.calls, 1);
  for (const r of results) {
    assert.equal(r.status, "rejected");
    assert.match(r.reason.message, /BSD caído/);
  }
  assert.equal(getCachedMeta("falla"), null);
});

test("después de una falla, el siguiente pedido vuelve a intentar", async () => {
  let shouldFail = true;
  const fetcher = async () => {
    if (shouldFail) throw new Error("falla temporal");
    return { ok: true };
  };
  await assert.rejects(getOrFetch("reintento", fetcher, 60_000));
  shouldFail = false;
  assert.deepEqual(await getOrFetch("reintento", fetcher, 60_000), { ok: true });
});
