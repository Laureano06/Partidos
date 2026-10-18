import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  crestColor,
  formatTime,
  groupByLeague,
  labelForDate,
  liveMinuteLabel,
  toDateKey,
} from "./utils";

describe("liveMinuteLabel", () => {
  it("muestra el minuto mientras se juega", () => {
    expect(liveMinuteLabel(45, "1H")).toBe("45'");
    expect(liveMinuteLabel(90, "2H")).toBe("90'");
  });

  it("muestra DESC en el entretiempo aunque la API mande un minuto", () => {
    expect(liveMinuteLabel(45, "HT")).toBe("DESC");
    expect(liveMinuteLabel(105, "BT")).toBe("DESC");
  });

  it("muestra PENALES en la definición por penales", () => {
    expect(liveMinuteLabel(120, "P")).toBe("PENALES");
  });

  it("devuelve null si todavía no hay minuto", () => {
    expect(liveMinuteLabel(null, "1H")).toBeNull();
  });
});

describe("crestColor", () => {
  it("es determinístico: la misma sigla siempre da el mismo color", () => {
    expect(crestColor("RAC")).toBe(crestColor("RAC"));
  });

  it("devuelve un color HSL válido", () => {
    expect(crestColor("BOC")).toMatch(/^hsl\(\d{1,3}, 62%, 58%\)$/);
  });

  it("siglas distintas dan colores distintos", () => {
    expect(crestColor("RAC")).not.toBe(crestColor("IND"));
  });
});

describe("addDays (aritmética de calendario pura)", () => {
  it("suma y resta dentro del mismo mes", () => {
    expect(addDays("2026-10-18", 1)).toBe("2026-10-19");
    expect(addDays("2026-10-18", -1)).toBe("2026-10-17");
  });

  it("cruza fin de mes y fin de año", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("respeta los años bisiestos", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
});

describe("toDateKey y formatTime (siempre en hora de Argentina)", () => {
  it("un instante de madrugada UTC todavía es el día anterior en Argentina", () => {
    // 02:00 UTC del 19 = 23:00 del 18 en Argentina (UTC-3)
    expect(toDateKey(new Date("2026-10-19T02:00:00Z"))).toBe("2026-10-18");
  });

  it("formatea el kickoff en hora argentina, no en la del dispositivo", () => {
    // 23:15 UTC = 20:15 en Argentina, se muestre en formato 12 o 24 h
    const label = formatTime("2026-10-18T23:15:00Z");
    expect(label).toMatch(/^(20|08):15/);
  });
});

describe("labelForDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve HOY, AYER y MAÑANA relativos al día en Argentina", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T15:00:00Z"));
    expect(labelForDate("2026-10-18")).toBe("HOY");
    expect(labelForDate("2026-10-17")).toBe("AYER");
    expect(labelForDate("2026-10-19")).toBe("MAÑANA");
  });

  it("para otras fechas devuelve día de la semana, día y mes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T15:00:00Z"));
    // El separador ("21-OCT" o "21 OCT") depende de la versión de ICU de Node
    expect(labelForDate("2026-10-21")).toMatch(/^MIÉ 21[- ]OCT$/);
  });

  it("cerca de la medianoche usa el día de Argentina, no el de UTC", () => {
    vi.useFakeTimers();
    // 01:00 UTC del 19 = 22:00 del 18 en Argentina: "HOY" sigue siendo el 18
    vi.setSystemTime(new Date("2026-10-19T01:00:00Z"));
    expect(labelForDate("2026-10-18")).toBe("HOY");
  });
});

describe("groupByLeague", () => {
  const match = (id, league, country, extra = {}) => ({
    id,
    league,
    leagueCountry: country,
    leagueId: league.length,
    homeId: id * 10,
    awayId: id * 10 + 1,
    status: "scheduled",
    ...extra,
  });

  it("agrupa los partidos por liga sin perder ninguno", () => {
    const matches = [
      match(1, "Premier League", "England"),
      match(2, "Liga Profesional", "Argentina"),
      match(3, "Premier League", "England"),
    ];
    const groups = groupByLeague(matches);
    expect(Object.keys(groups).sort()).toEqual(["Liga Profesional", "Premier League"]);
    expect(groups["Premier League"].map((m) => m.id)).toEqual([1, 3]);
    expect(Object.values(groups).flat()).toHaveLength(3);
  });

  it("los partidos sin liga van a 'Otras competencias'", () => {
    const groups = groupByLeague([{ id: 9, status: "scheduled" }]);
    expect(Object.keys(groups)).toEqual(["Otras competencias"]);
  });

  it("juveniles y femenino van siempre al final, aunque estén en vivo", () => {
    const matches = [
      match(1, "Liga Profesional Reserve", "Argentina", { status: "live" }),
      match(2, "Liga F", "Spain", { status: "live" }),
      match(3, "Premier League", "England"),
      match(4, "Liga Profesional", "Argentina"),
    ];
    const order = Object.keys(groupByLeague(matches));
    expect(order.slice(0, 2).sort()).toEqual(["Liga Profesional", "Premier League"]);
    expect(order.slice(2).sort()).toEqual(["Liga F", "Liga Profesional Reserve"]);
  });
});
