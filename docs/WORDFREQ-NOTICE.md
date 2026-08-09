# wordfreq attribution and licence

Candidate ranking uses `wordfreq` 3.1.1 by Robyn Speer as a build-time
frequency source: <https://github.com/rspeer/wordfreq>.

The `wordfreq` software is distributed under the Apache License 2.0. Its data
files may be redistributed under the Creative Commons Attribution-ShareAlike
4.0 International licence: <https://creativecommons.org/licenses/by-sa/4.0/>.

The project combines several attributed sources, including Google Books
Ngrams, the Leeds Internet Corpus, Wikipedia, ParaCrawl, OPUS OpenSubtitles,
and SUBTLEX frequency lists. The SUBTLEX authors must be credited and it must
remain clear that SUBTLEX is freely available data. See the upstream README
and NOTICE for the complete source credits and citation list.

This repository does not redistribute `wordfreq`'s per-word database. The
package is installed into an ignored local build cache and the committed
candidate ranking contains aggregate metrics derived from its scores.
