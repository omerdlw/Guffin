import { step } from "@/motion/utils";
import type { CanonEntry, DirectorEntry, Filter, LaureateEntry } from "./types";

export const MAX_FILMS = 64;

export const GENRE_LABELS: Readonly<Record<number, string>> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

export const BEST_PICTURE: readonly LaureateEntry[] = [
  ["Wings", 1927],
  ["The Broadway Melody", 1929],
  ["All Quiet on the Western Front", 1930],
  ["Cimarron", 1931],
  ["Grand Hotel", 1932],
  ["Cavalcade", 1933],
  ["It Happened One Night", 1934],
  ["Mutiny on the Bounty", 1935],
  ["The Great Ziegfeld", 1936],
  ["The Life of Emile Zola", 1937],
  ["You Can't Take It with You", 1938],
  ["Gone with the Wind", 1939],
  ["Rebecca", 1940],
  ["How Green Was My Valley", 1941],
  ["Mrs. Miniver", 1942],
  ["Casablanca", 1942],
  ["Going My Way", 1944],
  ["The Lost Weekend", 1945],
  ["The Best Years of Our Lives", 1946],
  ["Gentleman's Agreement", 1947],
  ["Hamlet", 1948],
  ["All the King's Men", 1949],
  ["All About Eve", 1950],
  ["An American in Paris", 1951],
  ["The Greatest Show on Earth", 1952],
  ["From Here to Eternity", 1953],
  ["On the Waterfront", 1954],
  ["Marty", 1955],
  ["Around the World in 80 Days", 1956],
  ["The Bridge on the River Kwai", 1957],
  ["Gigi", 1958],
  ["Ben-Hur", 1959],
  ["The Apartment", 1960],
  ["West Side Story", 1961],
  ["Lawrence of Arabia", 1962],
  ["Tom Jones", 1963],
  ["My Fair Lady", 1964],
  ["The Sound of Music", 1965],
  ["A Man for All Seasons", 1966],
  ["In the Heat of the Night", 1967],
  ["Oliver!", 1968],
  ["Midnight Cowboy", 1969],
  ["Patton", 1970],
  ["The French Connection", 1971],
  ["The Godfather", 1972],
  ["The Sting", 1973],
  ["The Godfather Part II", 1974],
  ["One Flew Over the Cuckoo's Nest", 1975],
  ["Rocky", 1976],
  ["Annie Hall", 1977],
  ["The Deer Hunter", 1978],
  ["Kramer vs. Kramer", 1979],
  ["Ordinary People", 1980],
  ["Chariots of Fire", 1981],
  ["Gandhi", 1982],
  ["Terms of Endearment", 1983],
  ["Amadeus", 1984],
  ["Out of Africa", 1985],
  ["Platoon", 1986],
  ["The Last Emperor", 1987],
  ["Rain Man", 1988],
  ["Driving Miss Daisy", 1989],
  ["Dances with Wolves", 1990],
  ["The Silence of the Lambs", 1991],
  ["Unforgiven", 1992],
  ["Schindler's List", 1993],
  ["Forrest Gump", 1994],
  ["Braveheart", 1995],
  ["The English Patient", 1996],
  ["Titanic", 1997],
  ["Shakespeare in Love", 1998],
  ["American Beauty", 1999],
  ["Gladiator", 2000],
  ["A Beautiful Mind", 2001],
  ["Chicago", 2002],
  ["The Lord of the Rings: The Return of the King", 2003],
  ["Million Dollar Baby", 2004],
  ["Crash", 2004],
  ["The Departed", 2006],
  ["No Country for Old Men", 2007],
  ["Slumdog Millionaire", 2008],
  ["The Hurt Locker", 2008],
  ["The King's Speech", 2010],
  ["The Artist", 2011],
  ["Argo", 2012],
  ["12 Years a Slave", 2013],
  ["Birdman", 2014],
  ["Spotlight", 2015],
  ["Moonlight", 2016],
  ["The Shape of Water", 2017],
  ["Green Book", 2018],
  ["Parasite", 2019],
  ["Nomadland", 2020],
  ["CODA", 2021],
  ["Everything Everywhere All at Once", 2022],
  ["Oppenheimer", 2023],
  ["Anora", 2024],
];

