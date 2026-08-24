# Link Preview Plan

## Goal

Give shared Seven URLs a deliberate preview in Messages, WhatsApp, Slack and
social networks, with a branded image, title and short description. Keep the
first version compatible with the existing static GitHub Pages deployment.

## First release: one site-wide preview

1. Create a 1200×630 social-card image using the leaf artwork, the Seven name
   and a short description. Keep important content away from the edges so
   different clients can crop it safely.
2. Add production URL metadata and site-wide Open Graph fields to the root
   layout: type, canonical URL, site name, title, description, image dimensions
   and useful image alt text.
3. Add a large-image Twitter/X card using the same title, description and image.
4. Keep all preview metadata in the statically exported HTML. The image must be
   available through an absolute HTTPS URL below
   `https://mikej340.github.io/seven/`.
5. Extend the static-export test to verify the production Open Graph and card
   tags, absolute image URL, dimensions and exported image file.
6. After deployment, test the live URL in representative preview inspectors and
   by sharing it in Messages and WhatsApp. Record that preview services cache
   metadata and may not refresh immediately.

## Later: puzzle and result sharing

Treat personalised sharing as a separate feature. A preview crawler cannot read
a player's local browser storage, and the current query-string puzzle URLs all
receive the same statically exported HTML.

Before implementation, decide whether shared links should represent:

- a particular daily puzzle without revealing progress;
- a completed result such as score, rank or pangram count; or
- a spoiler-free grid similar to other daily puzzle games.

Supporting distinct crawler-visible cards will require stable share URLs and
metadata that can be produced without private device state. With GitHub Pages,
that likely means pre-generated static routes/assets or encoded, non-sensitive
share data; otherwise it would require a dynamic image or metadata service.

## Acceptance criteria

- Sharing the production home URL produces the intended title, description and
  wide image in major clients that support Open Graph.
- The preview does not depend on JavaScript, cookies, authentication or local
  storage.
- All metadata and assets work under the `/seven` GitHub Pages base path.
- The social image has descriptive alt text and remains legible under common
  centre-cropping.
- Updating the image can use a new filename when cache invalidation is needed.

