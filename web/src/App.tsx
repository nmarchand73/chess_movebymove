import { useState } from "react";
import type { LessonSummary } from "./types";
import { Home } from "./pages/Home";
import { LessonPage } from "./pages/Lesson";
import "./App.css";

function App() {
  const [active, setActive] = useState<LessonSummary | null>(null);

  return (
    <main className="app-shell">
      {active ? <LessonPage summary={active} onBack={() => setActive(null)} /> : <Home onOpenLesson={setActive} />}
    </main>
  );
}

export default App;
