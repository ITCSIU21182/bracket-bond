// Canonical team_id -> {name, flag} table, shared by the create-market script and
// the frontend's live-read page so on-chain outcomes display with real names.
// The on-chain Outcome only stores team_id (u32); this is the lookup.

export const TEAMS: Record<number, { name: string; flag: string }> = {
  10: { name: "Brazil", flag: "🇧🇷" },
  11: { name: "Argentina", flag: "🇦🇷" },
  12: { name: "France", flag: "🇫🇷" },
  13: { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  14: { name: "Portugal", flag: "🇵🇹" },
  15: { name: "Netherlands", flag: "🇳🇱" },
};

/** Outcomes for the "Race to the Final" live market: index -> teamId + initial
 *  mark (implied probability, scaled by 1e6). */
export const RACE_TO_FINAL = [
  { index: 0, teamId: 10, mark: 700_000 },
  { index: 1, teamId: 11, mark: 560_000 },
  { index: 2, teamId: 12, mark: 610_000 },
  { index: 3, teamId: 13, mark: 520_000 },
  { index: 4, teamId: 14, mark: 280_000 },
  { index: 5, teamId: 15, mark: 270_000 },
];
