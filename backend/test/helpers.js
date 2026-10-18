// Cada archivo de test corre en su propio proceso (node --test), así que
// alcanza con apuntar DATA_DIR a una carpeta temporal antes del primer
// require de db.js para que nunca se toque data/store.db.
const fs = require("fs");
const os = require("os");
const path = require("path");

function useTempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "partidos-test-"));
  process.env.DATA_DIR = dir;
  return dir;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { useTempDataDir, sleep };
