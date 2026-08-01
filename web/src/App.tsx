import { useState } from "react";
import type { BookId, LessonSummary } from "./types";
import { Home } from "./pages/Home";
import { LessonPage } from "./pages/Lesson";
import { SettingsPage } from "./pages/Settings";
import "./App.css";

function App() {
  const [selectedBook, setSelectedBook] = useState<BookId | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonSummary | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  function openLesson(lesson: LessonSummary) {
    setShowSettings(false);
    setSelectedBook(lesson.book as BookId);
    setActiveLesson(lesson);
  }

  return (
    <main className="app-shell">
      {activeLesson ? (
        <LessonPage summary={activeLesson} onBack={() => setActiveLesson(null)} />
      ) : showSettings ? (
        <SettingsPage onBack={() => setShowSettings(false)} />
      ) : (
        <Home
          selectedBook={selectedBook}
          onSelectBook={setSelectedBook}
          onOpenLesson={openLesson}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
    </main>
  );
}

export default App;
