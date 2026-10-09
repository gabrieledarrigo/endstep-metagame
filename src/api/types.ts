export type TimeWindow = "1d" | "7d" | "14d" | "30d" | "season";

export type Population = "rated" | "casual";

export type Provenance = {
  schemaVersion: number;
  derivationVersion: number;
  window: {
    preset: TimeWindow;
    from: string;
    to: string;
    since: string | null;
    until: string | null;
  };
  population: Population;
};

export type DeckRef = {
  id: string;
  slug: string;
  name: string;
  machineNamed: boolean;
};

export type Page<Item> = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
};

export type Query = {
  q: string | null;
  sort: string;
  dir: "asc" | "desc";
};

export type WinLoss =
  | {
      wins: number;
      losses: number;
      required: number;
      gate: null;
      rate: number;
      low: number;
      high: number;
      deff: number;
    }
  | {
      wins: number;
      losses: number;
      required: number;
      gate: "too_few";
      rate: null;
      low: null;
      high: null;
      deff: null;
    };

export type MatchWinRate = {
  wins: number;
  losses: number;
  rate: number;
  low: number;
  high: number;
  deff: number;
};

export type ShareChange = {
  points: number | null;
  previousRate: number | null;
  reason: "previous_window_empty" | "no_previous_window" | null;
};

export type Deck = DeckRef & {
  colours: string[];
  art: {
    cardName: string;
    setCode: string | null;
    collectorNumber: string | null;
    pinned: boolean;
  };
  keyCards: string[];
  share: {
    registrations: number;
    totalRegistrations: number;
    rate: number;
  };
  players: number;
  matchWinRate: MatchWinRate;
  shareChange: ShareChange;
};

export type DecksResponse = {
  provenance: Provenance;
  formatId: string;
  totals: {
    registrations: number;
    players: number;
  };
  ratingCohorts: {
    date: string;
    cuts: number[];
  };
  query: Query;
  decks: Page<Deck>;
};

export type SharePoint = {
  day: string;
  registrations: number;
  totalRegistrations: number;
  rate: number | null;
};

export type ShareSeries = {
  deck: DeckRef;
  points: SharePoint[];
};

export type ShareSeriesResponse = {
  provenance: Provenance;
  formatId: string;
  days: {
    from: string;
    to: string;
  };
  markedDay: string | null;
  series: ShareSeries[];
};

export type Proportion = {
  count: number;
  of: number;
  rate: number;
};

export type GameSplit = {
  onPlay: WinLoss;
  onDraw: WinLoss;
  total: WinLoss;
};

export type SampleCard = {
  name: string;
  count: number;
  setCode: string | null;
  collectorNumber: string | null;
};

export type SampleList = {
  state: "shown" | "mainOnly" | "withheld";
  reason:
    | "sideboard_below_player_floor"
    | "main_below_player_floor"
    | "no_registrations"
    | null;
  minPlayers: number;
  players: number | null;
  similarity: number | null;
  distinctLists: number;
  main: SampleCard[];
  side: SampleCard[];
};

export type DeckDetail = {
  provenance: Provenance;
  formatId: string;
  deck: Deck;
  gameResults: {
    rows: (GameSplit & { gameNumber: number })[];
    total: GameSplit;
    unknownPositionGames: number;
  } | null;
  games: {
    game1: WinLoss;
    game2AfterWin: WinLoss;
    game2AfterLoss: WinLoss;
    game3: WinLoss;
  };
  playDraw: {
    tossWon: WinLoss;
    tossLost: WinLoss;
    onPlay: WinLoss;
    onDraw: WinLoss;
    choseToDraw: Proportion;
  };
  texture: {
    averageTurns: number;
    averageOpeningHand: number;
    mulliganRate: Proportion;
  };
  shareSeries: {
    days: {
      from: string;
      to: string;
    };
    markedDay: string | null;
    points: SharePoint[];
  };
  sampleList: SampleList;
  cardTableWithheld: {
    reason: string;
    minPlayers: number;
  } | null;
};

export type Matchup = WinLoss & {
  matches: number;
  opponent: DeckRef;
};

export type MatchupsResponse = {
  provenance: Provenance;
  formatId: string;
  deck: DeckRef;
  query: Query;
  neverMet: number;
  matchups: Page<Matchup>;
};
