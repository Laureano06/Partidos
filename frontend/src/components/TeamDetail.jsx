import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTeamProfile, fetchTeamCalendar, fetchCompetitionDetail, fetchTransfers } from "../api";
import { crestColor, formatTime, labelForDate, toDateKey } from "../utils";
import FavoriteButton from "./FavoriteButton";
import PlayerFace from "./PlayerFace";
import PlayerLink from "./PlayerLink";
import TeamLink from "./TeamLink";
import StandingsTable from "./StandingsTable";
import { TransferRow } from "../pages/TransfersPage";
import { ChevronLeftIcon } from "./icons";
import { useDocumentMeta } from "../useDocumentMeta";

const POSITION_ORDER = ["Goalkeepers", "Defenders", "Midfielders", "Forwards"];
const POSITION_LABEL = {
  Goalkeepers: "Arqueros",
  Defenders: "Defensores",
  Midfielders: "Mediocampistas",
  Forwards: "Delanteros",
};

const RESULT_LABEL = { W: "Ganó", D: "Empató", L: "Perdió" };

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "plantel", label: "Plantel" },
  { key: "calendario", label: "Calendario" },
  { key: "clasificacion", label: "Clasificación" },
  { key: "fichajes", label: "Fichajes" },
];

// Escudo circular con respaldo de color por hash — mismo patrón que
// Crest Avatar (ver DESIGN.md) usado en toda la app para escudos chicos
// que pueden faltar en la API.
function OpponentCrest({ crest, name, className }) {
  if (crest) return <img src={crest} alt="" className={className} />;
  return (
    <span className={className} style={{ background: crestColor(name || "") }}>
      {(name || "?").slice(0, 3).toUpperCase()}
    </span>
  );
}

// Nombre de competencia clickeable a su propia ficha (/competicion/:id)
// — sin id (dato viejo o competencia sin id resuelto) se muestra como
// texto plano en vez de un link roto.
function CompetitionLink({ leagueId, children, className }) {
  if (!leagueId) return <span className={className}>{children}</span>;
  return (
    <Link to={`/competicion/${leagueId}`} className={"team-link" + (className ? ` ${className}` : "")}>
      {children}
    </Link>
  );
}

