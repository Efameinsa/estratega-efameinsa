// EL FONDO DE LAS PANTALLAS DE ACCESO (29-09): el mismo del login del CRM.
// Carbón de marca con dos luces granate que se mueven muy despacio, los
// anillos del isotipo girando a un costado y una retícula tenue, para que la
// tarjeta de vidrio tenga algo detrás que desenfocar.
// Puro CSS —sin JS ni hidratación—; las animaciones viven en globals.css
// (`.fondo-acceso-*`) y con «reducir movimiento» del sistema todo queda quieto.
export function FondoAcceso() {
  return (
    <div className="fondo-acceso pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Luces de marca */}
      <div className="fondo-acceso-luz-a absolute -left-[20%] -top-[25%] size-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(139,21,16,0.55)_0%,rgba(139,21,16,0)_62%)] blur-2xl" />
      <div className="fondo-acceso-luz-b absolute -bottom-[30%] -right-[15%] size-[65vmax] rounded-full bg-[radial-gradient(circle,rgba(94,13,11,0.6)_0%,rgba(94,13,11,0)_60%)] blur-2xl" />
      <div className="absolute left-[35%] top-[40%] size-[40vmax] rounded-full bg-[radial-gradient(circle,rgba(74,68,65,0.45)_0%,rgba(74,68,65,0)_65%)] blur-3xl" />

      {/* Retícula muy tenue, que se apaga hacia los bordes */}
      <div
        className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Los arcos del isotipo, a un costado para no competir con la tarjeta */}
      {[640, 480, 340, 220].map((tam, i) => (
        <div
          key={tam}
          className="fondo-acceso-anillo absolute rounded-full border"
          style={{
            width: tam,
            height: tam,
            right: -tam * 0.32,
            bottom: -tam * 0.32,
            borderColor: i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(196,48,40,0.28)",
            borderTopColor: i % 2 === 0 ? "rgba(255,255,255,0.18)" : "rgba(196,48,40,0.55)",
            animationDirection: i % 2 === 0 ? "normal" : "reverse",
            animationDuration: `${80 + i * 20}s`,
          }}
        />
      ))}

      {/* Viñeta: centra la mirada en la tarjeta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
    </div>
  );
}
