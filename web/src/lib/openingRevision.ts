import type { Lang } from "./lang";
import type { OpeningModule, OpeningsRevisionCurriculum } from "../types";

export function localized(
  text: { en: string; fr: string } | undefined,
  lang: Lang,
): string {
  if (!text) return "";
  return lang === "fr" ? text.fr : text.en;
}

export function findModuleById(
  curriculum: OpeningsRevisionCurriculum,
  moduleId: string,
): OpeningModule | undefined {
  return curriculum.modules.find((m) => m.id === moduleId);
}

export function findModuleByEco(
  curriculum: OpeningsRevisionCurriculum,
  eco: string | undefined,
): OpeningModule | undefined {
  if (!eco) return undefined;
  const code = eco.trim().toUpperCase();
  return curriculum.modules.find((m) =>
    m.ecoPrefixes.some((prefix) => code.startsWith(prefix.toUpperCase())),
  );
}

export function findModuleByOpeningName(
  curriculum: OpeningsRevisionCurriculum,
  opening: string | undefined,
): OpeningModule | undefined {
  if (!opening) return undefined;
  const key = opening.toLowerCase();
  return curriculum.modules.find((m) => {
    const en = m.names.en.toLowerCase();
    const fr = m.names.fr.toLowerCase();
    return key.includes(en) || en.includes(key) || key.includes(fr) || fr.includes(key);
  });
}

export function modulesForSection(
  curriculum: OpeningsRevisionCurriculum,
  sectionId: string,
): OpeningModule[] {
  const section = curriculum.sections.find((s) => s.id === sectionId);
  if (!section) return [];
  const refs = new Set(section.refs);
  return curriculum.modules.filter((m) => refs.has(m.bookRef));
}
