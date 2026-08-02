import { useCallback, useEffect, useState } from "react";
import type { BookId, LessonSummary } from "./types";
import { Home } from "./pages/Home";
import { Landing } from "./pages/Landing";
import { LessonPage } from "./pages/Lesson";
import { SettingsPage } from "./pages/Settings";
import { loadIndex } from "./lib/lessonLoader";
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

function App() {
  const [view, setView] = useState<AppView>(() =>
    typeof window === "undefined" ? "landing" : viewFromHash(),
  );
  const [selectedBook, setSelectedBook] = useState<BookId | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonSummary | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    function onHashChange() {
      setView(viewFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) setHash("landing");
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const goLanding = useCallback(() => {
    setShowSettings(false);
    setActiveLesson(null);
    setView("landing");
    setHash("landing");
  }, []);

  const goLibrary = useCallback(() => {
    setShowSettings(false);
    setActiveLesson(null);
    setView("library");
    setHash("library");
  }, []);

  function openLesson(lesson: LessonSummary) {
    setShowSettings(false);
    setSelectedBook(lesson.book as BookId);
    setActiveLesson(lesson);
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
    !activeLesson && !showSettings && view === "landing"
      ? "app-shell is-landing"
      : "app-shell";

  return (
    <main className={shellClass}>
      {activeLesson ? (
        <LessonPage summary={activeLesson} onBack={() => setActiveLesson(null)} />
      ) : showSettings ? (
        <SettingsPage onBack={() => setShowSettings(false)} />
      ) : view === "landing" ? (
        <Landing onEnterLibrary={goLibrary} onContinueLesson={() => void continueStudying()} />
      ) : (
        <Home
          selectedBook={selectedBook}
          onSelectBook={setSelectedBook}
          onOpenLesson={openLesson}
          onOpenSettings={() => setShowSettings(true)}
          onBackToLanding={goLanding}
        />
      )}
    </main>
  );
}

export default App;