export const FIRST_CEREMONY_YEAR = 1929;

export const DIRECTORS: readonly DirectorEntry[] = [
  {
    born: 1946,
    died: null,
    name: "Steven Spielberg",
    person: 488,
  },
  {
    born: 1942,
    died: null,
    name: "Martin Scorsese",
    person: 1032,
  },
  {
    born: 1970,
    died: null,
    name: "Christopher Nolan",
    person: 525,
  },
  {
    born: 1939,
    died: null,
    name: "Francis Ford Coppola",
    person: 1776,
  },
  {
    born: 1899,
    died: 1980,
    name: "Alfred Hitchcock",
    person: 2636,
  },
  {
    born: 1928,
    died: 1999,
    name: "Stanley Kubrick",
    person: 240,
  },
  {
    born: 1910,
    died: 1998,
    name: "Akira Kurosawa",
    person: 5026,
  },
  {
    born: 1963,
    died: null,
    name: "Quentin Tarantino",
    person: 138,
  },
  {
    born: 1906,
    died: 2002,
    name: "Billy Wilder",
    person: 3146,
  },
  {
    born: 1908,
    died: 1991,
    name: "David Lean",
    person: 12238,
  },
  {
    born: 1894,
    died: 1973,
    name: "John Ford",
    person: 8500,
  },
  {
    born: 1920,
    died: 1993,
    name: "Federico Fellini",
    person: 4415,
  },
  {
    born: 1918,
    died: 2007,
    name: "Ingmar Bergman",
    person: 6648,
  },
  {
    born: 1915,
    died: 1985,
    name: "Orson Welles",
    person: 40,
  },
  {
    born: 1929,
    died: 1989,
    name: "Sergio Leone",
    person: 4385,
  },
  {
    born: 1954,
    died: null,
    name: "James Cameron",
    person: 2710,
  },
  {
    born: 1962,
    died: null,
    name: "David Fincher",
    person: 7467,
  },
  {
    born: 1941,
    died: null,
    name: "Hayao Miyazaki",
    person: 608,
  },
  {
    born: 1935,
    died: null,
    name: "Woody Allen",
    person: 1243,
  },
  {
    born: 1902,
    died: 1981,
    name: "William Wyler",
    person: 10001,
  },
];

