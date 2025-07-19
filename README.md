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
Start the development web server (rebuilds on changes) with:

```bash
npm run dev
```

The compiled site will then be served on <http://localhost:8092/>.

For now a dummy website is also available at
<https://da1me.github.io/>

:::
