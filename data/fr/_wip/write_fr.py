#!/usr/bin/env python3
"""Merge EN lesson with FR overlays and write to data/fr + web/public mirror."""
import json
import sys
from copy import deepcopy
from pathlib import Path

BASE = Path('/Users/nicolasmarchand/Documents/Dev/Projects/chess/move_by_move')

def write_lesson(lesson_id: str, meta: dict, node_texts: list, full_text: str):
    en = json.loads((BASE / f'data/en/lessons/{lesson_id}.json').read_text())
    fr = deepcopy(en)
    fr['title'] = meta['title']
    fr['section'] = meta['section']
    fr['opening'] = meta['opening']
    fr['fullText'] = full_text
    assert len(node_texts) == len(en['nodes']), f"node count {len(node_texts)} != {len(en['nodes'])}"
    for i, text in enumerate(node_texts):
        # preserve ply/san/isCritical from EN
        assert fr['nodes'][i]['ply'] == en['nodes'][i]['ply']
        if 'san' in en['nodes'][i]:
            assert fr['nodes'][i].get('san') == en['nodes'][i].get('san')
        fr['nodes'][i]['text'] = text
    out1 = BASE / f'data/fr/lessons/{lesson_id}.json'
    out2 = BASE / f'web/public/data/fr/lessons/{lesson_id}.json'
    payload = json.dumps(fr, ensure_ascii=False, indent=2) + '\n'
    out1.write_text(payload)
    out2.write_text(payload)
    # validate
    loaded = json.loads(out1.read_text())
    assert len(loaded['nodes']) == len(en['nodes'])
    for i in range(len(en['nodes'])):
        assert loaded['nodes'][i]['ply'] == en['nodes'][i]['ply']
        assert loaded['nodes'][i].get('san') == en['nodes'][i].get('san')
        assert loaded['nodes'][i].get('isCritical') == en['nodes'][i].get('isCritical')
    print(f'OK {lesson_id}: {len(loaded["nodes"])} nodes, fullText={len(loaded["fullText"])} chars')
    print(f'  -> {out1}')
    print(f'  -> {out2}')

if __name__ == '__main__':
    print('helper ready')
