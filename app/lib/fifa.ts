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
export interface FifaSide {
  name: string;
  flag: string;
  score: number;
  pen: number | null;
  winner: boolean;
}
export interface FifaMatch {
  id: string;
  date: string; // ISO
  round: string;
  stadium: string | null;
  status: string; // "FT" | "AET" | "PENS"
  home: FifaSide;
  away: FifaSide;
}
export interface FifaData {
  teams: FifaTeam[]; // quarter-finalists, real names/flags — for the market
  matches: FifaMatch[]; // real knockout results (QF onwards)
  winner: FifaTeam | null;
}

const a2ToEmoji = (a2: string) =>
  [...a2.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");

const nameOf = (t: any) =>
  ((t?.TeamName && (t.TeamName.find((n: any) => n.Locale === "en-GB") || t.TeamName[0])) || {}).Description ||
  t?.ShortClubName ||
  String(t?.IdTeam ?? "");

const stadiumOf = (m: any): string | null => {
  const s = m?.Stadium;
  if (!s) return null;
  const name = s.Name?.[0]?.Description || null;
  const city = s.CityName?.[0]?.Description || null;
  return name ? (city ? `${name} (${city})` : name) : null;
};

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
    const matches: FifaMatch[] = [];
    const qfTeamIds: string[] = [];
    const winnerId = br?.Winner?.IdTeam;

    for (const st of stages) {
      const round = st?.Name?.[0]?.Description || "";
      const isBronze = /bronze/i.test(round);
      const isLateStage = /(quarter|semi|final)/i.test(round); // QF onwards (incl. bronze + final)
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
        if (m.MatchStatus === 0 && m.Winner) {
          if (!isBronze) {
            const L = m.Winner === H.IdTeam ? A : H;
            if (teams[L.IdTeam]) teams[L.IdTeam].status = "eliminated";
          }
          if (isLateStage) {
            const homeWon = m.Winner === H.IdTeam;
            const pens = m.ResultType === 2;
            matches.push({
              id: String(m.IdMatch),
              date: m.Date,
              round,
              stadium: stadiumOf(m),
              status: pens ? "PENS" : m.ResultType === 3 ? "AET" : "FT",
              home: { name: nameOf(H), flag: flagOf(H), score: m.HomeTeamScore, pen: pens ? m.HomeTeamPenaltyScore : null, winner: homeWon },
              away: { name: nameOf(A), flag: flagOf(A), score: m.AwayTeamScore, pen: pens ? m.AwayTeamPenaltyScore : null, winner: !homeWon },
            });
          }
        }
      }
    }

    const winner =
      winnerId && teams[winnerId]
        ? { id: String(winnerId), name: teams[winnerId].name, flag: teams[winnerId].flag }
        : null;
    const featured = qfTeamIds.map((id) => teams[id]).filter(Boolean).map((t) => ({ id: t.id, name: t.name, flag: t.flag }));
    if (!featured.length) return null;
    // sort matches by date ascending
    matches.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { teams: featured, matches, winner };
  } catch {
    return null;
  }
}
