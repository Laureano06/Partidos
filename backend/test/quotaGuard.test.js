const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { useTempDataDir } = require("./helpers");

useTempDataDir();
process.env.API_DAILY_LIMIT = "100"; // límite chico para poder recorrerlo entero en un test
const db = require("../db");
const quota = require("../quotaGuard");

const LIMIT = 100;
const SAFETY_MARGIN = 50;
const today = () => new Date().toISOString().slice(0, 10);
const setQuotaRow = (date, count) =>
  db.prepare("INSERT OR REPLACE INTO quota (id, date, count) VALUES (1, ?, ?)").run(date, count);

beforeEach(() => {
  db.prepare("DELETE FROM quota").run();
  db.prepare("DELETE FROM cache").run();
});

test("arranca el día en 0 y deja pedir", () => {
  assert.deepEqual(quota.getUsage(), { used: 0, limit: LIMIT, date: today() });
  assert.equal(quota.canMakeRequest(), true);
});

test("cada request registrada suma 1 al contador del día", () => {
  quota.recordRequest();
  quota.recordRequest();
  assert.equal(quota.getUsage().used, 2);
});

test("corta justo al llegar al límite menos el margen de seguridad", () => {
  setQuotaRow(today(), LIMIT - SAFETY_MARGIN - 1);
  assert.equal(quota.canMakeRequest(), true);
  quota.recordRequest();
  assert.equal(quota.getUsage().used, LIMIT - SAFETY_MARGIN);
  assert.equal(quota.canMakeRequest(), false);
});

test("un contador de un día anterior no cuenta: el día nuevo arranca en 0", () => {
  setQuotaRow("2020-01-01", LIMIT);
  assert.equal(quota.getUsage().used, 0);
  assert.equal(quota.canMakeRequest(), true);
});

test("markExhausted corta por el resto del día aunque el contador local diga que queda cuota", () => {
  quota.recordRequest();
  assert.equal(quota.canMakeRequest(), true);
  quota.markExhausted();
  assert.equal(quota.canMakeRequest(), false);
  assert.equal(quota.getUsage().used, LIMIT);
});

test("el contador sobrevive a un 'reinicio' porque vive en SQLite", () => {
  quota.recordRequest();
  quota.recordRequest();
  quota.recordRequest();
  const row = db.prepare("SELECT date, count FROM quota WHERE id = 1").get();
  assert.deepEqual(row, { date: today(), count: 3 });
});

test("una cuenta bloqueada queda marcada con su motivo hasta que vence el cooldown", () => {
  assert.equal(quota.isAccountBlocked(), false);
  assert.equal(quota.accountBlockedInfo(), null);
  quota.markAccountBlocked("token inválido");
  assert.equal(quota.isAccountBlocked(), true);
  assert.equal(quota.accountBlockedInfo().reason, "token inválido");
});

test("los errores propios tienen nombre y un mensaje útil", () => {
  const exceeded = new quota.QuotaExceededError();
  assert.equal(exceeded.name, "QuotaExceededError");
  assert.match(exceeded.message, /límite diario/);

  const blocked = new quota.AccountBlockedError("token revocado");
  assert.equal(blocked.name, "AccountBlockedError");
  assert.match(blocked.message, /token revocado/);
});
