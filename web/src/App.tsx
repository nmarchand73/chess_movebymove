import { useState } from "react";
import type { BookId, LessonSummary } from "./types";
import { Home } from "./pages/Home";
import { LessonPage } from "./pages/Lesson";
import "./App.css";

function App() {
  const [selectedBook, setSelectedBook] = useState<BookId | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonSummary | null>(null);

  function openLesson(lesson: LessonSummary) {
    setSelectedBook(lesson.book as BookId);
    setActiveLesson(lesson);
  }

  return (
    <main className="app-shell">
      {activeLesson ? (
        <LessonPage summary={activeLesson} onBack={() => setActiveLesson(null)} />
      ) : (
        <Home
          selectedBook={selectedBook}
          onSelectBook={setSelectedBook}
          onOpenLesson={openLesson}
        />
      )}
    </main>
  );
}

export default App;
