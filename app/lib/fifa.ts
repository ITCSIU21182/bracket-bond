// Real World Cup 2026 data from the public FIFA API (season 285023).
// DISPLAY ONLY — enriches team names/flags + shows real knockout results. It is
// NOT settlement data (settlement stays TxLINE) and FIFA has no odds (marks stay
// derived). Fetched server-side (route handler) to avoid CORS; fails soft → mock.

const BASE = "https://api.fifa.com/api/v3";
const SEASON = "285023";

// FIFA uses non-ISO codes for the home nations; map their flags explicitly.
const FLAG_OVERRIDE: Record<string, string> = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  NIR: "🇬🇧",
};

export interface FifaTeam {
  id: string;
  name: string;
  flag: string;
}
export interface FifaResult {
  fixtureId: string;
  team: string;
  flag: string;
  fixture: string;
  round: string;
  wentToPenalties: boolean;
  pens: string | null;
}
export interface FifaData {
  teams: FifaTeam[]; // quarter-finalists, real names/flags — for the market
  results: FifaResult[]; // real knockout eliminations (incl. shootouts)
  winner: FifaTeam | null;
}

const a2ToEmoji = (a2: string) =>
  [...a2.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");

const nameOf = (t: any) =>
  ((t?.TeamName && (t.TeamName.find((n: any) => n.Locale === "en-GB") || t.TeamName[0])) || {}).Description ||
  t?.ShortClubName ||
  String(t?.IdTeam ?? "");

export async function fetchFifa(): Promise<FifaData | null> {
  try {
    const [br, co] = await Promise.all([
      fetch(`${BASE}/seasonbracket/season/${SEASON}?language=en-GB`, { next: { revalidate: 300 } }).then((r) => r.json()),
      fetch(`${BASE}/countries?language=en-GB&count=300`, { next: { revalidate: 86400 } }).then((r) => r.json()),
    ]);

    const countries = co?.Results || co || [];
    const a3: Record<string, string> = {};
    for (const c of countries) {
      const a = c?.Iso3166Alpha2;
      if (c?.IdCountry && a && a.length === 2) a3[c.IdCountry] = a2ToEmoji(a);
    }
    const flagOf = (t: any) => FLAG_OVERRIDE[t?.IdCountry] || a3[t?.IdCountry] || "⚽";

    const stages = (br?.KnockoutStages || []).slice().sort((a: any, b: any) => a.SequenceOrder - b.SequenceOrder);
    const teams: Record<string, FifaTeam & { status: string }> = {};
    const results: FifaResult[] = [];
    const qfTeamIds: string[] = [];
    const winnerId = br?.Winner?.IdTeam;

    for (const st of stages) {
      const round = st?.Name?.[0]?.Description || "";
      const isBronze = /bronze/i.test(round);
      for (const m of st?.Matches || []) {
        const H = m.HomeTeam;
        const A = m.AwayTeam;
        if (!H || !A) continue;
        for (const t of [H, A]) {
          if (!teams[t.IdTeam]) teams[t.IdTeam] = { id: String(t.IdTeam), name: nameOf(t), flag: flagOf(t), status: "alive" };
        }
        if (/quarter/i.test(round)) {
          for (const t of [H, A]) if (!qfTeamIds.includes(t.IdTeam)) qfTeamIds.push(t.IdTeam);
        }
        if (m.MatchStatus === 0 && m.Winner && !isBronze) {
          const L = m.Winner === H.IdTeam ? A : H;
          if (teams[L.IdTeam]) teams[L.IdTeam].status = "eliminated";
          results.push({
            fixtureId: String(m.IdMatch),
            team: nameOf(L),
            flag: flagOf(L),
            fixture: `${nameOf(H)} ${m.HomeTeamScore}-${m.AwayTeamScore} ${nameOf(A)}`,
            round,
            wentToPenalties: m.ResultType === 2,
            pens: m.ResultType === 2 ? `${m.HomeTeamPenaltyScore}-${m.AwayTeamPenaltyScore}` : null,
          });
        }
      }
    }

    const winner =
      winnerId && teams[winnerId]
        ? { id: String(winnerId), name: teams[winnerId].name, flag: teams[winnerId].flag }
        : null;
    const featured = qfTeamIds.map((id) => teams[id]).filter(Boolean).map((t) => ({ id: t.id, name: t.name, flag: t.flag }));
    if (!featured.length) return null;
    return { teams: featured, results, winner };
  } catch {
    return null;
  }
}
