import { describe, expect, it } from "vitest";
import { isTvActingCredit, isTvCrewCredit } from "@/lib/tmdb/rules";
import type { MediaType } from "@/lib/tmdb/shared";
import { GOLDEN_MOVIES, GOLDEN_SHOWS } from "./fixtures";
import {
  bayesianRating,
  isEligible,
  qualityScore,
  toMediaItem,
} from "./quality";

function parseMediaType(value: unknown): MediaType {
  return value === "tv" ? "tv" : "movie";
}

describe("golden set", () => {
  for (const { expected, raw } of GOLDEN_MOVIES) {
    it(`film ${raw.title} is ${expected ? "eligible" : "kept off discovery"}`, () => {
      expect(toMediaItem(raw, "movie").quality.eligible).toBe(expected);
    });
  }
  for (const { expected, raw } of GOLDEN_SHOWS) {
    it(`show ${raw.title} is ${expected ? "eligible" : "kept off discovery"}`, () => {
      expect(toMediaItem(raw, "tv").quality.eligible).toBe(expected);
    });
  }
});

describe("toMediaItem", () => {
  it("settles fallbacks in one place", () => {
    const item = toMediaItem(
      {
        id: 1,
        title: "  ",
        originalTitle: "Original",
        posterPath: "not-a-path",
        releaseDate: "2020-13",
        genres: [{ id: 18 }],
      },
      "tv",
    );
    expect(item.title).toBe("Original");
    expect(item.posterPath).toBeNull();
    expect(item.releaseDate).toBeNull();
    expect(item.genreIds).toEqual([18]);
    expect(item.quality.flags).toEqual(
      expect.arrayContaining(["no_poster", "no_date", "low_votes"]),
    );
  });

  it("only shows carry season and episode counts", () => {
    const raw = { id: 2, title: "X", seasonsCount: 3, episodesCount: 30 };
    expect(toMediaItem(raw, "movie").episodesCount).toBeNull();
    expect(toMediaItem(raw, "tv").episodesCount).toBe(30);
  });
});

describe("scoring", () => {
  it("pulls a title with few votes toward the mean", () => {
    expect(bayesianRating(10, 1, 100, 6)).toBeCloseTo(6.04, 2);
    expect(bayesianRating(8, 100_000, 100, 6)).toBeCloseTo(8, 2);
    expect(bayesianRating(null, 0, 100, 6)).toBe(6);
  });

  it("ranks a well-loved title above an obscure perfect score", () => {
    const loved = qualityScore({
      mediaType: "tv",
      popularity: 300,
      voteAverage: 8.9,
      voteCount: 15_000,
    });
    const obscure = qualityScore({
      mediaType: "tv",
      popularity: 1,
      voteAverage: 10,
      voteCount: 2,
    });
    expect(loved).toBeGreaterThan(obscure);
  });
});

describe("surfaces", () => {
  it("a detail page opens anything", () => {
    expect(isEligible("tv", ["adult", "excluded_genre"], "detail")).toBe(true);
  });
  it("search tolerates thin data but not non-shows", () => {
    expect(isEligible("tv", ["low_votes", "no_poster"], "search")).toBe(true);
    expect(isEligible("tv", ["excluded_genre"], "search")).toBe(false);
  });
  it("discovery needs an overview for a show only", () => {
    expect(isEligible("tv", ["no_overview"])).toBe(false);
    expect(isEligible("movie", ["no_overview"])).toBe(true);
  });
  it("parses the vitrin switch", () => {
    expect(parseMediaType("tv")).toBe("tv");
    expect(parseMediaType("anything")).toBe("movie");
  });
});

describe("TV credits", () => {
  const show = { genreIds: [18], title: "Drama", originalTitle: null };
  it("counts recurring roles, not guest spots", () => {
    expect(
      isTvActingCredit({
        ...show,
        character: "Walter White",
        episodeCount: 62,
      }),
    ).toBe(true);
    expect(
      isTvActingCredit({ ...show, character: "Waiter", episodeCount: 1 }),
    ).toBe(false);
  });
  it("drops talk-show and self appearances", () => {
    expect(
      isTvActingCredit({
        genreIds: [10767],
        title: "Late Talk",
        originalTitle: null,
        character: "Guest",
        episodeCount: 40,
      }),
    ).toBe(false);
    expect(
      isTvActingCredit({ ...show, character: "Himself", episodeCount: 10 }),
    ).toBe(false);
  });
  it("keeps a creator credit however few episodes", () => {
    expect(isTvCrewCredit({ ...show, job: "Creator", episodeCount: 0 })).toBe(
      true,
    );
    expect(isTvCrewCredit({ ...show, job: "Writer", episodeCount: 1 })).toBe(
      false,
    );
  });
});
