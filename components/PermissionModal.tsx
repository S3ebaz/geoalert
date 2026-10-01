"use client";

type Props = {
  busy: boolean;
  error: string | null;
  onAllow: () => void;
  onManual: () => void;
};

export function PermissionModal({ busy, error, onAllow, onManual }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
          GeoAlerta Global
        </p>
        <h1 className="mt-2 text-xl font-semibold">Usar tu ubicación</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Pedimos coordenadas solo en tu dispositivo para medir distancias a
          sismos y tormentas. No creamos cuenta ni guardamos la posición en
          un servidor propio.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onAllow}
            className="rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Obteniendo coordenadas…" : "Permitir ubicación del navegador"}
          </button>
          <button
            type="button"
            onClick={onManual}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium dark:border-slate-700"
          >
            Elegir ciudad o país manualmente
          </button>
        </div>
      </div>
    </div>
  );
}
