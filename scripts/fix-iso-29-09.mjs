// Corrección 29-09 (Santos): la ISO 9001/14001 es de los equipos que vendemos, no de la empresa.
// Reemplaza los textos en la base (sin volver a sembrar, para no borrar ediciones hechas en la app),
// aplica los mismos cambios al guion scripts/seed-efameinsa.ts y recalcula la MPC.
// Uso: DATABASE_URL=<url> node scripts/fix-iso-29-09.mjs
import fs from "node:fs";
import pg from "pg";

const PAIRS = [
  ["Diseñamos, fabricamos e instalamos con planta propia en Huachipa desde el año 2000 y certificación ISO 9001 e ISO 14001.", "Diseñamos, fabricamos e instalamos con planta propia en Huachipa desde el año 2000; los equipos que representamos cuentan con certificación ISO 9001 e ISO 14001."],
  ["Mantenemos la ISO 14001: recomendamos el equipo que consume menos agua y energía para el volumen real del cliente.", "Recomendamos el equipo que consume menos agua y energía para el volumen real del cliente."],
  ["Minería y licitaciones exigen proveedores con sistemas de gestión: somos los únicos del sector que muestran ISO 9001 e ISO 14001.", "Minería y licitaciones exigen documentación técnica y equipos certificados: las marcas que representamos tienen ISO 9001 e ISO 14001, pero ningún competidor lo comunica."],
  ["Minería y licitaciones exigen ISO y documentación técnica; ningún competidor comunica certificaciones", "Minería y licitaciones exigen equipos certificados y documentación técnica; ningún competidor lo comunica"],
  ["Credenciales verificables (ISO, planta, años, servicio técnico)", "Credenciales verificables (planta, años, servicio técnico, marcas certificadas)"],
  ["Stock permanente, planta con ISO 9001 y 14001 y servicio técnico propio son las fortalezas más difíciles de copiar.", "Stock permanente, planta propia y servicio técnico propio son las fortalezas más difíciles de copiar."],
  ["Planta propia en Huachipa con ISO 9001 e ISO 14001: el único del sector con credenciales verificables", "Planta propia en Huachipa desde el año 2000: diseñamos, fabricamos e instalamos (marca Efamein)"],
  ["expediente técnico con ISO y casos (INEN, EsSalud)", "expediente técnico con las certificaciones de los equipos y casos (INEN, EsSalud)"],
  ["anuncios de diferenciales reales: stock en Lima, planta, ISO y 3D", "anuncios de diferenciales reales: stock en Lima, planta, servicio técnico propio y 3D"],
  ["Se apoya en fortalezas que la competencia no tiene (ISO, planta, stock, 3D, CRM).", "Se apoya en fortalezas que la competencia no tiene (planta, stock, servicio técnico propio, 3D, CRM)."],
  ["web, dominio, reseñas, planta con ISO y stock.", "web, dominio, reseñas, planta propia y stock."],
  ["Anuncios nuevos con planta, stock en Lima, ISO, 3D y visitas", "Anuncios nuevos con planta, stock en Lima, servicio técnico propio, 3D y visitas"],
  ["diferenciales comprobables: planta, ISO, stock, servicio técnico propio y 3D.", "diferenciales comprobables: planta, stock, servicio técnico propio, marcas certificadas y 3D."],
  ["Comunicar la ISO 14001 y el consumo de agua y energía de cada equipo", "Comunicar el consumo de agua y energía y las certificaciones de cada equipo"],
];

// Tablas y columnas de texto donde pueden aparecer
const COLUMNS = [
  ["Value", "description"], ["EthicsCode", "description"], ["PestecFactor", "hallazgo"],
  ["MefeFactor", "description"], ["MefeFactor", "originalDescription"], ["MefiFactor", "description"], ["MefiFactor", "originalDescription"],
  ["MpcFactorDef", "name"], ["AmofhitArea", "notes"], ["AreaSynthesis", "text"], ["Strategy", "description"], ["StrategyOrigin", "factorText"],
  ["OlpReference", "refText"], ["ConsolidatedStrategy", "text"], ["ConsolidatedStrategyOrigin", "sourceText"], ["RumeltCriterion", "justification"],
  ["PeiDocument", "customExecutiveSummary"], ["OcpAction", "description"], ["Politica", "enunciado"], ["ResourceNeed", "description"], ["Issue", "summary"],
];

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
let total = 0;
for (const [t, col] of COLUMNS) {
  for (const [a, b] of PAIRS) {
    const r = await c.query(`update "${t}" set "${col}" = replace("${col}", $1, $2) where "${col}" like '%' || $1 || '%'`, [a, b]);
    total += r.rowCount;
  }
}
// La PESTEC de certificaciones ya no es «respondemos de forma superior»
await c.query(`update "PestecFactor" set rating = 3 where description = 'Certificaciones ambientales' and "cycleId" = 'cycle-efameinsa-2026'`);

// MPC: «credenciales verificables» de Efameinsa pasa de 4 a 3 y se recalculan los totales
const cycle = "cycle-efameinsa-2026";
await c.query(
  `update "MpcScore" s set rating = 3, score = round((d.weight * 3)::numeric, 4)
     from "MpcFactorDef" d, "MpcCompetitor" m
    where s."factorDefId" = d.id and s."competitorId" = m.id and d."cycleId" = $1 and m."isOwnOrg" and d.name like 'Credenciales verificables%'`,
  [cycle],
);
await c.query(
  `update "MpcCompetitor" m set "totalScore" = round(x.t::numeric, 2)
     from (select s."competitorId" id, sum(s.score) t from "MpcScore" s join "MpcCompetitor" mc on mc.id = s."competitorId" where mc."cycleId" = $1 group by 1) x
    where m.id = x.id`,
  [cycle],
);
const mpc = (await c.query(`select name, "totalScore" from "MpcCompetitor" where "cycleId" = $1 order by "totalScore" desc`, [cycle])).rows;
const own = mpc.find((r) => r.name === "Efameinsa");
const fmt = (n) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
await c.query(`update "PeiDocument" set "customExecutiveSummary" = replace("customExecutiveSummary", '(MPC 3,12 frente', $1) where "cycleId" = $2`, [`(MPC ${fmt(own.totalScore)} frente`, cycle]);
console.log("textos reemplazados:", total, "· MPC:", mpc.map((r) => `${r.name} ${fmt(r.totalScore)}`).join(" · "));
await c.end();

// El guion de carga queda igual que la base
const seedPath = new URL("./seed-efameinsa.ts", import.meta.url);
let seed = fs.readFileSync(seedPath, "utf8");
for (const [a, b] of PAIRS) seed = seed.split(a).join(b);
seed = seed.replace('["ecologico", "Certificaciones ambientales", "O", 6, 4,', '["ecologico", "Certificaciones ambientales", "O", 6, 3,');
seed = seed.replace('["Efameinsa", true, [3, 4, 4, 3, 2, 3, 1, 4, 2, 4, 4]],', '["Efameinsa", true, [3, 4, 4, 3, 2, 3, 1, 4, 2, 3, 4]],');
fs.writeFileSync(seedPath, seed);
console.log("guion actualizado; ISO restantes:", (seed.match(/ISO/g) ?? []).length);
