# Traduction leçons Move by Move (EN → FR)

## Structure
- Source: `data/en/lessons/{id}.json`
- Cible: `data/fr/lessons/{id}.json` (même schéma JSON)
- Après écriture: aussi copier vers `web/public/data/fr/lessons/{id}.json`

## À traduire
- `title`, `section`, `fullText`, chaque `nodes[].text`
- `opening` : nom français usuel si courant (ex. « Défense sicilienne », « Partie italienne / Giuoco Piano »), sinon garder le nom international

## Ne pas traduire / ne pas modifier
- `id`, `book`, `gameNum`, `players`, `event`, `eco`, `pgnPath`, `result`, `moveCount`, `annotatedMoves`
- `nodes[].ply`, `nodes[].san`, `nodes[].isCritical`
- Les **coups SAN** dans le texte : garder la notation anglaise internationale (`Nf3`, `Bc4`, `O-O`, `exd4`) pour que les clics et le TTS restent cohérents. **Ne pas** convertir en Cf3 / Ff4.

## Vocabulaire technique (obligatoire)

| EN | FR |
|---|---|
| White / Black | les Blancs / les Noirs |
| move | coup |
| game | partie |
| piece / pawn | pièce / pion |
| knight / bishop / rook / queen / king | cavalier / fou / tour / dame / roi |
| develop / development | développer / développement |
| centre / center | centre |
| kingside / queenside | aile roi / aile dame |
| castle / castling | roquer / roque (petit roque / grand roque) |
| check / checkmate / mate | échec / mat |
| pin / pinned | clouage / cloué |
| fork / skewer / discovered check | fourchette / enfilade / échec à la découverte |
| sacrifice | sacrifice |
| exchange (pieces) | échange |
| capture / take | prendre / capture |
| tempo / tempi | tempo / tempos |
| outpost | avant-poste |
| passed pawn | pion passé |
| isolated / doubled / backward pawn | pion isolé / doublé / arriéré |
| space / initiative | espace / initiative |
| combination | combinaison |
| middlegame / endgame / ending | milieu de jeu / finale |
| opening | ouverture |
| rank / file / diagonal | rangée / colonne / diagonale |
| square | case |
| pressure | pression |
| threat | menace |
| retreat | reculer / retrait |
| fianchetto | fianchetto |
| weak / strong square | case faible / forte |
| blockade | blocus |
| prophylaxis | prophylaxie |
| zugzwang | zugzwang |
| en passant | en passant |
| flight-square | case de fuite |
| back rank | dernière rangée |
| to move | au trait / trait aux Blancs/Noirs |

## Style
- Ton pédagogique, clair, comme Chernev / Nunn — pas de jargon marketing.
- Corriger les trous OCR évidents dans les coups (ex. ligne coupée `\nf6` quand c’est clairement `Nf6` / `Qf6` d’après le contexte) **dans le texte traduit**, en rétablissant le SAN anglais complet.
- Conserver les citations d’auteurs (Tarrasch, Capablanca…) en FR fidèle ; maximes latines/FR déjà présentes (ex. « Sortez les pièces ! ») inchangées.
- Paragraphes : garder la structure `\n\n` du source autant que possible.
- Nœuds avec `"text": ""` : laisser `""`.

## Interdit
- Aucun appel réseau / API de traduction (Google, DeepL, MyMemory, etc.).
- Traduire uniquement avec la connaissance du modèle (vocabulaire échecs FR ci-dessus).
- Calques interdits : évêque (bishop), déménagement (move), fichier (file), Trait aux les…

## Validation
- JSON valide, même nombre de `nodes` que l’EN.
- Chaque nœud a les mêmes `ply` / `san` / `isCritical`.
- Fichier écrit uniquement sous `data/fr/lessons/` puis miroir public.
