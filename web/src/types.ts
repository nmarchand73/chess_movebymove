export type AnnotationNode = {
  ply: number;
  san?: string;
  text: string;
  isCritical?: boolean;
};

export type Lesson = {
  id: string;
  book: "chernov" | "nunn";
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
  chernov: LessonSummary[];
};
