export default function OfflinePage() {
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <div className="text-5xl">📡</div>
      <h1 className="mt-4 text-2xl font-extrabold">Você está offline</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Reconecte para ver seus bolões e enviar palpites. Eles ficam guardados no servidor.
      </p>
    </div>
  );
}
