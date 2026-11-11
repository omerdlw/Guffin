import type { GoldenCase, RawTitle } from "./types";

const film = (
  id: number,
  title: string,
  extra: Partial<RawTitle> = {},
): RawTitle => ({
  id,
  title,
  overview: "A story.",
  posterPath: "/p.jpg",
  releaseDate: "2000-01-01",
  voteAverage: 7.5,
  voteCount: 5_000,
  popularity: 40,
  genreIds: [18],
  ...extra,
});

const show = (
  id: number,
  title: string,
  extra: Partial<RawTitle> = {},
): RawTitle => ({
  id,
  title,
  overview: "A story.",
  posterPath: "/p.jpg",
  releaseDate: "2010-01-01",
  voteAverage: 8,
  voteCount: 2_000,
  popularity: 60,
  genreIds: [18],
  episodesCount: 40,
  ...extra,
});

export const GOLDEN_MOVIES: GoldenCase[] = [
  { expected: true, raw: film(550, "Fight Club", { genreIds: [18, 53] }) },
  { expected: true, raw: film(238, "The Godfather", { genreIds: [18, 80] }) },
  {
    expected: true,
    raw: film(129, "Spirited Away", { genreIds: [16, 14, 10751] }),
  },
  { expected: true, raw: film(496243, "Parasite", { genreIds: [35, 53, 18] }) },
  {
    expected: true,
    raw: film(843, "In the Mood for Love", { genreIds: [18, 10749] }),
  },
  {
    expected: true,
    raw: film(11104, "Chungking Express", {
      genreIds: [18, 35, 10749],
      voteCount: 1_900,
    }),
  },
  {
    expected: true,
    raw: film(18491, "Neon Genesis Evangelion: The End of Evangelion", {
      genreIds: [16, 878, 18],
    }),
  },
  {
    expected: true,
    raw: film(1100, "Stop Making Sense", {
      genreIds: [99, 10402],
      voteCount: 300,
    }),
  },
  {
    expected: true,
    raw: film(1001, "Documentary With Votes", {
      genreIds: [99],
      voteCount: 900,
    }),
  },
  { expected: true, raw: film(1002, "Modest Indie", { voteCount: 45 }) },
  {
    expected: false,
    raw: film(1003, "The 94th Annual Academy Awards", { genreIds: [10770] }),
  },
  {
    expected: false,
    raw: film(1004, "Golden Globe Awards 2020", { genreIds: [] }),
  },
  {
    expected: false,
    raw: film(1005, "The Making of Jaws", { genreIds: [99], video: true }),
  },
  {
    expected: false,
    raw: film(1006, "Fight Club: Behind the Scenes", { genreIds: [99] }),
  },
  { expected: false, raw: film(1007, "Blooper Reel", { genreIds: [] }) },
  {
    expected: false,
    raw: film(1008, "Nightly News Special", { genreIds: [10763] }),
  },
  { expected: false, raw: film(1009, "No Poster", { posterPath: null }) },
  {
    expected: false,
    raw: film(1010, "Not Out Yet", { releaseDate: "2999-01-01" }),
  },
  { expected: false, raw: film(1011, "Three Votes", { voteCount: 3 }) },
  { expected: false, raw: film(1012, "Adult Title", { adult: true }) },
  { expected: false, raw: film(1013, "Undated", { releaseDate: null }) },
  { expected: false, raw: film(1014, "Comic-Con Panel", { genreIds: [] }) },
  {
    expected: false,
    raw: film(1015, "Press Junket Interviews", { genreIds: [] }),
  },
  {
    expected: false,
    raw: film(1016, "Screen Tests", { genreIds: [99], video: true }),
  },
  {
    expected: false,
    raw: film(1017, "Direct Video Extra", { genreIds: [], video: true }),
  },
];

export const GOLDEN_SHOWS: GoldenCase[] = [
  {
    expected: true,
    raw: show(1396, "Breaking Bad", {
      genreIds: [18, 80],
      episodesCount: 62,
      voteCount: 15_000,
    }),
  },
  {
    expected: true,
    raw: show(1399, "Game of Thrones", {
      genreIds: [10765, 18, 10759],
      episodesCount: 73,
    }),
  },
  {
    expected: true,
    raw: show(66732, "Stranger Things", { genreIds: [18, 10765, 9648] }),
  },
  {
    expected: true,
    raw: show(1668, "Friends", { genreIds: [35], episodesCount: 236 }),
  },
  {
    expected: true,
    raw: show(94605, "Arcane", {
      genreIds: [16, 10765, 10759],
      episodesCount: 18,
    }),
  },
  {
    expected: true,
    raw: show(87108, "Chernobyl", { genreIds: [18], episodesCount: 5 }),
  },
  {
    expected: true,
    raw: show(100088, "The Last of Us", { genreIds: [18], episodesCount: 16 }),
  },
  { expected: true, raw: show(1100, "Small Foreign Drama", { voteCount: 25 }) },
  {
    expected: true,
    raw: show(1101, "Cult Anthology", {
      genreIds: [9648, 10765],
      episodesCount: 3,
    }),
  },
  { expected: true, raw: show(1102, "War Drama", { genreIds: [10768, 18] }) },
  {
    expected: false,
    raw: show(1103, "Planet Wildlife", { genreIds: [99], voteCount: 3_000 }),
  },
  {
    expected: false,
    raw: show(1104, "Crime Docuseries", { genreIds: [99, 80] }),
  },
  { expected: false, raw: show(1105, "Island Dating", { genreIds: [10764] }) },
  {
    expected: false,
    raw: show(1106, "Late Night Talk", { genreIds: [10767, 35] }),
  },
  { expected: false, raw: show(1107, "Evening News", { genreIds: [10763] }) },
  {
    expected: false,
    raw: show(1108, "Daytime Soap", {
      genreIds: [10766, 18],
      episodesCount: 9_000,
    }),
  },
  {
    expected: false,
    raw: show(1109, "The 75th Primetime Emmy Awards", { genreIds: [] }),
  },
  {
    expected: false,
    raw: show(1110, "Saturday Night Live", { genreIds: [35] }),
  },
  { expected: false, raw: show(1111, "One-Off Special", { episodesCount: 1 }) },
  {
    expected: false,
    raw: show(1112, "Empty Entry", { episodesCount: 0, overview: null }),
  },
  { expected: false, raw: show(1113, "No Overview Show", { overview: null }) },
  { expected: false, raw: show(1114, "No Poster Show", { posterPath: null }) },
  { expected: false, raw: show(1115, "Never Aired", { releaseDate: null }) },
  { expected: false, raw: show(1116, "Five Votes", { voteCount: 5 }) },
  { expected: false, raw: show(1117, "Live From the Arena", { genreIds: [] }) },
];
