import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-gradient text-6xl font-bold">404</p>
      <h1 className="text-lg font-semibold">No encontramos esta página</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Puede que el enlace haya cambiado o que no tengas acceso.</p>
      <Link href="/dashboard" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Volver al inicio
      </Link>
    </main>
  );
}
