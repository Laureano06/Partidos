import { useCallback, useEffect, useState } from "react";
import { fetchTeamProfile } from "../api";
import { crestColor, formatTime, labelForDate, toDateKey } from "../utils";
import FavoriteButton from "./FavoriteButton";
import PlayerFace from "./PlayerFace";
import PlayerLink from "./PlayerLink";
import TeamLink from "./TeamLink";
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

export default function TeamDetail({ teamId, onBack, isFavorite, onToggleFavorite }) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    setProfile(null);
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

  useDocumentMeta({
    title: profile ? `${profile.name} — Plantel y resultados | PARTIDOS` : "PARTIDOS",
    description: profile
      ? `Plantel, resultados y datos de ${profile.name}${
          profile.country ? ` (${profile.country})` : ""
        } en PARTIDOS.`
      : undefined,
  });

  // "Impronta" del club: no todos tienen colores de marca cargados en la
  // API, así que usamos el mismo hash de color que ya se usa como
  // fallback del escudo — cada club se ve siempre con SU color, estable
  // entre visitas, sin depender de un dato que puede faltar.
  const identityColor = profile ? crestColor(profile.name) : null;

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
                    {profile.nextMatch.competition ? `${profile.nextMatch.competition} · ` : ""}
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
                  <li key={m.id} className="h2h-recent-row">
                    <span
                      className={"form-chip form-chip-sm form-chip-" + m.result}
                      title={RESULT_LABEL[m.result]}
                    >
                      {m.result}
                    </span>
                    <span className="h2h-recent-date">
                      {new Date(m.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="h2h-recent-teams">
                      {m.isHome ? "vs" : "@"} <TeamLink teamId={m.opponentId}>{m.opponent}</TeamLink>{" "}
                      <strong>
                        {m.goalsFor}-{m.goalsAgainst}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.squad.length > 0 && (
            <div className="team-section">
              <h2 className="team-section-title">Plantel</h2>
              {groupSquadByPosition(profile.squad).map(([position, players]) => (
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
