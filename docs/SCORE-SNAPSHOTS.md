# Score snapshot analytics

The web game emits `puzzle-score-snapshot` through its existing Umami integration.
On the first accepted new word in today's UTC puzzle each day, it scans all
saved earlier puzzles, including historical saves already present when this
feature is introduced and untouched legacy progress. Skipped days do not limit
collection. Page views, invalid or duplicate submissions, and archive play do
not trigger collection or delivery.

These are snapshots of saved progress when a player returns to play. They are
not guaranteed final scores. Saved words are validated and deduplicated against
published puzzle data; points, ranks and pangram counts use the game's rules.
Empty saves and saves with no accepted words produce no event.

| Property | Meaning |
| --- | --- |
| `puzzle` | Date/ID of the earlier puzzle, `YYYY-MM-DD` |
| `score` | Points earned, recalculated from accepted saved words |
| `maximumScore` | Maximum available points in the published puzzle |
| `scorePercent` | Percentage of maximum points earned, rounded to two decimals |
| `rank` | Rank reached; Queen Bee requires all accepted answers |
| `wordCount` | Number of distinct accepted words found |
| `pangramsFound` | Number of distinct pangrams found |
| `pangramCount` | Number of distinct pangrams available |
| `snapshotDate` | UTC date on which the snapshot was captured, `YYYY-MM-DD` |

Only these aggregate event properties are sent. There are no found-word lists
or new player identifiers. The named-event API retains Umami's actual submission
timestamp; the game does not override it with the puzzle or snapshot date. See
[Umami tracker functions](https://docs.umami.is/docs/tracker-functions).

Group analysis by **`puzzle`**, rather than event submission date, to compare
performance on the same puzzle. Use `snapshotDate` to identify snapshots captured
on a later date; pending delivery can delay submission beyond that date as well.
No dashboards are created or changed by this implementation.

## Storage and retries

Progress saves retain their existing format. A separate local-storage ledger at
`seven:score-snapshots:v1` contains `version: 1`, `pending` snapshots keyed by
puzzle ID, `reportedPuzzleIds`, and `lastCollectionDate` (initially `null`).

Snapshots are persisted before tracker handoff and frozen thereafter. Improving
or resetting progress does not replace a pending snapshot or resend a reported
one. Each daily collection loads required monthly shards asynchronously, once
per month per run. Unavailable puzzle data does not prevent other snapshots;
those puzzles stay eligible for a later day's collection. A failed manifest load
also leaves existing pending snapshots available for delivery.

Subsequent accepted words in today's puzzle retry pending events without another
daily scan. Reloading retains the daily collection date and pending data. Later
days' engagement also retries pending events. There is no timer or polling.
Unavailable trackers, thrown/rejected tracker calls and explicit failure results
retain pending data. A tracker call that returns or resolves without a reported
failure marks the puzzle reported. This handoff is not a server delivery receipt.

Within a tab, overlapping runs share one operation. Web Locks serialize collection
and delivery across tabs where supported. Otherwise the game re-reads and merges
the ledger before delivery for best effort deduplication. If ledger storage cannot
be read or written, snapshot work stops and gameplay continues. Malformed or
unsupported ledgers are left intact and skipped rather than resetting deduplication.

## Measurement limits

Results represent returning players' saved browser progress. They cannot establish
unique people, cross-device progress, whether answers were consulted or final
performance. Deduplication is per browser and origin, so the root domain and GitHub
Pages have separate ledgers. Clearing browser storage removes that history. A tab
closing or a storage failure after handoff can cause a retry, and tabs without Web
Locks can race. Exactly-once delivery is not guaranteed.

## Verification

`npm run test:unit` includes scoring, eligibility, daily engagement, frozen retry,
storage failure, overlapping-run and mocked Umami integration tests. The integration
test replaces both puzzle fetches and the tracker; it sends no production events.
Run `npm run lint`, `npm run test:pages` and `npm run test:root` for the full checks.
These commands build/export locally and do not deploy.
