import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BookId,
  KasparovChessCurriculum,
  LessonSummary,
  OpeningsRevisionCurriculum,
} from "./types";
import { Home } from "./pages/Home";
import { Landing } from "./pages/Landing";
import { LessonPage } from "./pages/Lesson";
import { KasparovChessPage } from "./pages/KasparovChess";
import { OpeningRevisionPage } from "./pages/OpeningRevision";
import { SettingsPage } from "./pages/Settings";
import { loadIndex, loadKasparovChess, loadOpeningsRevision } from "./lib/lessonLoader";
import { loadLang, saveLang, type Lang } from "./lib/lang";
import { loadProgress } from "./lib/progress";
import "./App.css";

type AppView = "landing" | "library";

function viewFromHash(): AppView {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "/library" || hash === "library") return "library";
  return "landing";
}

function setHash(view: AppView) {
  const next = view === "library" ? "#/library" : "#/";
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
  }
}

const VIRTUAL_BOOKS = new Set<BookId>(["openings-revision", "kasparov-chess"]);

function App() {
  const [view, setView] = useState<AppView>(() =>
    typeof window === "undefined" ? "landing" : viewFromHash(),
  );
  const [lang, setLangState] = useState<Lang>(() =>
    typeof window === "undefined" ? "en" : loadLang(),
  );
  const [selectedBook, setSelectedBook] = useState<BookId | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonSummary | null>(null);
  const [activeOpeningModuleId, setActiveOpeningModuleId] = useState<string | null>(null);
  const [activeKasparovExerciseId, setActiveKasparovExerciseId] = useState<string | null>(null);
  const [showOpeningRevision, setShowOpeningRevision] = useState(false);
  const [showKasparovChess, setShowKasparovChess] = useState(false);
  const [openingsRevision, setOpeningsRevision] = useState<OpeningsRevisionCurriculum | null>(null);
  const [kasparovChess, setKasparovChess] = useState<KasparovChessCurriculum | null>(null);
  const [lessonsById, setLessonsById] = useState<Map<string, LessonSummary>>(new Map());
  const [showSettings, setShowSettings] = useState(false);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLang(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    function onHashChange() {
      setView(viewFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) setHash("landing");
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [index, curriculum, kasparov] = await Promise.all([
          loadIndex(),
          loadOpeningsRevision(),
          loadKasparovChess(),
        ]);
        if (cancelled) return;
        setOpeningsRevision(curriculum);
        setKasparovChess(kasparov);
        const map = new Map<string, LessonSummary>();
        for (const lesson of [...index.chernov, ...index.nunn]) {
          map.set(lesson.id, lesson);
        }
        setLessonsById(map);
      } catch {
        /* library load still works from Home */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearVirtualViews = useCallback(() => {
    setShowOpeningRevision(false);
    setActiveOpeningModuleId(null);
    setShowKasparovChess(false);
    setActiveKasparovExerciseId(null);
  }, []);

  const goLanding = useCallback(() => {
    setShowSettings(false);
    setActiveLesson(null);
    clearVirtualViews();
    setView("landing");
    setHash("landing");
  }, [clearVirtualViews]);

  const goLibrary = useCallback(() => {
    setShowSettings(false);
    setActiveLesson(null);
    clearVirtualViews();
    setView("library");
    setHash("library");
  }, [clearVirtualViews]);

  function openLesson(lesson: LessonSummary) {
    setShowSettings(false);
    clearVirtualViews();
    setSelectedBook(lesson.book as BookId);
    setActiveLesson(lesson);
    setView("library");
    setHash("library");
  }

  function openOpeningsRevision(moduleId?: string | null) {
    setShowSettings(false);
    setActiveLesson(null);
    setShowKasparovChess(false);
    setActiveKasparovExerciseId(null);
    setSelectedBook("openings-revision");
    setActiveOpeningModuleId(moduleId ?? null);
    setShowOpeningRevision(true);
    setView("library");
    setHash("library");
  }

  function openKasparovChess(exerciseId?: string | null) {
    setShowSettings(false);
    setActiveLesson(null);
    setShowOpeningRevision(false);
    setActiveOpeningModuleId(null);
    setSelectedBook("kasparov-chess");
    setActiveKasparovExerciseId(exerciseId ?? null);
    setShowKasparovChess(true);
    setView("library");
    setHash("library");
  }

  async function continueStudying() {
    const progress = loadProgress();
    if (!progress.lastLessonId) {
      goLibrary();
      return;
    }
    try {
      const index = await loadIndex();
      const lesson = index.books
        .flatMap((book) => index[book.id] ?? [])
        .find((item) => item.id === progress.lastLessonId);
      if (lesson) {
        openLesson(lesson);
        return;
      }
    } catch {
      /* fall through to library */
    }
    goLibrary();
  }

  const shellClass =
    !activeLesson && !showSettings && !showOpeningRevision && !showKasparovChess && view === "landing"
      ? "app-shell is-landing"
      : "app-shell";

  const tLoading = useMemo(() => {
    if (showKasparovChess) {
      return lang === "fr" ? "Chargement de Kasparov Chess…" : "Loading Kasparov Chess…";
    }
    return lang === "fr"
      ? "Chargement des modules d’ouverture…"
      : "Loading opening modules…";
  }, [lang, showKasparovChess]);

  return (
    <main className={shellClass}>
      {activeLesson ? (
        <LessonPage
          summary={activeLesson}
          lang={lang}
          onBack={() => setActiveLesson(null)}
          onReviseOpening={(moduleId) => openOpeningsRevision(moduleId)}
          openingsRevision={openingsRevision}
        />
      ) : showOpeningRevision ? (
        openingsRevision ? (
          <OpeningRevisionPage
            curriculum={openingsRevision}
            lang={lang}
            initialModuleId={activeOpeningModuleId}
            lessonsById={lessonsById}
            onOpenLesson={openLesson}
            onBack={() => {
              setShowOpeningRevision(false);
              setActiveOpeningModuleId(null);
              setSelectedBook(null);
            }}
          />
        ) : (
          <p className="opening-revision-loading">{tLoading}</p>
        )
      ) : showKasparovChess ? (
        kasparovChess ? (
          <KasparovChessPage
            curriculum={kasparovChess}
            lang={lang}
            initialExerciseId={activeKasparovExerciseId}
            lessonsById={lessonsById}
            onOpenLesson={openLesson}
            onBack={() => {
              setShowKasparovChess(false);
              setActiveKasparovExerciseId(null);
              setSelectedBook(null);
            }}
          />
        ) : (
          <p className="opening-revision-loading">{tLoading}</p>
        )
      ) : showSettings ? (
        <SettingsPage lang={lang} onLangChange={setLang} onBack={() => setShowSettings(false)} />
      ) : view === "landing" ? (
        <Landing
          lang={lang}
          onEnterLibrary={goLibrary}
          onContinueLesson={() => void continueStudying()}
        />
      ) : (
        <Home
          lang={lang}
          selectedBook={selectedBook && VIRTUAL_BOOKS.has(selectedBook) ? null : selectedBook}
          onSelectBook={(bookId) => {
            if (bookId === "openings-revision") {
              openOpeningsRevision(null);
              return;
            }
            if (bookId === "kasparov-chess") {
              openKasparovChess(null);
              return;
            }
            clearVirtualViews();
            setSelectedBook(bookId);
          }}
          onOpenLesson={openLesson}
          onOpenSettings={() => setShowSettings(true)}
          onBackToLanding={goLanding}
        />
      )}
    </main>
  );
}

export default App;
