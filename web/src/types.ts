export type BookId = "chernov" | "nunn";

export type BookSection = {
  title: string;
  range: string;
  blurb: string;
};

export type BookMeta = {
  id: BookId;
  title: string;
  author: string;
  publisher?: string;
  gameCount: number;
  sections?: BookSection[];
};

export type AnnotationNode = {
  ply: number;
  san?: string;
  text: string;
  isCritical?: boolean;
};

export type Lesson = {
  id: string;
  book: BookId;
  gameNum: number;
  title: string;
  section: string;
  players: { white: string; black: string };
  event?: string;
  opening?: string;
  eco?: string;
  result?: string;
  moveCount: number;
  annotatedMoves?: number;
  fullText?: string;
  nodes: AnnotationNode[];
};

export type PerformanceElo = {
  white: number;
  black: number;
  whiteAcpl?: number;
  blackAcpl?: number;
};

export type PlayerAggregate = {
  name: string;
  games: number;
  avgElo: number;
  asWhite: number;
  asBlack: number;
};

export type LessonSummary = {
  id: string;
  book: string;
  gameNum: number;
  title: string;
  section: string;
  players: { white: string; black: string };
  event?: string;
  opening?: string;
  eco?: string;
  result?: string;
  moveCount: number;
  annotatedMoves?: number;
  performanceElo?: PerformanceElo;
  file: string;
};

export type LessonIndex = {
  books: BookMeta[];
  chernov: LessonSummary[];
  nunn: LessonSummary[];
};
