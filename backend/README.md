# Partidos: backend

[English](#english) · [Español](#español)

---

## English

Node.js + Express API for [partidos.com.ar](https://partidos.com.ar). It sits in front of **BSD (Bzzoiro Sports Data)**, a sports data provider whose free plan allows 7,500 requests/day, and makes sure the site stays within that limit.

### Structure

```
server.js          API used by the frontend (gzip, rate limiting, Cache-Control)
dataSource.js      talks to BSD
cache.js           in-memory + SQLite cache, by key and TTL
withCache.js       get-or-fetch with request de-duplication (no cache stampedes)
db.js              shared SQLite connection (data/store.db, WAL mode)
quotaGuard.js      counts today's requests and stops before the daily limit
cloudflare-worker/ edge cache in front of the API
docs/DETALLES.md   full design notes (Spanish)
```

### How the quota is protected

- **TTL by match state:** today's feed 1 minute, future dates 6 hours, finished matches 7 days. Live match detail 30 seconds.
- **One request per daily feed:** all leagues come in a single (paginated) call; the frontend groups them.
- **Quota guard:** stops 50 requests before the daily limit and answers `503` with `quotaExceeded: true`. If the provider reports the real quota is exhausted, the guard syncs and stops for the rest of the day.
- **Stale fallback:** if the provider fails, cached data is served with `stale: true` instead of an error.
- **Persistence:** cache and quota counter live in SQLite, so a restart on Render's free tier doesn't reset them.
- **Background refresh and warm-up** of today's feed, so visitors never wait for a cold call.
- **Edge cache:** a Cloudflare Worker caches responses using the API's own `Cache-Control` headers.
- Rate limiting per IP (60 requests/min) and gzip compression.

### Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/matches?date=YYYY-MM-DD` | Matches of the day for every league |
| `GET /api/matches/:id` | Match detail |
| `GET /api/search?q=` | Teams and leagues |
| `GET /api/teams/:id` · `/api/teams/:id/calendar` | Team · Team fixtures |
| `GET /api/players/:id` | Player |
| `GET /api/leagues/:id` · `/bestxi` · `/leaders` | Competition · Best XI · Top players |
| `GET /api/referees/:id` · `/api/managers/:id` · `/api/venues/:id` | Referee · Coach · Stadium |
| `GET /api/transfers` | Transfers |
| `GET /api/quota` | Requests used today (free) |
| `GET /health` | Health check |

### Run

```bash
cp .env.example .env   # add your BSD_API_KEY (free at sports.bzzoiro.com)
npm install
npm start              # http://localhost:3001
```

To change the daily limit (for a paid plan), set `API_DAILY_LIMIT` in `.env`.

### Edge cache deploy (Cloudflare Worker)

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

The route and origin are configured in `cloudflare-worker/wrangler.toml`. DNS and SSL setup are explained in [docs/DETALLES.md](docs/DETALLES.md).

---

## Español

API en Node.js + Express para [partidos.com.ar](https://partidos.com.ar). Está delante de **BSD (Bzzoiro Sports Data)**, un proveedor de datos deportivos cuyo plan gratuito permite 7.500 requests por día, y se asegura de que el sitio no pase ese límite.

### Estructura

```
server.js          API que consume el frontend (gzip, rate limit, Cache-Control)
dataSource.js      habla con BSD
cache.js           caché en memoria + SQLite, por clave y TTL
withCache.js       get-or-fetch con de-duplicación de requests (evita cache stampede)
db.js              conexión SQLite compartida (data/store.db, modo WAL)
quotaGuard.js      cuenta las requests del día y corta antes del límite
cloudflare-worker/ caché de borde delante de la API
docs/DETALLES.md   notas de diseño completas
```

### Cómo se cuida la cuota

- **TTL según el estado del partido:** feed de hoy 1 minuto, fechas futuras 6 horas, partidos terminados 7 días. Detalle de partido en vivo 30 segundos.
- **Una sola request por feed diario:** todas las ligas vienen en una llamada (paginada); el frontend las agrupa.
- **Control de cuota:** corta 50 requests antes del límite diario y responde `503` con `quotaExceeded: true`. Si el proveedor avisa que la cuota real se agotó, el contador se sincroniza y corta por el resto del día.
- **Fallback a datos viejos:** si el proveedor falla, se devuelven los datos cacheados con `stale: true` en vez de un error.
- **Persistencia:** la caché y el contador de cuota viven en SQLite, así que un reinicio en el plan gratuito de Render no los borra.
- **Refresco en segundo plano y precarga** del feed de hoy, para que ningún visitante espere una llamada en frío.
- **Caché de borde:** un Cloudflare Worker cachea las respuestas usando los headers `Cache-Control` de la propia API.
- Rate limiting por IP (60 requests por minuto) y compresión gzip.

### Endpoints

| Endpoint | Devuelve |
|---|---|
| `GET /api/matches?date=YYYY-MM-DD` | Partidos del día de todas las ligas |
| `GET /api/matches/:id` | Detalle de partido |
| `GET /api/search?q=` | Equipos y ligas |
| `GET /api/teams/:id` · `/api/teams/:id/calendar` | Equipo · Calendario del equipo |
| `GET /api/players/:id` | Jugador |
| `GET /api/leagues/:id` · `/bestxi` · `/leaders` | Competición · Equipo ideal · Mejores jugadores |
| `GET /api/referees/:id` · `/api/managers/:id` · `/api/venues/:id` | Árbitro · Entrenador · Estadio |
| `GET /api/transfers` | Transferencias |
| `GET /api/quota` | Requests usadas hoy (sin costo) |
| `GET /health` | Estado del servicio |

### Cómo correrlo

```bash
cp .env.example .env   # cargá tu BSD_API_KEY (gratis en sports.bzzoiro.com)
npm install
npm start              # http://localhost:3001
```

Para cambiar el límite diario (con un plan pago), definí `API_DAILY_LIMIT` en `.env`.

### Deploy de la caché de borde (Cloudflare Worker)

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

La ruta y el origen se configuran en `cloudflare-worker/wrangler.toml`. La configuración de DNS y SSL está explicada en [docs/DETALLES.md](docs/DETALLES.md).