export const CANON: readonly CanonEntry[] = [
  ["tt0111161", "The Shawshank Redemption", 1994],
  ["tt0068646", "The Godfather", 1972],
  ["tt0468569", "The Dark Knight", 2008],
  ["tt0071562", "The Godfather Part II", 1974],
  ["tt0050083", "12 Angry Men", 1957],
  ["tt0167260", "The Lord of the Rings: The Return of the King", 2003],
  ["tt0108052", "Schindler's List", 1993],
  ["tt0110912", "Pulp Fiction", 1994],
  ["tt0120737", "The Lord of the Rings: The Fellowship of the Ring", 2001],
  ["tt0060196", "The Good, the Bad and the Ugly", 1966],
  ["tt0109830", "Forrest Gump", 1994],
  ["tt0167261", "The Lord of the Rings: The Two Towers", 2002],
  ["tt0137523", "Fight Club", 1999],
  ["tt1375666", "Inception", 2010],
  ["tt0080684", "The Empire Strikes Back", 1980],
  ["tt0133093", "The Matrix", 1999],
  ["tt0099685", "Goodfellas", 1990],
  ["tt0816692", "Interstellar", 2014],
  ["tt0073486", "One Flew Over the Cuckoo's Nest", 1975],
  ["tt0114369", "Se7en", 1995],
  ["tt0038650", "It's a Wonderful Life", 1946],
  ["tt0102926", "The Silence of the Lambs", 1991],
  ["tt0047478", "Seven Samurai", 1954],
  ["tt0120815", "Saving Private Ryan", 1998],
  ["tt0317248", "City of God", 2002],
  ["tt0118799", "Life Is Beautiful", 1997],
  ["tt0120689", "The Green Mile", 1999],
  ["tt0103064", "Terminator 2: Judgment Day", 1991],
  ["tt0076759", "Star Wars", 1977],
  ["tt0088763", "Back to the Future", 1985],
  ["tt0245429", "Spirited Away", 2001],
  ["tt0253474", "The Pianist", 2002],
  ["tt6751668", "Parasite", 2019],
  ["tt0054215", "Psycho", 1960],
  ["tt0172495", "Gladiator", 2000],
  ["tt0110357", "The Lion King", 1994],
  ["tt0110413", "Léon: The Professional", 1994],
  ["tt0407887", "The Departed", 2006],
  ["tt0120586", "American History X", 1998],
  ["tt2582802", "Whiplash", 2014],
  ["tt0482571", "The Prestige", 2006],
  ["tt0095327", "Grave of the Fireflies", 1988],
  ["tt0056058", "Harakiri", 1962],
  ["tt0114814", "The Usual Suspects", 1995],
  ["tt0034583", "Casablanca", 1942],
  ["tt1675434", "The Intouchables", 2011],
  ["tt0095765", "Cinema Paradiso", 1988],
  ["tt0027977", "Modern Times", 1936],
  ["tt0064116", "Once Upon a Time in the West", 1968],
  ["tt0047396", "Rear Window", 1954],
  ["tt0078748", "Alien", 1979],
  ["tt0021749", "City Lights", 1931],
  ["tt0078788", "Apocalypse Now", 1979],
  ["tt0209144", "Memento", 2000],
  ["tt1853728", "Django Unchained", 2012],
  ["tt0082971", "Raiders of the Lost Ark", 1981],
  ["tt0910970", "WALL·E", 2008],
  ["tt0405094", "The Lives of Others", 2006],
  ["tt0043014", "Sunset Boulevard", 1950],
  ["tt0050825", "Paths of Glory", 1957],
  ["tt4154756", "Avengers: Infinity War", 2018],
  ["tt0081505", "The Shining", 1980],
  ["tt0032553", "The Great Dictator", 1940],
  ["tt4633694", "Spider-Man: Into the Spider-Verse", 2018],
  ["tt0051201", "Witness for the Prosecution", 1957],
  ["tt0090605", "Aliens", 1986],
  ["tt0169547", "American Beauty", 1999],
  ["tt0364569", "Oldboy", 2003],
  ["tt1345836", "The Dark Knight Rises", 2012],
  ["tt0057012", "Dr. Strangelove", 1964],
  ["tt9362722", "Spider-Man: Across the Spider-Verse", 2023],
  ["tt7286456", "Joker", 2019],
  ["tt0086879", "Amadeus", 1984],
  ["tt0112573", "Braveheart", 1995],
  ["tt0114709", "Toy Story", 1995],
  ["tt2380307", "Coco", 2017],
  ["tt0361748", "Inglourious Basterds", 2009],
  ["tt0082096", "Das Boot", 1981],
  ["tt4154796", "Avengers: Endgame", 2019],
  ["tt0119698", "Princess Mononoke", 1997],
  ["tt0087843", "Once Upon a Time in America", 1984],
  ["tt0119217", "Good Will Hunting", 1997],
  ["tt5311514", "Your Name.", 2016],
  ["tt0057565", "High and Low", 1963],
  ["tt1187043", "3 Idiots", 2009],
  ["tt0045152", "Singin' in the Rain", 1952],
  ["tt0180093", "Requiem for a Dream", 2000],
  ["tt15398776", "Oppenheimer", 2023],
  ["tt0435761", "Toy Story 3", 2010],
  ["tt8267604", "Capernaum", 2018],
  ["tt0086190", "Return of the Jedi", 1983],
  ["tt0338013", "Eternal Sunshine of the Spotless Mind", 2004],
  ["tt0062622", "2001: A Space Odyssey", 1968],
  ["tt0105236", "Reservoir Dogs", 1992],
  ["tt0091251", "Come and See", 1985],
  ["tt2106476", "The Hunt", 2012],
  ["tt0056172", "Lawrence of Arabia", 1962],
  ["tt0033467", "Citizen Kane", 1941],
  ["tt0022100", "M", 1931],
  ["tt0053125", "North by Northwest", 1959],
];

