# Partidos: frontend

[English](#english) · [Español](#español)

---

## English

React 19 + Vite + React Router web app for [partidos.com.ar](https://partidos.com.ar).

### Structure

```
src/
  App.jsx              routes (React Router)
  Layout.jsx           header, league sidebar, search and the daily feed fetch
  api.js               calls to the backend
  utils.js             grouping by league/date, time formatting, crest colors
  leagueCategories.js  groups the feed's leagues by continent, youth and women's
  competitions/        competition ranking and region tree
  useFavorites.js      favorite teams and leagues in localStorage
  useDocumentMeta.js   per-page title and meta tags (SEO)
  useStructuredData.js JSON-LD structured data
  useInstallPrompt.js  PWA install prompt
  motion/              reusable animations (Motion)
  pages/               one page per route
  components/          match feed and cards, match detail (events, lineups, stats,
                       shot map, momentum, head-to-head), standings, team, player,
                       coach, referee and stadium details, search, date strip
public/
  manifest.webmanifest, sw.js   PWA
  robots.txt, sitemap.xml       SEO
```

### Routes

| Route | Page |
|---|---|
| `/fecha/:date` | Matches of the day |
| `/partido/:id` | Match detail |
| `/equipo/:id` | Team |
| `/jugador/:id` | Player |
| `/competicion/:id` | Competition and standings |
| `/entrenador/:id` · `/arbitro/:id` · `/estadio/:id` | Coach · Referee · Stadium |
| `/transferencias` | Transfers |
| `/comparar` | Player comparison |

### Run

Needs the backend running (`../backend`). By default it calls `http://localhost:3001`; to use another URL, set `VITE_API_BASE` in a `.env` file.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # production build in dist/
```

Deployed on Vercel with Root Directory set to `frontend`.

---

## Español

Aplicación web en React 19 + Vite + React Router para [partidos.com.ar](https://partidos.com.ar).

### Estructura

```
src/
  App.jsx              rutas (React Router)
  Layout.jsx           header, sidebar de ligas, buscador y el fetch del feed del día
  api.js               llamadas al backend
  utils.js             agrupar por liga/fecha, formatear hora, colores de escudo
  leagueCategories.js  agrupa las ligas del feed por continente, juveniles y femenino
  competitions/        ranking de competiciones y árbol de regiones
  useFavorites.js      equipos y ligas favoritos en localStorage
  useDocumentMeta.js   título y meta tags por página (SEO)
  useStructuredData.js datos estructurados JSON-LD
  useInstallPrompt.js  aviso para instalar la PWA
  motion/              animaciones reutilizables (Motion)
  pages/               una página por ruta
  components/          feed y tarjetas de partidos, detalle de partido (eventos,
                       alineaciones, estadísticas, mapa de tiros, momentum, historial),
                       tabla de posiciones, fichas de equipo, jugador, entrenador,
                       árbitro y estadio, buscador, selector de fecha
public/
  manifest.webmanifest, sw.js   PWA
  robots.txt, sitemap.xml       SEO
```

### Rutas

| Ruta | Página |
|---|---|
| `/fecha/:date` | Partidos del día |
| `/partido/:id` | Detalle de partido |
| `/equipo/:id` | Equipo |
| `/jugador/:id` | Jugador |
| `/competicion/:id` | Competición y tabla de posiciones |
| `/entrenador/:id` · `/arbitro/:id` · `/estadio/:id` | Entrenador · Árbitro · Estadio |
| `/transferencias` | Transferencias |
| `/comparar` | Comparador de jugadores |

### Cómo correrlo

Necesita el backend corriendo (`../backend`). Por defecto llama a `http://localhost:3001`; para usar otra URL, definí `VITE_API_BASE` en un archivo `.env`.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # build de producción en dist/
```

Se publica en Vercel con Root Directory = `frontend`.
