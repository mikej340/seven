/**
 * The active colour season. The brand colours (plum, paper, cream centre)
 * stay fixed; this switches the seasonal layer defined in app/globals.css.
 * "default" uses the green palette; other values match a
 * :root[data-season="…"] block in globals.css.
 */
export type Season = "default" | "autumn";

export const CURRENT_SEASON: Season = "autumn";