export const DIRECTORS_GAP = 8;

export const DIRECTORS_MAX_TILE = 92;

export const DIRECTORS_AIR = 96;

export const DIRECTORS_PRINT_WINDOW_S = step(3);

export const DIRECTORS_PRINT_STEP_S = step(-2);

export const DIRECTORS_PRINT_S = step(2);

export const DIRECTORS_DRAIN_S = step(3);

export const DIRECTORS_LEAVE_S = step(0);

export const DIRECTORS_ENTER_S = step(2);

export const DIRECTORS_LOAD_PATIENCE_S = step(3);

export const DIRECTORS_SWAP_PATIENCE_S = step(0);

export const DIRECTORS_SWARM_PATIENCE_S = step(5);

export const DIRECTORS_NAMES_PATIENCE_S = step(5);

export const DIRECTOR_POSTER_WIDTHS = ["w92", "w185"] as const;

export const FOUNDRY_UNIFORMS = [
  "uRes",
  "uPlate",
  "uTilt",
  "uLight",
  "uTime",
  "uMelt",
  "uCool",
  "uHeat",
  "uPoster",
  "uEngrave",
  "uLamp",
  "uReveal",
  "uFill",
  "uCut",
] as const;

export const FOUNDRY_POSTER = { height: 900, width: 600 };

export const FOUNDRY_LAMP_S = 1.6;

export const FOUNDRY_LAMP_AT = 0.7;

export const FOUNDRY_REVEAL_S = 1.6;

export const FOUNDRY_FILL_S = 2.4;

export const FOUNDRY_MELT_S = 0.75;

export const FOUNDRY_CAST_S = 1.5;

export const FOUNDRY_HEAT_S = 2.6;

export const FOUNDRY_SET_S = 2.4;

export const FOUNDRY_CUT_S = 1.3;

export const FOUNDRY_TILT = 0.07;

export const FOUNDRY_LOOK = {
  amount: 0.28,
  grain: 0.03,
  threshold: 1.4,
  vignette: 0.5,
};

export const FOUNDRY_REST_LIGHT: [number, number, number] = [-1.1, 1.9, 0.8];

export const FOUNDRY_REACH = 2.2;

export const FOUNDRY_RAIL = 0.13;

export const FOUNDRY_ENGRAVE_WIDTH = 2048;

export const PORTRAIT_UNIFORMS = [
  "uRes",
  "uFace",
  "uPosters",
  "uPhase",
  "uTime",
  "uFaceGrid",
  "uPosterGrid",
  "uScale",
  "uDust",
  "uFade",
] as const;

export const PORTRAIT_PHOTO_UNIFORMS = [
  "uRes",
  "uFace",
  "uPhoto",
  "uMatte",
  "uDevelop",
] as const;

export const PORTRAIT_GATHER_S = 4.6;

export const PORTRAIT_SCATTER_S = 2.1;

export const PORTRAIT_CRUMBLE_S = 1.1;

export const PORTRAIT_CONDENSE_S = 2.6;

export const PORTRAIT_FORMED = 0.62;

export const PORTRAIT_DEVELOP_S = 2.4;

