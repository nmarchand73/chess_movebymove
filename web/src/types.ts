export type BookId = "chernov" | "nunn" | "intentions" | "openings-revision";

export type LocalizedText = { en: string; fr: string };

export type OpeningBasePosition = {
  fen: string;
  ask: LocalizedText;
  choices: { en: string[]; fr: string[] };
  answer: number;
  why: LocalizedText;
};

export type OpeningModuleBookExcerpt = {
  title?: string;
  subtitle?: string | null;
  excerptFr: string;
  source?: string;
  /** Quiz overrides grounded in the local book extract (personal study only). */
  basePositions?: OpeningBasePosition[];
};

export type OpeningModule = {
  id: string;
  bookRef: number;
  names: LocalizedText;
  /** Short mood line from the paper book (when enriched locally). */
  tagline?: LocalizedText;
  ecoPrefixes: string[];
  plan: LocalizedText;
  themes: { en: string[]; fr: string[] };
  exampleLine: { san: string[]; startFen: string };
  basePositions: OpeningBasePosition[];
  gameIds: string[];
  /** Present only when the gitignored local Olibris overlay is loaded. */
  bookExcerpt?: OpeningModuleBookExcerpt;
};

export type OpeningsRevisionLocalOverlay = {
  id: "openings-revision-local";
  principles?: Array<{ id: string; title: LocalizedText; body: LocalizedText; source?: string }>;
  modules: Record<string, OpeningModuleBookExcerpt>;
};

export type OpeningKnowledgeItem = {
  type: "nameFromMoves";
  moves: string[];
  answerModuleId: string;
  prompt: LocalizedText;
};

export type OpeningSkillItem = {
  fen: string;
  bestMoveSan: string;
  answerModuleId: string;
  prompt: LocalizedText;
};

export type OpeningsRevisionSection = {
  id: string;
  title: LocalizedText;
  refs: number[];
};

export type OpeningsRevisionCurriculum = {
  id: "openings-revision";
  title: LocalizedText;
  author: LocalizedText;
  publisher?: LocalizedText;
  principles: Array<{ id: string; title: LocalizedText; body: LocalizedText }>;
  sections: OpeningsRevisionSection[];
  modules: OpeningModule[];
  batteries: {
    knowledge: OpeningKnowledgeItem[];
    skill: OpeningSkillItem[];
  };
};

export type BookSection = {
  title: string;
  range: string;
  blurb: string;
  openings?: IntentionsOpening[];
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
  /** Present when this summary is a virtual curriculum entry. */
  sourceBook?: "chernov" | "nunn";
  sourceLessonId?: string;
  /** Short pedagogical blurb for the intentions curriculum. */
  why?: string;
  /** Intention section id when opened from the intentions book. */
  intentionId?: string;
  /** Matched opening idea from the intention→opening table. */
  openingIdea?: string;
  openingName?: string;
};

export type IntentionsOpening = {
  name: string;
  idea: string;
};

export type IntentionsEntry = {
  primary: string;
  why: string;
};

export type IntentionsSection = {
  id: string;
  title: string;
  blurb: string;
  openings?: IntentionsOpening[];
  gameIds: string[];
};

export type IntentionsCurriculum = {
  id: "intentions";
  title: string;
  author: string;
  publisher?: string;
  sections: IntentionsSection[];
  entries: Record<string, IntentionsEntry>;
};

export type LessonIndex = {
  books: BookMeta[];
  chernov: LessonSummary[];
  nunn: LessonSummary[];
  intentions: LessonSummary[];
  /** Virtual book: modules live in openings-revision.json, not lesson rows. */
  "openings-revision": LessonSummary[];
};
