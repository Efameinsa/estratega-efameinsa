// ───────────────────────────────────────────────────────────────────────
// Comparador de similitud entre estrategias.
// Implementacion actual: Jaccard de tokens normalizados con stop words es-ES.
// Diseñado como funcion pura para que se pueda reemplazar por un servicio
// (embeddings, IA) sin tocar consumidores.
// ───────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "el", "la", "los", "las", "de", "del", "en", "y", "o", "a", "al", "que",
  "para", "con", "un", "una", "unos", "unas", "se", "es", "son", "lo",
  "su", "sus", "por", "como", "mas", "muy", "este", "esta", "estos",
  "estas", "ese", "esa", "esos", "esas", "donde", "cuando", "tu", "tus",
  "le", "les", "te", "me", "no", "si", "sin", "ser", "ha", "han", "hay",
  "fue", "era", "eran", "etc", "ya", "esta", "estan", "estoy",
  // Verbos genericos comunes en estrategias que no aportan a similitud
  "implementar", "lograr", "alcanzar", "establecer", "asegurar",
]);

const ACCENTS_MAP: Record<string, string> = {
  "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n",
};

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .split("")
    .map((c) => ACCENTS_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

/**
 * Compara dos textos de estrategia y retorna un score de similitud entre 0 y 1.
 * 1 = identicas, 0 = totalmente distintas.
 *
 * Implementacion: Jaccard de tokens. Suficiente para detectar duplicados
 * de las matrices ya que comparten vocabulario tecnico (penetracion, mercado,
 * desarrollo, integracion, etc.).
 */
export function compareStrategies(a: string, b: string): number {
  if (!a || !b) return 0;
  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Umbral por defecto a partir del cual se consideran duplicadas. */
export const DEFAULT_DUPLICATE_THRESHOLD = 0.45;

/** Resultado de un cluster de fusion. */
export interface ClusterProposal {
  members: number[]; // indices del array de entrada que pertenecen al cluster
  representative: number; // indice del miembro con texto mas largo (mejor representante)
  similarities: number[]; // matriz triangular plana de similitudes
}

/**
 * Agrupa estrategias por similitud usando clustering simple greedy.
 * Para cada estrategia que no esta en un cluster:
 *   - Compara con todas las demas
 *   - Las que superen el umbral pasan al cluster
 * Retorna los clusters con su representante (texto mas descriptivo).
 *
 * Este metodo es O(n^2) en numero de estrategias. Para sets de 20-50
 * estrategias (caso tipico de M3) es muy rapido (<10ms).
 */
export function clusterStrategies(
  texts: string[],
  threshold = DEFAULT_DUPLICATE_THRESHOLD,
): ClusterProposal[] {
  const n = texts.length;
  const visited = new Array(n).fill(false);
  const clusters: ClusterProposal[] = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const members = [i];
    const sims: number[] = [];
    for (let j = i + 1; j < n; j++) {
      if (visited[j]) continue;
      const sim = compareStrategies(texts[i], texts[j]);
      if (sim >= threshold) {
        visited[j] = true;
        members.push(j);
        sims.push(sim);
      }
    }
    // Representante: el texto mas largo (suele ser el mas descriptivo)
    let bestIdx = members[0];
    let bestLen = texts[bestIdx].length;
    for (const m of members) {
      if (texts[m].length > bestLen) { bestLen = texts[m].length; bestIdx = m; }
    }
    clusters.push({ members, representative: bestIdx, similarities: sims });
  }
  return clusters;
}
