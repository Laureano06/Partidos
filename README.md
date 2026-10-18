# Partidos: live football scores

**Live:** https://partidos.com.ar

A live football scores website: daily fixtures grouped by league, standings, and team and match detail pages, with favorite teams and leagues.

## Repository structure

| Folder | What it is | Stack |
|---|---|---|
| [`frontend/`](frontend) | Web app: feed grouped by league and date, leagues categorized by continent, youth and women's competitions, favorites saved in localStorage | React 19, Vite, React Router |
| [`backend/`](backend) | API in front of an external sports data provider: in-memory + SQLite cache with TTLs, daily quota guard, rate limiting, gzip and Cache-Control headers | Node.js, Express, SQLite |

Each folder has its own README with architecture details.

## Engineering highlights

- Migrated the whole data layer to a new provider after the original API account was suspended, without changing the frontend contract.
- Designed caching and quota control so the site runs on a free data plan (7,500 requests/day).

## Run locally

```bash
# backend
cd backend
cp .env.example .env   # add your data provider key
npm install
npm start

# frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## History

This repo merges the former `Marcador-frontend` and `Marcador-backend` repositories, with their full commit history preserved.
