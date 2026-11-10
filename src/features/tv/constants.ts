export const SHOW_STATUSES = [
  "watching",
  "completed",
  "paused",
  "dropped",
] as const;

export const SHOW_STATUS_LABELS = Object.freeze({
  watching: "Watching",
  completed: "Finished",
  paused: "Paused",
  dropped: "Dropped",
} as const);

export const SHOW_STATUS_ICONS = Object.freeze({
  watching: "solar:play-circle-bold",
  completed: "solar:check-circle-bold",
  paused: "solar:pause-circle-bold",
  dropped: "solar:close-circle-bold",
} as const);

/** The order the status surface lists them in, as a viewer lives them. */
export const SHOW_STATUS_ORDER = [
  "watching",
  "paused",
  "completed",
  "dropped",
] as const;

export const SHOW_STATUS_DETAILS = Object.freeze({
  watching: "Tick episodes as you go; new ones join your queue",
  paused: "Keep your place and step away for a while",
  completed: "Every aired episode marked watched",
  dropped: "Stop following it; what you watched stays",
} as const);

/** The idle icon of the status action, before a show is tracked. */
export const SHOW_TRACK_ICON = "solar:play-circle-linear";

/** Fired after a status, an episode or a season changes for a show. */
export const SHOW_EVENTS = Object.freeze({ CHANGE: "tv:change" });

/** Specials live in season 0: they never count toward progress. */
export const SPECIALS_SEASON = 0;

/** Most episodes one tick request may touch (a whole long season). */
export const EPISODES_PER_REQUEST_MAX = 500;

export const CONTINUE_WATCHING_LIMIT = 12;

/** Seasons whose still the shelf reads; longer runs reuse the backdrop. */
export const SEASON_STILL_LIMIT = 30;

export const TRACKING_ERRORS: Record<string, string> = {
  CATALOG_MISSING: "Could not load this show, try again",
  INVALID_EPISODES: "Those episodes could not be marked",
  INVALID_STATUS: "Pick a status from the list",
};

export const SHOW_FALLBACK_ICON = "solar:tv-bold";

export const SHOW_CERTIFICATION_REGION = "US";

export const SHOW_RECOMMENDATION_LIMIT = 18;

export const MAX_VISIBLE_CREATORS = 3;

export const MAX_VISIBLE_NETWORKS = 3;

export const SHOW_STATUS_TEXT: Record<string, string> = {
  "Returning Series": "Returning",
  "In Production": "In production",
  Planned: "Planned",
  Pilot: "Pilot",
  Ended: "Ended",
  Canceled: "Canceled",
};

export const SHOW_CREW_JOBS = [
  "Creator",
  "Showrunner",
  "Executive Producer",
  "Director",
  "Writer",
  "Original Music Composer",
  "Director of Photography",
  "Editor",
] as const;

export const EPISODE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
