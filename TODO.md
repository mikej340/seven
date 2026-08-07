# Game TODO

## Decide the final name and theme model

Use **Seven Word Puzzle** and **Seven** as neutral working labels only. Choose a
final name and brand later. Keep visual themes configurable and separate from
puzzle rules, saved state and puzzle data.

## Persist current game state

Add a versioned device-local save containing the puzzle identifier, found
words, score and completion status. Validate and migrate stored data so an old
save cannot corrupt a newer puzzle format.

## Define core and bonus word behaviour

Core words should count towards completion and advertised totals. Consider
accepting other dictionary-valid words as optional bonus finds without making
them completion requirements. Coordinate this with the curated exports from
the generator repository.
