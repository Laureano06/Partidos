import TeamLink from "./TeamLink";

function FormChips({ form }) {
  if (!form) return null;
  return (
    <span className="standings-form">
      {[...form].map((r, i) => (
        <span key={i} className={"form-chip form-chip-sm form-chip-" + r}>
          {r}
        </span>
      ))}
    </span>
  );
}

// Tabla de posiciones — usada tanto en la ficha de competencia
// (CompetitionDetail) como en la pestaña "Clasificación" de la ficha de
// equipo (TeamDetail), de ahí vivir en su propio archivo en vez de
// definida una sola vez donde se usó primero. `highlightTeamId` es
// opcional: sin él, ninguna fila se destaca (uso desde CompetitionDetail,
// donde no hay "el equipo de esta página" que resaltar).
export default function StandingsTable({ table, highlightTeamId }) {
  return (
    <div className="standings-table-wrap">
      {table.groupName && <div className="standings-group-title">{table.groupName}</div>}
      <div className="standings-scroll">
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="standings-team-col">Equipo</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>Pts</th>
              <th className="standings-form-col">Forma</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr
                key={row.teamId}
                className={
                  (row.zone ? "standings-zone-" + row.zone.type : "") +
                  (highlightTeamId && row.teamId === highlightTeamId ? " standings-row-highlight" : "")
                }
              >
                <td>{row.position}</td>
                <td className="standings-team-col">
                  <TeamLink teamId={row.teamId} className="standings-team">
                    {row.teamCrest && <img src={row.teamCrest} alt="" className="standings-crest" />}
                    {row.teamName}
                  </TeamLink>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.goalsFor}</td>
                <td>{row.goalsAgainst}</td>
                <td>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                <td className="standings-pts">{row.points}</td>
                <td className="standings-form-col">
                  <FormChips form={row.form} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.some((r) => r.zone) && (
        <ul className="standings-legend">
          {[...new Map(table.rows.filter((r) => r.zone).map((r) => [r.zone.label, r.zone])).values()].map(
            (zone) => (
              <li key={zone.label} className={"standings-legend-item standings-zone-" + zone.type}>
                <span className="standings-legend-dot" />
                {zone.label}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
