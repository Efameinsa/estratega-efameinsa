"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Loader2, Play, Plus, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadFile } from "@/components/pm/upload";
import { CLOSING_MODES, catalogEntry, type ClosingMode, type PresentationConfig, type SlideConfig, type SlideImage } from "@/lib/presentation";
import { ScaledStage, headlineFor, visibleSlides } from "@/components/presentation/slides";
import { PresentationViewer } from "@/components/presentation/viewer";

const slideLabel = (s: SlideConfig) => (s.kind === "libre" ? s.title?.trim() || "Lámina libre" : catalogEntry(s.kind, s.id)?.label ?? s.kind);

export default function PresentacionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Preparando la presentación…</div>}>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const list = trpc.presentation.list.useQuery({ cycleId });
  const data = trpc.presentation.data.useQuery({ cycleId });
  const create = trpc.presentation.create.useMutation();
  const update = trpc.presentation.update.useMutation();
  const remove = trpc.presentation.remove.useMutation();

  const [currentId, setCurrentId] = useState<string | null>(search.get("p"));
  const [config, setConfig] = useState<PresentationConfig | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string>("portada");
  const [presenting, setPresenting] = useState(search.get("presentar") === "1");
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const [uploading, setUploading] = useState(false);
  const creating = useRef(false);
  const dirty = useRef(false);

  // Si el ciclo no tiene presentaciones, se crea una con todas las láminas sugeridas.
  useEffect(() => {
    if (!list.data) return;
    if (list.data.length === 0 && !creating.current) {
      creating.current = true;
      create.mutateAsync({ cycleId, name: "Presentación para gerencia" }).then(({ id }) => {
        setCurrentId(id);
        void utils.presentation.list.invalidate({ cycleId });
      });
      return;
    }
    if (!currentId || !list.data.some((p) => p.id === currentId)) setCurrentId(list.data[0]?.id ?? null);
  }, [list.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = trpc.presentation.get.useQuery({ cycleId, id: currentId ?? "" }, { enabled: !!currentId });
  useEffect(() => {
    if (current.data) {
      setConfig(current.data.config);
      setName(current.data.name);
      dirty.current = false;
    }
  }, [current.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardado automático
  useEffect(() => {
    if (!config || !currentId || !dirty.current) return;
    setSaving("pending");
    const t = setTimeout(() => {
      update.mutate(
        { cycleId, id: currentId, config: JSON.stringify(config), name: name.trim() || "Presentación" },
        { onSuccess: () => { setSaving("saved"); void utils.presentation.list.invalidate({ cycleId }); }, onError: (e) => { setSaving("idle"); toast.error(e.message); } },
      );
    }, 700);
    return () => clearTimeout(t);
  }, [config, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (fn: (c: PresentationConfig) => PresentationConfig) => {
    dirty.current = true;
    setConfig((c) => (c ? fn(structuredClone(c)) : c));
  };
  const editSlide = (id: string, patch: Partial<SlideConfig>) => edit((c) => ({ ...c, slides: c.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const move = (id: string, dir: -1 | 1) =>
    edit((c) => {
      const idx = c.slides.findIndex((s) => s.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= c.slides.length) return c;
      const arr = [...c.slides];
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...c, slides: arr };
    });
  const addFree = () => {
    const id = `libre-${Date.now().toString(36)}`;
    edit((c) => {
      const closeAt = c.slides.findIndex((s) => s.kind === "cierre");
      const arr = [...c.slides];
      arr.splice(closeAt < 0 ? arr.length : closeAt, 0, { id, kind: "libre", include: true, title: "Nueva lámina", text: "" });
      return { ...c, slides: arr };
    });
    setSelected(id);
  };

  const upload = async (files: FileList | null, onDone: (imgs: SlideImage[]) => void) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const out: SlideImage[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) { toast.error(`${f.name} no es una imagen`); continue; }
        const r = await uploadFile(f);
        out.push({ url: r.url, name: r.name });
      }
      if (out.length) onDone(out);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const vis = useMemo(() => (config ? visibleSlides(config) : { slides: [], agenda: [], sections: [] }), [config]);
  // Vista previa: si la lámina elegida está apagada, se muestra igual en su lugar
  const previewVis = useMemo(() => {
    if (!config) return vis;
    const s = config.slides.find((x) => x.id === selected);
    return s && !s.include ? visibleSlides({ ...config, slides: config.slides.map((x) => (x.id === s.id ? { ...x, include: true } : x)) }) : vis;
  }, [config, selected, vis]);
  const sel = config?.slides.find((s) => s.id === selected) ?? config?.slides[0];
  const selIndex = sel ? vis.slides.findIndex((s) => s.id === sel.id) : -1;
  const auto = sel && config && data.data ? headlineFor(data.data, config, sel) : null;

  if (!config || !data.data) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Preparando la presentación…</div>;
  }
  if (presenting) {
    return (
      <PresentationViewer
        data={data.data}
        config={config}
        startAt={Math.max(0, selIndex)}
        onFormat={(f) => edit((c) => ({ ...c, format: f }))}
        onExit={() => { setPresenting(false); if (search.get("presentar")) router.replace(`/cycles/${cycleId}/presentacion`); }}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={currentId ?? ""}
          onChange={(e) => { setCurrentId(e.target.value); setSelected("portada"); }}
          aria-label="Presentación"
        >
          {list.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Input className="h-8 w-64" value={name} onChange={(e) => { dirty.current = true; setName(e.target.value); }} aria-label="Nombre de la presentación" />
        <Button size="sm" variant="outline" onClick={async () => {
          if (!currentId) return;
          const { id } = await create.mutateAsync({ cycleId, name: `${name} (copia)`, copyFrom: currentId });
          await utils.presentation.list.invalidate({ cycleId });
          setCurrentId(id);
          toast.success("Copia creada: ajústala sin tocar la original");
        }}><Copy /> Duplicar</Button>
        <Button size="sm" variant="outline" disabled={(list.data?.length ?? 0) < 2} onClick={async () => {
          if (!currentId || !confirm(`¿Eliminar «${name}»? Las demás presentaciones no cambian.`)) return;
          await remove.mutateAsync({ cycleId, id: currentId });
          await utils.presentation.list.invalidate({ cycleId });
          setCurrentId(null);
        }}><Trash2 /> Eliminar</Button>
        <span className="ml-2 text-xs text-muted-foreground">
          {saving === "pending" ? "Guardando…" : saving === "saved" ? "Guardado" : ""} · {vis.slides.length} láminas
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={config.showSlideNumbers} onCheckedChange={(v) => edit((c) => ({ ...c, showSlideNumbers: !!v }))} /> Numerar
          </label>
          <div className="flex rounded-md border p-0.5 text-xs" role="group" aria-label="Formato de vista">
            {([["fhd", "Full HD 1920×1080"], ["hd", "HD 1280×720"]] as const).map(([f, label]) => (
              <button key={f} type="button" onClick={() => edit((c) => ({ ...c, format: f }))} className={`rounded px-2 py-1 ${config.format === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} title={f === "fhd" ? "Navegador lateral completo, con nombres" : "Navegador compacto de íconos: más espacio para el contenido"}>
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setPresenting(true)}><Play /> Presentar</Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Lista de láminas */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r p-2">
          <p className="px-2 pb-2 text-xs text-muted-foreground">Marca las láminas que salen y ordénalas con las flechas.</p>
          {config.slides.map((s, k) => {
            const n = vis.slides.findIndex((v) => v.id === s.id);
            return (
              <div key={s.id} className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${sel?.id === s.id ? "bg-muted" : "hover:bg-muted/60"}`}>
                <Checkbox checked={s.include} onCheckedChange={(v) => editSlide(s.id, { include: !!v })} aria-label={`Incluir ${slideLabel(s)}`} />
                <button className={`min-w-0 flex-1 truncate text-left ${s.include ? "" : "text-muted-foreground line-through"}`} onClick={() => setSelected(s.id)}>
                  <span className="mr-1 inline-block w-5 text-xs tabular-nums text-muted-foreground">{n >= 0 ? n + 1 : ""}</span>
                  {slideLabel(s)}
                  {s.images?.length ? <ImagePlus className="ml-1 inline size-3 text-muted-foreground" /> : null}
                </button>
                <div className="flex opacity-0 group-hover:opacity-100">
                  <button className="rounded p-0.5 hover:bg-background disabled:opacity-30" disabled={k === 0} onClick={() => move(s.id, -1)} aria-label="Subir"><ArrowUp className="size-3.5" /></button>
                  <button className="rounded p-0.5 hover:bg-background disabled:opacity-30" disabled={k === config.slides.length - 1} onClick={() => move(s.id, 1)} aria-label="Bajar"><ArrowDown className="size-3.5" /></button>
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={addFree}><Plus /> Lámina libre</Button>
        </aside>

        {/* Vista previa */}
        <main className="flex min-w-0 flex-1 flex-col items-center overflow-y-auto bg-muted/40 p-6">
          {sel ? <Preview render={(w) => <ScaledStage width={w} data={data.data!} config={config} slides={previewVis.slides} sections={previewVis.sections} agenda={previewVis.agenda} index={Math.max(0, previewVis.slides.findIndex((s) => s.id === sel.id))} onGo={(k) => setSelected(previewVis.slides[k]?.id ?? selected)} />} /> : null}
          {sel && !sel.include ? <p className="mt-3 text-sm text-muted-foreground">Esta lámina no sale en la presentación: márcala en la lista para incluirla.</p> : null}
          <p className="mt-3 text-xs text-muted-foreground">En la presentación: flechas o control para avanzar · F pantalla completa · G vista general · Esc salir.</p>
        </main>

        {/* Propiedades */}
        {sel ? (
          <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l p-4 text-sm">
            <div>
              <p className="font-semibold">{slideLabel(sel)}</p>
              <p className="text-xs text-muted-foreground">{sel.kind === "libre" ? "Texto e imágenes propios." : catalogEntry(sel.kind, sel.id)?.hint}</p>
            </div>

            {sel.kind === "portada" ? (
              <>
                <Field label="Título" hint={data.data.cycle.name}><Input value={config.cover.title ?? ""} placeholder={data.data.cycle.name} onChange={(e) => edit((c) => ({ ...c, cover: { ...c.cover, title: e.target.value } }))} /></Field>
                <Field label="Subtítulo"><Textarea rows={2} value={config.cover.subtitle ?? ""} placeholder={`Diagnóstico, estrategias y hoja de ruta ${data.data.cycle.yearStart + 1}–${data.data.cycle.yearEnd}`} onChange={(e) => edit((c) => ({ ...c, cover: { ...c.cover, subtitle: e.target.value } }))} /></Field>
                <Field label="Presenta"><Input value={config.cover.presenter ?? ""} placeholder={data.data.presenter ?? ""} onChange={(e) => edit((c) => ({ ...c, cover: { ...c.cover, presenter: e.target.value } }))} /></Field>
                <Field label="Fecha o lugar"><Input value={config.cover.dateLabel ?? ""} placeholder="Hoy" onChange={(e) => edit((c) => ({ ...c, cover: { ...c.cover, dateLabel: e.target.value } }))} /></Field>
                <OneImage label="Logo" url={config.cover.logoUrl} uploading={uploading} onPick={(f) => upload(f, (im) => edit((c) => ({ ...c, cover: { ...c.cover, logoUrl: im[0].url } })))} onClear={() => edit((c) => ({ ...c, cover: { ...c.cover, logoUrl: undefined } }))} />
                <OneImage label="Foto de fondo" url={config.cover.backgroundUrl} uploading={uploading} onPick={(f) => upload(f, (im) => edit((c) => ({ ...c, cover: { ...c.cover, backgroundUrl: im[0].url } })))} onClear={() => edit((c) => ({ ...c, cover: { ...c.cover, backgroundUrl: undefined } }))} />
              </>
            ) : sel.kind === "cierre" ? (
              <>
                <Field label="Cómo terminar">
                  <div className="space-y-1">
                    {CLOSING_MODES.map((m) => (
                      <label key={m.mode} className={`flex cursor-pointer gap-2 rounded-md border p-2 ${config.closing.mode === m.mode ? "border-primary bg-primary/5" : ""}`}>
                        <input type="radio" name="cierre" className="mt-0.5" checked={config.closing.mode === m.mode} onChange={() => edit((c) => ({ ...c, closing: { ...c.closing, mode: m.mode as ClosingMode } }))} />
                        <span><span className="font-medium">{m.label}</span><span className="block text-xs text-muted-foreground">{m.hint}</span></span>
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Título" hint="Vacío = automático"><Input value={config.closing.title ?? ""} onChange={(e) => edit((c) => ({ ...c, closing: { ...c.closing, title: e.target.value } }))} /></Field>
                {config.closing.mode === "decisiones" ? (
                  <Field label="Decisiones (una por línea)" hint="Vacío = se proponen desde la priorización">
                    <Textarea rows={6} value={(config.closing.decisions ?? []).join("\n")} onChange={(e) => edit((c) => ({ ...c, closing: { ...c.closing, decisions: e.target.value.split("\n") } }))} />
                  </Field>
                ) : null}
                {config.closing.mode === "personalizado" ? (
                  <Field label="Mensaje (una idea por línea)"><Textarea rows={6} value={config.closing.text ?? ""} onChange={(e) => edit((c) => ({ ...c, closing: { ...c.closing, text: e.target.value } }))} /></Field>
                ) : null}
              </>
            ) : (
              <>
                <Field label="Título (la conclusión)" hint={sel.kind === "libre" ? undefined : "Vacío = automático"}>
                  <Textarea rows={2} value={sel.title ?? ""} placeholder={auto?.title} onChange={(e) => editSlide(sel.id, { title: e.target.value })} />
                </Field>
                <Field label="Bajada" hint="Una línea bajo el título">
                  <Input value={sel.note ?? ""} placeholder={auto?.sub ?? ""} onChange={(e) => editSlide(sel.id, { note: e.target.value })} />
                </Field>
                {sel.kind !== "seccion" ? (
                  <Field label="Fuente" hint="Pie de la lámina">
                    <Input value={sel.source ?? ""} placeholder={auto?.source ?? ""} onChange={(e) => editSlide(sel.id, { source: e.target.value })} />
                  </Field>
                ) : null}
                {sel.kind === "libre" ? (
                  <Field label="Contenido" hint="Una línea = una viñeta">
                    <Textarea rows={7} value={sel.text ?? ""} onChange={(e) => editSlide(sel.id, { text: e.target.value })} />
                  </Field>
                ) : null}
                {sel.kind === "seccion" || sel.kind.startsWith("anexo") ? null : (
                <Field label="Imágenes" hint={sel.kind === "libre" ? "Hasta 4, en galería" : "Hasta 3, en una columna a la derecha"}>
                  <div className="space-y-2">
                    {(sel.images ?? []).map((im, k) => (
                      <div key={k} className="flex gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={im.url} alt="" className="size-14 rounded object-cover" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <Input className="h-7 text-xs" placeholder="Pie de foto" value={im.caption ?? ""} onChange={(e) => editSlide(sel.id, { images: (sel.images ?? []).map((x, j) => (j === k ? { ...x, caption: e.target.value } : x)) })} />
                          <button className="text-xs text-destructive hover:underline" onClick={() => editSlide(sel.id, { images: (sel.images ?? []).filter((_, j) => j !== k) })}>Quitar</button>
                        </div>
                      </div>
                    ))}
                    <UploadButton uploading={uploading} multiple onPick={(f) => upload(f, (im) => editSlide(sel.id, { images: [...(sel.images ?? []), ...im].slice(0, sel.kind === "libre" ? 4 : 3) }))} />
                  </div>
                </Field>
                )}
                {sel.kind === "libre" ? (
                  <Button size="sm" variant="outline" className="w-full text-destructive" onClick={() => { edit((c) => ({ ...c, slides: c.slides.filter((s) => s.id !== sel.id) })); setSelected("portada"); }}><Trash2 /> Borrar lámina libre</Button>
                ) : null}
              </>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

// La vista previa ocupa el ancho disponible y mantiene 16:9
function Preview({ render }: { render: (width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.min(1280, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full max-w-[1100px]">
      <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10">{render(w)}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2"><span className="text-xs font-medium">{label}</span>{hint ? <span className="truncate text-[11px] text-muted-foreground">{hint}</span> : null}</div>
      {children}
    </div>
  );
}

function UploadButton({ uploading, multiple, onPick }: { uploading: boolean; multiple?: boolean; onPick: (f: FileList | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
      <Button size="sm" variant="outline" className="w-full" disabled={uploading} onClick={() => ref.current?.click()}>
        {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {uploading ? "Subiendo…" : "Subir imagen"}
      </Button>
    </>
  );
}

function OneImage({ label, url, uploading, onPick, onClear }: { label: string; url?: string; uploading: boolean; onPick: (f: FileList | null) => void; onClear: () => void }) {
  return (
    <Field label={label}>
      {url ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-12 max-w-40 rounded border object-contain" />
          <button className="rounded p-1 text-muted-foreground hover:text-destructive" onClick={onClear} aria-label={`Quitar ${label}`}><X className="size-4" /></button>
        </div>
      ) : null}
      <UploadButton uploading={uploading} onPick={onPick} />
    </Field>
  );
}
