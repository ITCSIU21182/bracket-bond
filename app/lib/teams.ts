// team_id -> {name, flag} lookup, mirroring scripts/lib/teams.ts. The on-chain
// Outcome stores only team_id (u32); this maps it to a display name/flag.

export const TEAMS: Record<number, { name: string; flag: string }> = {
  10: { name: "Brazil", flag: "🇧🇷" },
  11: { name: "Argentina", flag: "🇦🇷" },
  12: { name: "France", flag: "🇫🇷" },
  13: { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  14: { name: "Portugal", flag: "🇵🇹" },
  15: { name: "Netherlands", flag: "🇳🇱" },
};

export function team(teamId: number): { name: string; flag: string } {
  return TEAMS[teamId] ?? { name: `Team #${teamId}`, flag: "⚽" };
}