function groupSquadByPosition(squad) {
  const groups = {};
  for (const p of squad) {
    const key = p.position || "Otros";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort(
    (a, b) => POSITION_ORDER.indexOf(a[0]) - POSITION_ORDER.indexOf(b[0])
  );
}

// Fila de un partido (últimos 5 de profile.recentMatches, o cualquiera
// del calendario completo) — mismo layout en los dos casos, la única
// diferencia es de dónde sale el resultado W/D/L: recentMatches ya lo
// trae calculado, un partido del calendario lo calcula acá si ya
// terminó (un programado todavía no tiene resultado que mostrar).
function resultFor(m) {
  if (m.result) return m.result;
  if (m.status !== "final" || m.goalsFor == null || m.goalsAgainst == null) return null;
  return m.goalsFor > m.goalsAgainst ? "W" : m.goalsFor < m.goalsAgainst ? "L" : "D";
}

function MatchRow({ m }) {
  const result = resultFor(m);
  const isUpcoming = m.status === "scheduled" || (!m.status && m.goalsFor == null);
  return (
    <li className="h2h-recent-row">
      {result ? (
        <span className={"form-chip form-chip-sm form-chip-" + result} title={RESULT_LABEL[result]}>
          {result}
        </span>
      ) : (
        <span className="form-chip form-chip-sm" aria-hidden="true" />
      )}
      <span className="h2h-recent-date">
        {new Date(m.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
      </span>
      <span className="h2h-recent-teams">
        {m.isHome ? "vs" : "@"} <TeamLink teamId={m.opponentId}>{m.opponentName || m.opponent}</TeamLink>
        {isUpcoming ? (
          <>
            {" "}
            <span className="h2h-recent-time">{formatTime(m.date)}</span>
          </>
        ) : (
          <>
            {" "}
            <strong>
              {m.goalsFor}-{m.goalsAgainst}
            </strong>
          </>
        )}
        {m.competition && (
          <>
            {" · "}
            <CompetitionLink leagueId={m.leagueId} className="h2h-recent-competition">
              {m.competition}
            </CompetitionLink>
          </>
        )}
      </span>
    </li>
  );
}

export default function TeamDetail({ teamId, onBack, isFavorite, onToggleFavorite }) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("resumen");

  // Las tres pestañas pesadas se piden recién cuando alguien las abre —
  // Principio de Producto 1 (nunca cambiar cuota por una feature): la
  // mayoría de las visitas a una ficha de equipo solo quieren ver el
  // plantel o el próximo partido, no tiene sentido pagarle a BSD el
  // calendario completo / la tabla / los fichajes en cada una.
  const [calendar, setCalendar] = useState({ status: "idle", data: null, error: null });
  const [standings, setStandings] = useState({ status: "idle", data: null, error: null });
  const [transfers, setTransfers] = useState({ status: "idle", data: null, error: null });

  const load = useCallback(() => {
    setStatus("loading");
    setProfile(null);
    setActiveTab("resumen");
    setCalendar({ status: "idle", data: null, error: null });
    setStandings({ status: "idle", data: null, error: null });
    setTransfers({ status: "idle", data: null, error: null });
    fetchTeamProfile(teamId)
      .then((data) => {
        setProfile(data);
        setStatus("ok");
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(err.message);
        setStatus("error");
      });
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab !== "calendario" || calendar.status !== "idle") return;
    setCalendar({ status: "loading", data: null, error: null });
    fetchTeamCalendar(teamId)
      .then((data) => setCalendar({ status: "ok", data: data.matches, error: null }))
      .catch((err) => {
        console.error(err);
        setCalendar({ status: "error", data: null, error: err.message });
      });
  }, [activeTab, teamId, calendar.status]);

  // Liga "principal" para la pestaña Clasificación: la del próximo
  // partido si hay, si no la del último jugado — no hay un campo
  // explícito de "liga actual" en la ficha de BSD, así que se infiere de
  // los partidos que ya tenemos.
  const primaryLeagueId = profile?.nextMatch?.leagueId ?? profile?.recentMatches?.[0]?.leagueId ?? null;

  useEffect(() => {
    if (activeTab !== "clasificacion" || standings.status !== "idle" || !primaryLeagueId) return;
    setStandings({ status: "loading", data: null, error: null });
    fetchCompetitionDetail(primaryLeagueId)
      .then((data) => setStandings({ status: "ok", data, error: null }))
      .catch((err) => {
        console.error(err);
        setStandings({ status: "error", data: null, error: err.message });
      });
  }, [activeTab, primaryLeagueId, standings.status]);

  useEffect(() => {
    if (activeTab !== "fichajes" || transfers.status !== "idle") return;
    setTransfers({ status: "loading", data: null, error: null });
    fetchTransfers({ team_id: teamId })
      .then((data) => setTransfers({ status: "ok", data: data.transfers, error: null }))
      .catch((err) => {
        console.error(err);
        setTransfers({ status: "error", data: null, error: err.message });
      });
  }, [activeTab, teamId, transfers.status]);

  useDocumentMeta({
    title: profile ? `${profile.name} — Plantel, calendario y fichajes | PARTIDOS` : "PARTIDOS",
    description: profile
      ? `Plantel, próximo partido, últimos resultados, tabla de posiciones y fichajes de ${profile.name}${
          profile.country ? ` (${profile.country})` : ""
        } en PARTIDOS.`
      : undefined,
  });

  // "Impronta" del club: no todos tienen colores de marca cargados en la
  // API, así que usamos el mismo hash de color que ya se usa como
  // fallback del escudo — cada club se ve siempre con SU color, estable
  // entre visitas, sin depender de un dato que puede faltar.
  const identityColor = profile ? crestColor(profile.name) : null;

  const upcoming = calendar.data?.filter((m) => m.status === "scheduled") ?? [];
  const played = calendar.data ? calendar.data.filter((m) => m.status !== "scheduled").reverse() : [];

  return (
    <div className="team-detail">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeftIcon />Volver
      </button>

      {status === "loading" && <p className="empty">Cargando equipo…</p>}
      {status === "error" && (
        <div className="error-state">
          <p className="error-state-title">No pudimos cargar este equipo</p>
          <p className="error-state-subtitle">{errorMessage}</p>
          <button className="error-state-retry" onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      {status === "ok" && profile?.stale && (
        <div className="stale-banner">
          Mostrando datos guardados — se alcanzó el límite diario de la API.
        </div>
      )}

      {status === "ok" && profile && (
        <>
          <div
            className="team-header"
            style={{ "--identity-color": identityColor }}
          >
            {profile.crest && (
              <div className="team-header-crest">
                <img src={profile.crest} alt="" />
              </div>
            )}
            <div className="team-header-info">
              <div className="team-header-name-row">
                <h1>{profile.name}</h1>
                <FavoriteButton
                  active={isFavorite}
                  onClick={onToggleFavorite}
                  size="lg"
                />
              </div>
              {(profile.country || profile.founded) && (
                <div className="team-header-meta">
                  {profile.country}
                  {profile.founded ? ` · Fundado en ${profile.founded}` : ""}
                </div>
              )}
              {profile.venue?.name && (
                <div className="team-header-meta">
                  {profile.venue.name}
                  {profile.venue.city ? `, ${profile.venue.city}` : ""}
                  {profile.venue.capacity
                    ? ` · Capacidad ${profile.venue.capacity.toLocaleString("es-AR")}`
                    : ""}
                </div>
              )}
            </div>
          </div>

          <div className="match-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                className={"match-tab" + (activeTab === t.key ? " active" : "")}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "resumen" && (
            <>
              {profile.nextMatch && (
                <div className="team-section">
                  <h2 className="team-section-title">Próximo partido</h2>
                  <TeamLink teamId={profile.nextMatch.opponentId} className="next-match-card">
                    <OpponentCrest
                      crest={profile.nextMatch.opponentCrest}
                      name={profile.nextMatch.opponentName}
                      className="next-match-crest"
                    />
                    <span className="next-match-info">
                      <span className="next-match-vs">
                        {profile.nextMatch.isHome ? "vs" : "@"} {profile.nextMatch.opponentName}
                      </span>
                      <span className="next-match-meta">
                        {profile.nextMatch.competition && (
                          <>
                            <CompetitionLink leagueId={profile.nextMatch.leagueId}>
                              {profile.nextMatch.competition}
                            </CompetitionLink>
                            {" · "}
                          </>
                        )}
                        {labelForDate(toDateKey(new Date(profile.nextMatch.date)))} ·{" "}
                        {formatTime(profile.nextMatch.date)}
                      </span>
                    </span>
                  </TeamLink>
                </div>
              )}

              {profile.recentMatches?.length > 0 && (
                <div className="team-section">
                  <h2 className="team-section-title">Últimos partidos</h2>
                  <ul className="h2h-recent-list">
                    {profile.recentMatches.map((m) => (
                      <MatchRow key={m.id} m={m} />
                    ))}
                  </ul>
                </div>
              )}

              {!profile.nextMatch && !profile.recentMatches?.length && (
                <p className="empty">No hay partidos recientes ni programados para mostrar.</p>
              )}
            </>
          )}

          {activeTab === "plantel" && (
            <div className="team-section">
              {profile.squad.length > 0 ? (
                groupSquadByPosition(profile.squad).map(([position, players]) => (
                  <div key={position}>
                    <div className="squad-position-label">
                      {POSITION_LABEL[position] || position}
                    </div>
                    <div className="squad-list">
                      {players.map((p) => (
                        <PlayerLink
                          key={p.id}
                          playerId={p.id}
                          className="squad-player"
                          aria-label={`Ver perfil de ${p.name}`}
                        >
                          <div className="squad-player-photo">
                            <PlayerFace photo={p.photo} name={p.name} size="lg" />
                            {p.number != null && (
                              <span className="squad-player-number">{p.number}</span>
                            )}
                          </div>
                          <div className="squad-player-name">{p.name}</div>
                          {p.age != null && (
                            <div className="squad-player-age">{p.age} años</div>
                          )}
                        </PlayerLink>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">No hay plantel disponible para este equipo.</p>
              )}
            </div>
          )}

          {activeTab === "calendario" && (
            <>
              {calendar.status === "loading" && <p className="empty">Cargando calendario…</p>}
              {calendar.status === "error" && (
                <div className="error-state">
                  <p className="error-state-title">No pudimos cargar el calendario</p>
                  <p className="error-state-subtitle">{calendar.error}</p>
                </div>
              )}
              {calendar.status === "ok" && (
                <>
                  {upcoming.length > 0 && (
                    <div className="team-section">
                      <h2 className="team-section-title">Por jugar</h2>
                      <ul className="h2h-recent-list">
                        {upcoming.map((m) => (
                          <MatchRow key={m.id} m={m} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {played.length > 0 && (
                    <div className="team-section">
                      <h2 className="team-section-title">Jugados</h2>
                      <ul className="h2h-recent-list">
                        {played.map((m) => (
                          <MatchRow key={m.id} m={m} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {upcoming.length === 0 && played.length === 0 && (
                    <p className="empty">No encontramos partidos en el calendario de este equipo.</p>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "clasificacion" && (
            <>
              {!primaryLeagueId && (
                <p className="empty">No pudimos determinar la competencia actual de este equipo.</p>
              )}
              {primaryLeagueId && standings.status === "loading" && (
                <p className="empty">Cargando tabla de posiciones…</p>
              )}
              {standings.status === "error" && (
                <div className="error-state">
                  <p className="error-state-title">No pudimos cargar la tabla de posiciones</p>
                  <p className="error-state-subtitle">{standings.error}</p>
                </div>
              )}
              {standings.status === "ok" && standings.data?.standings?.length > 0 && (
                <div className="team-section">
                  <h2 className="team-section-title">
                    Clasificación — {standings.data.name}
                  </h2>
                  {standings.data.standings.map((table, i) => (
                    <StandingsTable key={i} table={table} highlightTeamId={profile.id} />
                  ))}
                  <Link to={`/competicion/${primaryLeagueId}`} className="team-link">
                    Ver goleadores, asistencias y once ideal de {standings.data.name} →
                  </Link>
                </div>
              )}
              {standings.status === "ok" && !standings.data?.standings?.length && (
                <p className="empty">Todavía no hay tabla de posiciones para esta competencia.</p>
              )}
            </>
          )}

          {activeTab === "fichajes" && (
            <>
              {transfers.status === "loading" && <p className="empty">Cargando fichajes…</p>}
              {transfers.status === "error" && (
                <div className="error-state">
                  <p className="error-state-title">No pudimos cargar los fichajes</p>
                  <p className="error-state-subtitle">{transfers.error}</p>
                </div>
              )}
              {transfers.status === "ok" && transfers.data?.length > 0 && (
                <div className="team-section">
                  <h2 className="team-section-title">Fichajes</h2>
                  <ul className="transfers-list">
                    {transfers.data.map((t) => (
                      <TransferRow key={t.id} transfer={t} />
                    ))}
                  </ul>
                </div>
              )}
              {transfers.status === "ok" && !transfers.data?.length && (
                <p className="empty">No encontramos fichajes recientes de este equipo.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
