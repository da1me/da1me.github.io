# AGENT Instructions

## Build workflow

Client-side JavaScript lives in the `src/` folder. The file `scripts/bundle.js` is built from the other modules inside such folder and should not be edited directly.

Run `make b` to create or update `scripts/bundle.js` whenever you change the other files inside `src/`.
Never change `scripts/bundle.js` by hand, but only update it using `make b`.

`hinos/corpus.json` is likewise generated — `scripts/buildCorpus.js` derives it from
`hinos/td.json`. Never edit it by hand; regenerate it with `npm run build:corpus`
(also covered by `make b`) after re-scraping.

Both generated files are git-ignored and rebuilt in CI.

## Checks

Run `npx standard` and `npm test` before committing; CI runs both and will fail the
deploy on either.
