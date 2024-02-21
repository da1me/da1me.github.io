scrape:
	echo 'start scrapping'
	python3.11 scripts/getHymns.py "https://nossairmandade.com/hinarios/individual"

i:
	pip3 install -r requirements.txt

ijs:
	npm i

d:
	npm run dev

b:
	npm run build

fix:
	npm run fixme
