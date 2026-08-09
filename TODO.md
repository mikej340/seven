# Game TODO

## Decide the final name and theme model

Use **Seven Word Puzzle** and **Seven** as neutral working labels only. Choose a
final name and brand later. Keep visual themes configurable and separate from
puzzle rules, saved state and puzzle data.

## Define core and bonus word behaviour

Core words should count towards completion and advertised totals. Consider
accepting other dictionary-valid words as optional bonus finds without making
them completion requirements. Coordinate this with the curated exports from
the generator repository.

## Extend and editorially review the daily schedule

Only 8 and 9 August 2026 are deliberately published for the first iteration.
Choose the first-year ordering policy before exporting more dates: strongest
candidates first, controlled variety, a seeded shuffle, or a hand-curated mix.
Released dates must remain immutable so saved games and shared links stay valid.

## Reconsider offline support later

Daily switching currently needs no service worker: the app uses UTC on load and
when it returns to the foreground. Add one only if installable offline play and
cached future puzzle data become explicit requirements.
