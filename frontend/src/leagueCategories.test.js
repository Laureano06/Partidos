import { describe, expect, it } from "vitest";
import { categoryForLeague } from "./leagueCategories";

describe("categoryForLeague", () => {
  it("ubica las ligas por el continente de su país", () => {
    expect(categoryForLeague("Liga Profesional", "Argentina")).toBe("Sudamérica");
    expect(categoryForLeague("Premier League", "England")).toBe("Europa");
    expect(categoryForLeague("MLS", "USA")).toBe("Norteamérica");
    expect(categoryForLeague("J1 League", "Japan")).toBe("Asia");
  });

  it("usa directamente el continente cuando el proveedor lo manda como país", () => {
    expect(categoryForLeague("Copa Libertadores", "South America")).toBe("Sudamérica");
    expect(categoryForLeague("UEFA Champions League", "Europe")).toBe("Europa");
    expect(categoryForLeague("Friendlies", "World")).toBe("Internacional");
  });

  it("las ligas femeninas van a Femenino antes que a su continente", () => {
    expect(categoryForLeague("Primera División Femenina", "Argentina")).toBe("Femenino");
    expect(categoryForLeague("NWSL", "USA")).toBe("Femenino");
    expect(categoryForLeague("Liga F", "Spain")).toBe("Femenino");
    expect(categoryForLeague("Frauen-Bundesliga", "Germany")).toBe("Femenino");
  });

  it("las juveniles y reservas van a Juveniles antes que a su continente", () => {
    expect(categoryForLeague("Liga Profesional Reserve", "Argentina")).toBe("Juveniles");
    expect(categoryForLeague("Copa Libertadores Sub-20", "South America")).toBe("Juveniles");
    expect(categoryForLeague("Premier League 2 U21", "England")).toBe("Juveniles");
    expect(categoryForLeague("Campionato Primavera", "Italy")).toBe("Juveniles");
  });

  it("si una liga es femenina y juvenil, gana Femenino", () => {
    expect(categoryForLeague("Women's U20 Championship", "World")).toBe("Femenino");
  });

  it("no distingue mayúsculas y minúsculas", () => {
    expect(categoryForLeague("PREMIER LEAGUE U21", "England")).toBe("Juveniles");
  });

  it("un país que no está en el mapa cae en Otros en vez de romper", () => {
    expect(categoryForLeague("Superliga", "Kazakhstan")).toBe("Otros");
    expect(categoryForLeague("Superliga", undefined)).toBe("Otros");
  });
});