export const PORTRAIT_UNDEVELOP_S = 0.7;

export const PORTRAIT_PHOTO = { height: 1350, width: 900 };

export const PORTRAIT_LOOK = {
  amount: 0.12,
  grain: 0.03,
  threshold: 1,
  vignette: 0.5,
};

export const MAX_PRINTS = 100;

export const WALL_COLUMNS = 10;

export const WALL_GAP = 0.2;

export const WALL_RATIO = 2 / 3;

export const WALL_UNIFORMS = [
  "uRes",
  "uPitch",
  "uPan",
  "uFocus",
  "uLens",
  "uRadius",
  "uBulge",
  "uLamp",
  "uPrints",
  "uState",
  "uRank",
  "uCount",
  "uMarks",
  "uSelected",
  "uOpen",
  "uNumbers",
  "uTime",
  "uLoupe",
  "uLoupeIndex",
  "uLoupeMix",
  "uDigits",
] as const;

export const WALL_UNIT = { digits: 2, loupe: 1, prints: 0 } as const;

export const WALL_IN_FLIGHT = 6;

export const WALL_MIP_EVERY_MS = 300;

export const WALL_ARRIVE_S = 0.6;

export const WALL_LOUPE_WAIT_MS = 110;

export const WALL_LOUPE_FADE_S = 0.26;

export const WALL_LOUPE = { height: 1050, width: 700 };

export const WALL_OPEN_READY = 40;

export const WALL_OPEN_PATIENCE_MS = 3500;

export const WALL_LAMP_S = 1.1;

export const WALL_WAVE_AT = 0.55;

export const WALL_WAVE_S = 2.8;

export const WALL_NUMBERS_S = 1.2;

export const WALL_BULGE = 0.16;

export const WALL_LENS = { near: 0.42, rest: 0.26 };

export const WALL_RADIUS = 0.3;

export const WALL_INERTIA = 3.2;

export const WALL_GLIDE_S = 0.9;

export const WALL_WHEEL_S = 0.12;

export const WALL_CLICK_SLOP = 6;

export const BLOOM_LEVELS = 6;

export const BLOOM_DOWN_UNIFORMS = ["uSource", "uTexel", "uThreshold"] as const;

export const BLOOM_UP_UNIFORMS = ["uSource", "uTexel"] as const;

export const BLOOM_COMPOSITE_UNIFORMS = [
  "uScene",
  "uBloom",
  "uRes",
  "uTime",
  "uGrain",
  "uExposure",
  "uBloomAmount",
  "uVignette",
] as const;

export const DIAL_STEP = 14;

export const DIAL_DRAG_SLOP = 4;

export const CATALOG_FRESH_MS = 24 * 60 * 60_000;

export const CATALOG_KEEP_SECONDS = 7 * 24 * 60 * 60;

export const SPOTLIGHT_LOGLINE_LENGTH = 200;

export const SPOTLIGHT_LOGLINE_ENOUGH = 90;

export const SPOTLIGHT_GENRE_LIMIT = 3;

export const DIRECTOR_KNOWN_VOTES = 50;

export const GESTURE_THRESHOLD = 28;

export const GESTURE_END_MS = 220;

export const SWARM_LUMA = [0.2126, 0.7152, 0.0722] as const;

export const SWARM_LATTICE = Math.sqrt(3) / 2;

export const BACKDROP_REACH = 0.12;

export const BACKDROP_SPAN = 0.4;

export const BACKDROP_STEP = 0.045;

export const TOP_100_FILTERS: readonly { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Seen", value: "seen" },
  { label: "To watch", value: "unseen" },
];

export const TOP_100_KEYS: Record<string, number> = {
  ArrowDown: WALL_COLUMNS,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -WALL_COLUMNS,
};

export const WHEEL_DELTA_UNITS: Readonly<Record<number, number>> = {
  1: 32,
  2: 400,
};

export const URL_SYNC_DELAY_MS = 500;
