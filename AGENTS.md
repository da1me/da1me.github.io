# AGENT Instructions

## Build workflow

Client-side JavaScript lives in the `src/` folder. The file `scripts/bundle.js` is built from the other modules inside such folder and should not be edited directly.

Run `make b` to create or update `scripts/bundle.js` whenever you change the other files inside `src/`.
Never change `scripts/bundle.js` by hand, but only update it using `make b`.
