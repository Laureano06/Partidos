import { useCallback, useEffect, useState } from "react";
import { fetchCompetitionDetail, fetchBestXI, fetchLeagueLeaders } from "../api";
import PlayerFace from "./PlayerFace";
import PlayerLink from "./PlayerLink";
import TeamLink from "./TeamLink";
import StandingsTable from "./StandingsTable";
import { ChevronLeftIcon } from "./icons";
import { useDocumentMeta } from "../useDocumentMeta";

const TABS = [
  { key: "tabla", label: "Tabla" },
  { key: "goleadores", label: "Goleadores" },
  { key: "asistencias", label: "Asistencias" },
  { key: "once-ideal", label: "Once ideal" },
];

const BEST_XI_ROWS = [
  { key: "goalkeepers", label: "Arquero" },
  { key: "defenders", label: "Defensores" },
  { key: "midfielders", label: "Mediocampistas" },
  { key: "forwards", label: "Delanteros" },
];

function BestXI({ bestXI }) {
  return (
    <div className="best-xi">
      {bestXI.season?.name && <p className="best-xi-season">{bestXI.season.name}</p>}
      {BEST_XI_ROWS.map((row) => (
        <div key={row.key} className="best-xi-row">
          <div className="best-xi-row-label">{row.label}</div>
          <div className="best-xi-players">
            {bestXI[row.key].map((p) => (
              <PlayerLink key={p.playerId} playerId={p.playerId} className="best-xi-player">
                <PlayerFace photo={p.photo} name={p.playerName} size="md" />
                <span className="best-xi-player-name">{p.playerName}</span>
                <TeamLink teamId={p.teamId} className="best-xi-player-team">
                  {p.teamName}
                </TeamLink>
                <span className="best-xi-player-rating">{p.avgRating.toFixed(2)}</span>
              </PlayerLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ leaders }) {
  return (
    <ol className="leaderboard-list">
      {leaders.map((l) => (
        <li key={l.playerId} className="leaderboard-row">
          <span className="leaderboard-rank">{l.rank}</span>
          <PlayerLink playerId={l.playerId} className="leaderboard-player">
            <PlayerFace photo={l.photo} name={l.playerName} size="sm" />
            <span className="leaderboard-player-info">
              <span className="leaderboard-player-name">{l.playerName}</span>
              <TeamLink teamId={l.teamId} className="leaderboard-team">
                {l.teamName}
              </TeamLink>
            </span>
          </PlayerLink>
          <span className="leaderboard-value">{l.value}</span>
        </li>
      ))}
    </ol>
  );
}

export default function CompetitionDetail({ leagueId, onBack }) {
  const [competition, setCompetition] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("tabla");
  // undefined = "temporada actual, la que decida el backend" — solo pasa
  // a tener un valor puntual cuando el usuario elige una temporada
  // vieja en el selector. Volver a null en vez de guardar el id de la
  // actual evita que quedar "pisada" en una temporada vieja si el
  // usuario cambia de competencia sin tocar el selector.
  const [selectedSeasonId, setSelectedSeasonId] = useState(undefined);

  // Goleadores/asistencias y el once ideal viven en sus propios
  // endpoints, separados de fetchCompetitionDetail — BSD puede tardar
  // hasta ~1 minuto calculando esos rankings para una temporada fría
  // (nadie la pidió en las últimas 2hs), contra <1s que tarda la tabla
  // de posiciones. Pedirlos junto a la ficha principal significaba que
  // la tabla (que sí está lista al toque) esperaba sin necesidad al más
  // lento de los dos. Por eso se piden DESPUÉS de que la ficha principal
  // ya resolvió — la tabla aparece ya, estas dos pestañas se suman solas
  // en cuanto están. null = "no hay datos para esta temporada" (RULE 1:
  // sin datos, la pestaña ni aparece) — undefined = todavía pendiente.
  const [leaders, setLeaders] = useState(undefined);
  const [bestXI, setBestXI] = useState(undefined);

  const load = useCallback(() => {
    setStatus("loading");
    setCompetition(null);
    setLeaders(undefined);
    setBestXI(undefined);
    fetchCompetitionDetail(leagueId, selectedSeasonId)
      .then((data) => {
        setCompetition(data);
        setStatus("ok");
        const seasonId = data.season?.id;
        if (!seasonId) {
          setLeaders(null);
          setBestXI(null);
          return;
        }
        fetchLeagueLeaders(leagueId, seasonId)
          .then(setLeaders)
          .catch((err) => {
            console.error(err);
            setLeaders(null);
          });
        fetchBestXI(leagueId, seasonId)
          .then((data) => setBestXI(data ?? null))
          .catch((err) => {
            console.error(err);
            setBestXI(null);
          });
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(err.message);
        setStatus("error");
      });
  }, [leagueId, selectedSeasonId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedSeasonId(undefined); // otra competencia -> volvemos a "temporada actual"
  }, [leagueId]);

  useDocumentMeta({
    title: competition ? `${competition.name}: tabla, partidos y goleadores | PARTIDOS` : "PARTIDOS",
    description: competition
      ? `Tabla de posiciones, goleadores y asistencias de ${competition.name}${
          competition.country ? ` (${competition.country})` : ""
        } en PARTIDOS.`
      : undefined,
  });

  const availableTabs = competition
    ? TABS.filter((t) => {
        if (t.key === "tabla") return !!competition.standings?.length;
        if (t.key === "goleadores") return !!leaders?.topScorers?.length;
        if (t.key === "asistencias") return !!leaders?.topAssists?.length;
        if (t.key === "once-ideal") return !!bestXI;
        return false;
      })
    : [];
  const currentTab = availableTabs.some((t) => t.key === activeTab) ? activeTab : availableTabs[0]?.key;

  return (
    <div className="competition-detail">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeftIcon />Volver
      </button>

      {status === "loading" && <p className="empty">Cargando competencia…</p>}
      {status === "error" && (
        <div className="error-state">
          <p className="error-state-title">No pudimos cargar esta competencia</p>
          <p className="error-state-subtitle">{errorMessage}</p>
          <button className="error-state-retry" onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      {status === "ok" && competition?.stale && (
        <div className="stale-banner">
          Mostrando datos guardados — se alcanzó el límite diario de la API.
        </div>
      )}

      {status === "ok" && competition && (
        <>
          <div className="competition-header">
            {competition.logo && (
              <div className="competition-header-logo">
                <img src={competition.logo} alt="" />
              </div>
            )}
            <div>
              <h1>{competition.name}</h1>
              <div className="competition-header-meta">
                {competition.country && <span>{competition.country}</span>}
                {!competition.seasons?.length && competition.season?.name && (
                  <span>{competition.season.name}</span>
                )}
              </div>
            </div>
          </div>

          {competition.seasons?.length > 1 && (
            <label className="season-select-wrap">
              <span className="sr-only">Temporada</span>
              <select
                className="season-select"
                value={competition.season?.id ?? ""}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
              >
                {competition.seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {availableTabs.length > 0 && (
            <div className="match-tabs" role="tablist">
              {availableTabs.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={currentTab === t.key}
                  className={"match-tab" + (currentTab === t.key ? " active" : "")}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {(leaders === undefined || bestXI === undefined) && (
            <p className="competition-stats-pending">
              Cargando goleadores, asistencias y once ideal — puede tardar hasta un minuto si nadie pidió esta
              temporada antes.
            </p>
          )}

          {currentTab === "tabla" &&
            competition.standings?.map((table, i) => <StandingsTable key={i} table={table} />)}

          {currentTab === "goleadores" && leaders?.topScorers && (
            <Leaderboard leaders={leaders.topScorers} />
          )}

          {currentTab === "asistencias" && leaders?.topAssists && (
            <Leaderboard leaders={leaders.topAssists} />
          )}

          {currentTab === "once-ideal" && bestXI && <BestXI bestXI={bestXI} />}

          {availableTabs.length === 0 && (
            <p className="empty">Todavía no hay tabla ni estadísticas disponibles para esta competencia.</p>
          )}
        </>
      )}
    </div>
  );
}
