import { FondoAcceso } from "@/components/auth/fondo-acceso";

// Las pantallas de acceso llevan el fondo del login del CRM (carbón + luces
// granate). La clase `dark` activa aquí el tema oscuro de marca de globals.css
// para que los campos y botones de shadcn se lean sobre el fondo carbón.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden px-4 py-10 text-foreground">
      <FondoAcceso />
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
