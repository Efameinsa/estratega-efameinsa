export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-halo-top" aria-hidden />
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
