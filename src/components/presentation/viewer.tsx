"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Grid3X3, Maximize, Minimize, X } from "lucide-react";
import type { PresentationConfig, ViewFormat } from "@/lib/presentation";
import { ScaledStage, Stage, SLIDE_H, SLIDE_W, visibleSlides, type PresentationData } from "./slides";

// Visor a pantalla completa. Teclado: → ↓ espacio AvPág = siguiente · ← ↑ RePág = anterior ·
// Inicio/Fin · F pantalla completa · G vista general · H cambia el formato (Full HD / HD) ·
// Esc salir. Los controles de presentaciones (clickers) envían AvPág/RePág.
// El navegador lateral de cada lámina también se puede usar con el mouse.
export function PresentationViewer({
  data, config, startAt = 0, onExit, onFormat,
}: { data: PresentationData; config: PresentationConfig; startAt?: number; onExit: () => void; onFormat?: (f: ViewFormat) => void }) {
  const { slides, agenda, sections } = visibleSlides(config);
  const [i, setI] = useState(Math.min(startAt, Math.max(0, slides.length - 1)));
  const [scale, setScale] = useState(1);
  const [overview, setOverview] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const format = config.format ?? "fhd";

  const go = useCallback((n: number) => setI(Math.max(0, Math.min(slides.length - 1, n))), [slides.length]);
  const next = useCallback(() => setI((c) => Math.min(slides.length - 1, c + 1)), [slides.length]);
  const prev = useCallback(() => setI((c) => Math.max(0, c - 1)), []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / SLIDE_W, window.innerHeight / SLIDE_H));
    fit();
    window.addEventListener("resize", fit);
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); if (!overview) next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); if (!overview) prev(); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(slides.length - 1);
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "g" || e.key === "G") setOverview((o) => !o);
      else if ((e.key === "h" || e.key === "H") && onFormat) onFormat(format === "fhd" ? "hd" : "fhd");
      else if (e.key === "Escape") {
        if (overview) setOverview(false);
        else if (!document.fullscreenElement) onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, slides.length, toggleFull, overview, onExit, onFormat, format]);

  // Los controles se esconden solos cuando el mouse no se mueve
  const wake = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
  };
  useEffect(() => {
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, []);

  if (!slides.length) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-neutral-950 text-white">
        <div className="text-center">
          <p className="text-lg">No hay láminas incluidas en esta presentación.</p>
          <button className="mt-4 underline" onClick={onExit}>Volver al editor</button>
        </div>
      </div>
    );
  }

  const stageProps = { data, config, slides, sections, agenda };
  return (
    <div ref={root} className="fixed inset-0 z-[100] overflow-hidden bg-neutral-950 select-none" onMouseMove={wake} style={{ cursor: idle ? "none" : "default" }}>
      {overview ? (
        <div className="h-full overflow-y-auto p-8">
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {slides.map((s, k) => (
              <button key={s.id} onClick={() => { setI(k); setOverview(false); }} className={`overflow-hidden rounded-lg text-left ring-offset-2 ring-offset-neutral-950 ${k === i ? "ring-4 ring-white" : "ring-1 ring-white/20 hover:ring-white/60"}`}>
                <ScaledStage width={300} {...stageProps} index={k} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div style={{ width: SLIDE_W * scale, height: SLIDE_H * scale, position: "relative" }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SLIDE_W, height: SLIDE_H, position: "absolute" }}>
              <Stage {...stageProps} index={i} onGo={go} />
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10"><div className="h-full bg-white/70 transition-all" style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>
      <div className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-white shadow-lg transition-opacity ${idle && !overview ? "opacity-0" : "opacity-100"}`}>
        <button className="rounded-full p-2 hover:bg-white/15" onClick={prev} aria-label="Anterior"><ChevronLeft className="size-5" /></button>
        <span className="min-w-16 text-center text-sm tabular-nums">{i + 1} / {slides.length}</span>
        <button className="rounded-full p-2 hover:bg-white/15" onClick={next} aria-label="Siguiente"><ChevronRight className="size-5" /></button>
        {onFormat ? (
          <>
            <span className="mx-1 h-5 w-px bg-white/20" />
            <div className="flex rounded-full bg-white/10 p-0.5 text-xs" role="group" aria-label="Formato de vista (H)">
              {(["fhd", "hd"] as const).map((f) => (
                <button key={f} onClick={() => onFormat(f)} className={`rounded-full px-2.5 py-1 ${format === f ? "bg-white text-black" : "hover:bg-white/15"}`} title={f === "fhd" ? "Full HD 1920×1080: navegador completo" : "HD 1280×720: navegador compacto"}>
                  {f === "fhd" ? "Full HD" : "HD 720p"}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <span className="mx-1 h-5 w-px bg-white/20" />
        <button className="rounded-full p-2 hover:bg-white/15" onClick={() => setOverview((o) => !o)} aria-label="Vista general (G)" title="Vista general (G)"><Grid3X3 className="size-4" /></button>
        <button className="rounded-full p-2 hover:bg-white/15" onClick={toggleFull} aria-label="Pantalla completa (F)" title="Pantalla completa (F)">{isFull ? <Minimize className="size-4" /> : <Maximize className="size-4" />}</button>
        <button className="rounded-full p-2 hover:bg-white/15" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); onExit(); }} aria-label="Salir (Esc)" title="Salir (Esc)"><X className="size-4" /></button>
      </div>
    </div>
  );
}
