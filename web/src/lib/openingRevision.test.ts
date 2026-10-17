import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import type { OpeningsRevisionCurriculum } from "../types.ts";
import {
  findModuleByEco,
  findModuleById,
  findModuleByOpeningName,
  localized,
  modulesForSection,
} from "./openingRevision.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const curriculum = JSON.parse(
  readFileSync(join(root, "data/openings-revision.json"), "utf8"),
) as OpeningsRevisionCurriculum;

describe("openings-revision curriculum", () => {
  it("contains fifty Super Opening modules", () => {
    assert.equal(curriculum.id, "openings-revision");
    assert.equal(curriculum.modules.length, 50);
    assert.equal(curriculum.batteries.knowledge.length, 50);
    assert.ok(curriculum.batteries.skill.length >= 20);
  });

  it("numbers bookRef 1 through 50 uniquely", () => {
    const refs = curriculum.modules.map((m) => m.bookRef).sort((a, b) => a - b);
    assert.deepEqual(refs, Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("gives each module an example line and base positions", () => {
    for (const mod of curriculum.modules) {
      assert.ok(mod.exampleLine.san.length >= 4, mod.id);
      assert.ok(mod.basePositions.length >= 3, mod.id);
      assert.ok(mod.plan.en && mod.plan.fr, mod.id);
    }
  });
});

describe("openingRevision helpers", () => {
  it("finds modules by id, eco, and name", () => {
    const giuoco = findModuleById(curriculum, "giuoco-piano");
    assert.equal(giuoco?.bookRef, 1);
    assert.equal(findModuleByEco(curriculum, "C53")?.id, "giuoco-piano");
    assert.equal(findModuleByOpeningName(curriculum, "Sicilian Dragon")?.id, "sicilian-dragon");
  });

  it("lists modules for a family section", () => {
    const open = modulesForSection(curriculum, "open-games");
    assert.ok(open.length >= 10);
    assert.ok(open.every((m) => m.bookRef <= 14));
  });

  it("localizes bilingual fields", () => {
    assert.match(localized(curriculum.title, "fr"), /Super Ouvertures/);
    assert.match(localized(curriculum.title, "en"), /Super Openings/);
  });
});
