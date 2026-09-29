export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-muted/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
