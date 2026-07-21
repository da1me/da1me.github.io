# da1me.github.io
da1me literature analysis - routines and website

## Setup

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

Install the Node packages:

```bash
npm i
```

## Usage

### Scraping
Fetch the hymn data with:

```bash
make scrape
```

During development you can manually run the script from an IPython
session:

```bash
python3.11 -m IPython
%run scripts/getHymns.py
```

### Website

Build the site once (slim corpus index + browser bundle):

```bash
npm run build
```

Then start the development web server (rebuilds the bundle on changes) with:

```bash
npm run dev
```

The site is served on <http://localhost:8092/>, and is live at
<https://da1me.github.io/>.

Run the unit tests with `npm test` and the linter with `npx standard`.

## How the site is built

`npm run build` runs two steps:

- **`build:corpus`** — `scripts/buildCorpus.js` derives `hinos/corpus.json`
  (~2MB) from the full `hinos/td.json` scrape (~18MB) by keeping only the
  tokens the analysis needs. The page loads this slim file, so it becomes
  interactive quickly; the full file is fetched lazily, and only when you click
  a word to read the hymn lines it appears in.
- **`build:js`** — bundles `src/` into `scripts/bundle.js` with browserify.

Both outputs are generated and git-ignored; regenerate them after changing
`src/` or re-scraping.

## Notes

Signing in with Google is optional — the corpus is public and every feature
works signed out. For sign-in to work in production, `da1me.github.io` must be
listed under **Authentication → Settings → Authorized domains** in the Firebase
console.
