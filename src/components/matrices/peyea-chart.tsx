"use client";

import React, { useMemo, useState } from "react";
import { Maximize2, Minus, Plus, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUADRANT_INFO, type computeVector } from "@/lib/peyea-catalog";

type Vector = ReturnType<typeof computeVector>;

// Ejes de la matriz PEYEA (D'Alessio): cada eje suma dos dimensiones.
const AXES = {
  top: { code: "FF", label: "Fortaleza financiera", color: "#1e7f4f" },
  bottom: { code: "EE", label: "Estabilidad del entorno", color: "#c2410c" },
  right: { code: "FI", label: "Fortaleza de la industria", color: "#185fa5" },
  left: { code: "VC", label: "Ventaja competitiva", color: "#be185d" },
} as const;

const QUAD_HINT: Record<Vector["quadrant"], string> = {
  agresivo: "Empresa sólida en industria atractiva",
  conservador: "Sólida, pero entorno turbulento",
  competitivo: "Industria atractiva, posición débil",
  defensivo: "Posición débil en entorno adverso",
};

const fmt = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}`;

/**
 * Visor del vector PEYEA: ejes con coordenadas, cuadrantes rotulados,
 * proyecciones del punto sobre cada eje, polígono de las 4 dimensiones
 * y zoom (automático al vector o escala completa ±6).
 */
export function PeyeaChart({ vector, compact = false }: { vector: Vector; compact?: boolean }) {
  const autoRange = useMemo(() => {
    const m = Math.max(Math.abs(vector.x), Math.abs(vector.y), 0.6);
    return Math.min(6, Math.max(1.5, Math.ceil(m * 1.7 * 2) / 2));
  }, [vector.x, vector.y]);
  const [range, setRange] = useState<number>(autoRange);
  const [showDims, setShowDims] = useState(!compact && autoRange >= 6);
  const [hover, setHover] = useState<string | null>(null);

  // En la vista lateral el zoom sigue al vector mientras se califican las variables.
  const R = compact ? autoRange : range;
  const SIZE = compact ? 260 : 600;
  const PAD = compact ? 22 : 64;
  const W = SIZE - PAD * 2;
  const sx = (v: number) => PAD + ((v + R) / (2 * R)) * W;
  const sy = (v: number) => PAD + ((R - v) / (2 * R)) * W;
  const clamp = (v: number) => Math.max(-R, Math.min(R, v));
  const step = R <= 2 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = -R; t <= R + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);

  const info = QUADRANT_INFO[vector.quadrant];
  const px = sx(clamp(vector.x));
  const py = sy(clamp(vector.y));
  const ox = sx(0);
  const oy = sy(0);
  const outOfView = Math.abs(vector.x) > R || Math.abs(vector.y) > R;

  // Puntos de cada dimensión sobre su semieje (valores con signo)
  const dims = [
    { key: "FF", x: 0, y: vector.ffSigned, color: AXES.top.color },
    { key: "FI", x: vector.fiSigned, y: 0, color: AXES.right.color },
    { key: "EE", x: 0, y: vector.eeSigned, color: AXES.bottom.color },
    { key: "VC", x: vector.vcSigned, y: 0, color: AXES.left.color },
  ];

  const quads: { q: Vector["quadrant"]; x: number; y: number; anchor: "start" | "end"; vy: "top" | "bottom" }[] = [
    { q: "conservador", x: sx(-R) + 10, y: sy(R) + 18, anchor: "start", vy: "top" },
    { q: "agresivo", x: sx(R) - 10, y: sy(R) + 18, anchor: "end", vy: "top" },
    { q: "defensivo", x: sx(-R) + 10, y: sy(-R) - 22, anchor: "start", vy: "bottom" },
    { q: "competitivo", x: sx(R) - 10, y: sy(-R) - 22, anchor: "end", vy: "bottom" },
  ];

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setRange((r) => Math.max(1, Math.round((r * 0.75) * 2) / 2))}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Acercar"
              title="Acercar"
            >
              <Plus className="size-4" />
            </button>
            <span className="w-16 text-center text-xs tabular-nums text-muted-foreground">±{R}</span>
            <button
              type="button"
              onClick={() => setRange((r) => Math.min(6, Math.round((r / 0.75) * 2) / 2))}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Alejar"
              title="Alejar"
            >
              <Minus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setRange(autoRange);
              setShowDims(false);
            }}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs", R === autoRange && !showDims ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <ScanSearch className="size-3.5" /> Enfocar el vector
          </button>
          <button
            type="button"
            onClick={() => {
              setRange(6);
              setShowDims(true);
            }}
            className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs", R === 6 && showDims ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Maximize2 className="size-3.5" /> Escala completa ±6 con dimensiones
          </button>
        </div>
      )}

      <div className="relative">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full select-none" role="img" aria-label={`Matriz PEYEA: vector en (${fmt(vector.x)}, ${fmt(vector.y)}), perfil ${info.label}`}>
          <defs>
            <marker id={`peyea-arrow-${compact ? "c" : "f"}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={info.color} />
            </marker>
            <clipPath id={`peyea-clip-${compact ? "c" : "f"}`}>
              <rect x={PAD} y={PAD} width={W} height={W} />
            </clipPath>
          </defs>

          {/* Cuadrantes */}
          <rect x={ox} y={PAD} width={sx(R) - ox} height={oy - PAD} fill={QUADRANT_INFO.agresivo.color} opacity={vector.quadrant === "agresivo" ? 0.13 : 0.05} />
          <rect x={PAD} y={PAD} width={ox - PAD} height={oy - PAD} fill={QUADRANT_INFO.conservador.color} opacity={vector.quadrant === "conservador" ? 0.13 : 0.05} />
          <rect x={PAD} y={oy} width={ox - PAD} height={sy(-R) - oy} fill={QUADRANT_INFO.defensivo.color} opacity={vector.quadrant === "defensivo" ? 0.13 : 0.05} />
          <rect x={ox} y={oy} width={sx(R) - ox} height={sy(-R) - oy} fill={QUADRANT_INFO.competitivo.color} opacity={vector.quadrant === "competitivo" ? 0.13 : 0.05} />

          {/* Rejilla + coordenadas */}
          {ticks.map((t) => (
            <g key={`g${t}`}>
              <line x1={sx(t)} y1={PAD} x2={sx(t)} y2={PAD + W} stroke="rgba(139, 21, 16,0.10)" strokeWidth={t === 0 ? 0 : 1} />
              <line x1={PAD} y1={sy(t)} x2={PAD + W} y2={sy(t)} stroke="rgba(139, 21, 16,0.10)" strokeWidth={t === 0 ? 0 : 1} />
              {!compact && t !== 0 && (
                <>
                  <text x={sx(t)} y={oy + 16} textAnchor="middle" fontSize={11} fill="#6b6b6b">
                    {t > 0 ? `+${t}` : t}
                  </text>
                  <text x={ox - 8} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="#6b6b6b">
                    {t > 0 ? `+${t}` : t}
                  </text>
                </>
              )}
            </g>
          ))}
          <rect x={PAD} y={PAD} width={W} height={W} fill="none" stroke="rgba(139, 21, 16,0.22)" rx={compact ? 6 : 10} />

          {/* Ejes principales */}
          <line x1={PAD} y1={oy} x2={PAD + W} y2={oy} stroke="#8a8a8a" strokeWidth={1.5} />
          <line x1={ox} y1={PAD} x2={ox} y2={PAD + W} stroke="#8a8a8a" strokeWidth={1.5} />
          {!compact && <text x={ox + 6} y={oy + 16} fontSize={11} fill="#6b6b6b">0</text>}

          {/* Nombres de los cuadrantes */}
          {quads.map((q) => {
            const qi = QUADRANT_INFO[q.q];
            const active = vector.quadrant === q.q;
            return (
              <g key={q.q} opacity={active ? 1 : 0.7}>
                <text x={q.x} y={q.y} textAnchor={q.anchor} fontSize={compact ? 9 : 14} fontWeight={700} letterSpacing={1} fill={qi.color}>
                  {qi.label.toUpperCase()}
                </text>
                {!compact && (
                  <text x={q.x} y={q.y + 16} textAnchor={q.anchor} fontSize={11} fill="#6b6b6b">
                    {QUAD_HINT[q.q]}
                  </text>
                )}
              </g>
            );
          })}

          <g clipPath={`url(#peyea-clip-${compact ? "c" : "f"})`}>
            {/* Polígono de las 4 dimensiones */}
            {showDims && (
              <>
                <polygon
                  points={dims.map((d) => `${sx(d.x)},${sy(d.y)}`).join(" ")}
                  fill="rgba(139, 21, 16,0.10)"
                  stroke="rgba(139, 21, 16,0.45)"
                  strokeDasharray="4 3"
                />
                {dims.map((d) => (
                  <g key={d.key} onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}>
                    <circle cx={sx(d.x)} cy={sy(d.y)} r={6} fill={d.color} stroke="#ffffff" strokeWidth={2} />
                    <text
                      x={sx(d.x) + (d.x > 0 ? 10 : d.x < 0 ? -10 : 10)}
                      y={sy(d.y) + (d.y !== 0 ? 4 : -10)}
                      textAnchor={d.x < 0 ? "end" : "start"}
                      fontSize={12}
                      fontWeight={600}
                      fill={d.color}
                    >
                      {d.key} {fmt(d.x || d.y)}
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* Proyecciones del punto a los ejes */}
            {!outOfView && (
              <>
                <line x1={px} y1={py} x2={px} y2={oy} stroke={info.color} strokeDasharray="4 4" opacity={0.7} />
                <line x1={px} y1={py} x2={ox} y2={py} stroke={info.color} strokeDasharray="4 4" opacity={0.7} />
              </>
            )}

            {/* Vector resultante */}
            <line x1={ox} y1={oy} x2={px} y2={py} stroke={info.color} strokeWidth={compact ? 2.5 : 3.5} markerEnd={`url(#peyea-arrow-${compact ? "c" : "f"})`} />
            <circle
              cx={px}
              cy={py}
              r={compact ? 5 : 8}
              fill={info.color}
              stroke="#ffffff"
              strokeWidth={2}
              onMouseEnter={() => setHover("vector")}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          </g>

          {/* Valores proyectados sobre los ejes */}
          {!compact && !outOfView && (
            <>
              <g>
                <rect x={px - 26} y={oy + 22} width={52} height={20} rx={5} fill={info.color} />
                <text x={px} y={oy + 36} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff">
                  X {fmt(vector.x)}
                </text>
              </g>
              <g>
                <rect x={ox - 62} y={py - 10} width={52} height={20} rx={5} fill={info.color} />
                <text x={ox - 36} y={py + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff">
                  Y {fmt(vector.y)}
                </text>
              </g>
            </>
          )}

          {/* Etiqueta del punto */}
          {!compact && (
            <g>
              <rect
                x={Math.min(px + 12, PAD + W - 150)}
                y={Math.max(py - 44, PAD + 4)}
                width={140}
                height={34}
                rx={8}
                fill="#ffffff"
                stroke={info.color}
              />
              <text x={Math.min(px + 12, PAD + W - 150) + 10} y={Math.max(py - 44, PAD + 4) + 14} fontSize={10} fill="#6b6b6b">
                Tu posición
              </text>
              <text x={Math.min(px + 12, PAD + W - 150) + 10} y={Math.max(py - 44, PAD + 4) + 28} fontSize={12} fontWeight={700} fill="#2c2e35">
                ({fmt(vector.x)}, {fmt(vector.y)})
              </text>
            </g>
          )}

          {/* Rótulos de los ejes */}
          {!compact ? (
            <>
              <text x={ox} y={PAD - 26} textAnchor="middle" fontSize={12} fontWeight={600} fill={AXES.top.color}>
                ▲ FF · {AXES.top.label} (+)
              </text>
              <text x={ox} y={PAD + W + 44} textAnchor="middle" fontSize={12} fontWeight={600} fill={AXES.bottom.color}>
                ▼ EE · {AXES.bottom.label} (−)
              </text>
              <text x={PAD + W + 8} y={oy - 10} textAnchor="end" fontSize={12} fontWeight={600} fill={AXES.right.color}>
                FI · Industria (+) ▶
              </text>
              <text x={PAD - 8} y={oy - 10} textAnchor="start" fontSize={12} fontWeight={600} fill={AXES.left.color}>
                ◀ VC · Ventaja comp. (−)
              </text>
            </>
          ) : (
            <>
              <text x={ox} y={PAD - 8} textAnchor="middle" fontSize={9} fill={AXES.top.color}>FF</text>
              <text x={ox} y={PAD + W + 15} textAnchor="middle" fontSize={9} fill={AXES.bottom.color}>EE</text>
              <text x={PAD + W + 3} y={oy + 3} fontSize={9} fill={AXES.right.color}>FI</text>
              <text x={PAD - 3} y={oy + 3} textAnchor="end" fontSize={9} fill={AXES.left.color}>VC</text>
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hover && !compact && (
          <div className="pointer-events-none absolute top-3 left-3 max-w-xs rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
            {hover === "vector" ? (
              <>
                <p className="font-semibold" style={{ color: info.color }}>
                  Postura {info.label.toLowerCase()}
                </p>
                <p>X = FI + VC = {fmt(vector.fiSigned)} {fmt(vector.vcSigned)} = <b>{fmt(vector.x)}</b></p>
                <p>Y = FF + EE = {fmt(vector.ffSigned)} {fmt(vector.eeSigned)} = <b>{fmt(vector.y)}</b></p>
                <p className="text-muted-foreground">Intensidad {vector.magnitude.toFixed(2)} · dirección {vector.angleDeg.toFixed(0)}°</p>
              </>
            ) : (
              <p>
                <b>{hover}</b>: promedio con signo en su semieje.
              </p>
            )}
          </div>
        )}
        {outOfView && !compact && (
          <p className="absolute right-3 bottom-3 rounded-md bg-popover px-2 py-1 text-xs text-amber-700">El vector sale de la vista: aleja el zoom.</p>
        )}
      </div>

      {!compact && (
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <p>
            <b className="text-foreground">Eje horizontal (X):</b> fortaleza de la industria (+) sumada a la ventaja competitiva (−).
          </p>
          <p>
            <b className="text-foreground">Eje vertical (Y):</b> fortaleza financiera (+) sumada a la estabilidad del entorno (−).
          </p>
          <p>
            <b className="text-foreground">La flecha</b> apunta al cuadrante de la postura recomendada; mientras más larga, más clara es la postura.
          </p>
        </div>
      )}
    </div>
  );
}
