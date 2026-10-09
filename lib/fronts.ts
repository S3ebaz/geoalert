import bundled from "./active-fronts.json";
import type { ColdFront, FrontBulletin } from "./types";

const SNAPSHOT = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fronts.json`;

export type FrontReport = {
  bulletin: FrontBulletin;
  fronts: ColdFront[];
};

type Raw = {
  aviso?: string;
  issuedAt?: string;
  active?: boolean;
  summary?: string;
  url?: string;
  fronts?: ColdFront[];
};

function reportFrom(raw: Raw): FrontReport {
  return {
    bulletin: {
      source: "SMN",
      aviso: raw.aviso ?? "",
      issuedAt: raw.issuedAt ?? "",
      active: Boolean(raw.active),
      summary: raw.summary ?? "Sin texto del aviso SMN.",
      url: raw.url ?? "https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/WebAvisoFfrios"
    },
    fronts: raw.fronts ?? []
  };
}

export const bundledFronts: FrontReport = reportFrom(bundled as Raw);

export async function fetchFrontReport(): Promise<FrontReport> {
  try {
    const res = await fetch(SNAPSHOT, { cache: "no-store" });
    if (!res.ok) return bundledFronts;
    return reportFrom((await res.json()) as Raw);
  } catch {
    return bundledFronts;
  }
}
