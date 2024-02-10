""" Script for scraping hymns """

import argparse
import logging
from urllib.parse import urlparse
import re
from pathlib import Path
import json
import requests
from bs4 import BeautifulSoup
import nltk as k
from langdetect import detect
from deepmerge import always_merger

SAVE_DIR = 'hinos'


def check_name(name_to_check, list_of_names, separator='_'):
    """
    Controlla che non ci siano omonimi e, in caso affermativo, aggiunge
    un contantore al termine del nome.
    """
    if name_to_check not in list_of_names:
        return name_to_check
    counter = 1
    if len(name_to_check.split(separator)) > 1:
        counter = int(name_to_check.split('_')[1]) + 1
    return check_name(f"{name_to_check.split(separator)[0]}{separator}{counter}", list_of_names)

def download_catalog(url, save_hinario=False, save_hino=False):
    """ Scarica l'intero catalogo. """
    req = requests.get(url, timeout=10)
    soup = BeautifulSoup(req.content, 'html.parser')

    catalog = {
        'title': soup.select('.page_breadcrumbs h2')[0].get_text().strip(),
        'hinarios': []
    }

    hinarios_raw = soup.select('h4 a')
    for hinario_raw in hinarios_raw:
        hinario_url = hinario_raw.attrs['href']
        hinario = download_hinario(hinario_url, save_hino=save_hino)
        if save_hinario:
            hinario_json = json.dumps(hinario, indent=4)
            filename = f"./{SAVE_DIR}/{hinario['person']} - {hinario['title']}.json"
            with open(filename, 'w', encoding='utf-8') as outfile:
                outfile.write(hinario_json)
        catalog['hinarios'].append(hinario)
    return catalog

def download_hinario(url, save_hino=False):
    """ Scarica il singolo hinario con tutti gli hino a lui relativi. """
    logging.debug('Scarico hinario: %s', url)

    req = requests.get(url, timeout=10)
    soup = BeautifulSoup(req.content, 'html.parser')

    hinario = {
        'person': soup.select('.breadcrumb li:nth-last-of-type(2) a')[0].get_text().strip(),
        'title': soup.select('.page_breadcrumbs h2')[0].find(string=True, recursive=False).get_text().strip(),
        'hinos': []
    }

    logging.info('+ %s', hinario['title'])

    hinos_raw = soup.select('.hymn-list-name a')
    for hino_raw in hinos_raw:
        hino_url = hino_raw.attrs['href']
        hino = download_hino(hino_url, hinario['title'])
        if save_hino:
            hino_json = json.dumps(hino, indent=4)
            filename = f"./{SAVE_DIR}/{hino['person']} - {hino['hinario']} - {hino['index']}. {hino['title']}.json"
            with open(filename, 'w', encoding='utf-8') as outfile:
                outfile.write(hino_json)
        # Essendo già presenti nei dati dell'hinario, chi lo ha ricevuto
        # e il titolo sono informazioni ridondanti.
        del hino['person']
        del hino['hinario']
        hinario['hinos'].append(hino)
    return hinario

def download_hino(url, hinario=''):
    """ Scarica un singolo hino. """
    logging.debug('Scarico hino: %s', url)

    req = requests.get(url, timeout=10)
    soup = BeautifulSoup(req.content, 'html.parser')

    index = soup.select('.hinario-breadcrumb-hinario a')[0].get_text().strip().split('#')[1]

    # Se alla funzione non viene passato il titolo dell'hinario, significa che
    # si sta scaricando il singolo hino, e perciò verranno presi per validi
    # il titolo e l'indice nella barra principale.
    if hinario == '':
        hinario = soup.select('.hinario-breadcrumb-hinario a')[0].get_text().strip().split('#')[0]
    else:
        # Se invece viene passato il titolo, per recuperare l'indice corretto
        # è necessario selezionare l'indice relativo all'hinario interessato
        # in quanto lo stesso hino può figurare in più di un hinariol
        sources_raw = soup.select('.hinario-breadcrumb-hinario')
        for source_raw in sources_raw:
            source = source_raw.get_text().split('#')[0].strip()
            if source == hinario:
                index = source_raw.get_text().split('#')[1].strip()
                break

    hino = {
        'person': soup.select('.breadcrumb li:nth-of-type(1) a')[0].get_text().strip(),
        'hinario': hinario,
        'index': index,
        'title': soup.select('.hymn-title h5')[0].get_text().strip(),
        'verses': [],
        'tokens': {},
        }

    logging.info('  - %s. %s', hino['index'], hino['title'])

    # Analizza le singole strofe
    stanzas_raw = soup.select('.hymnstanza:has(.hymn-words)')
    for stanza in stanzas_raw:
        repetitions = stanza.select('.hymn-words')
        for repetition in repetitions:
            text = re.sub(' +', ' ', repetition.get_text().strip()).split('<br>')[0]
            if text != '':
                lang = detect(text)
                verses = {
                    'text': text,
                    'lang': lang
                }
                tokens = { lang: k.word_tokenize(text) }
                hino['verses'].append(verses)
                hino['tokens'] = always_merger.merge(hino['tokens'], tokens)
    return hino

def download_person(url, save_hinario=False, save_hino=False):
    """ Scarica tutti gli hinari ricevuti da una singola persona. """
    logging.debug('Scarico persona: %s', url)
    req = requests.get(url, timeout=10)
    soup = BeautifulSoup(req.content, 'html.parser')

    person = {
        'name': soup.select('.page_breadcrumbs h2')[0].get_text().strip(),
        'hinarios': []
    }

    hinarios_raw = soup.select('.row .no-bullets li a')
    for hinario_raw in hinarios_raw:
        hinario_url = hinario_raw.attrs['href']
        hinario = download_hinario(hinario_url, save_hino=save_hino)
        if save_hinario:
            hinario_json = json.dumps(hinario, indent=4)
            filename = f"./{SAVE_DIR}/{hinario['person']} - {hinario['title']}.json"
            with open(filename, 'w', encoding='utf-8') as outfile:
                outfile.write(hinario_json)
        # Rimuovo il nome della persona che lo ha ricevuto perché già indicato.
        del hinario['person']
        person['hinarios'].append(hinario)
    return person

def main():
    """ Funzione principale. """

    parser = argparse.ArgumentParser(
                        prog='getHymns',
                        )
    parser.add_argument('url',
                        help='URL da scaricare',
                        nargs='+'
                        )
    parser.add_argument('--debug',
                        action='store_true'
                        )
    parser.add_argument('--save-catalog',
                        default=True,
                        action='store_true',
                        help='Salva tutto in un unico file'
                        )
    parser.add_argument('--save-person',
                        default=False,
                        action='store_true',
                        help='Salva tutto ciò che ha ricevugto una persona in un singolo file'
                        )
    parser.add_argument('--save-hinario',
                        default=False,
                        action='store_true',
                        help='Salva ogni hinario in un file separato'
                        )
    parser.add_argument('--save-hino',
                        default=False,
                        action='store_true',
                        help='Salva ogni hino in un file separato'
                        )
    args = parser.parse_args()

    if args.save_catalog or args.save_person or args.save_hinario or args.save_hino:
        Path(f"./{SAVE_DIR}").mkdir(parents=True, exist_ok=True)
    if args.debug:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    for url in args.url:
        logging.debug('Working on %s', url)
        try:
            o = urlparse(url)
            if o.netloc != 'nossairmandade.com':
                raise ValueError(f"{o.netloc} non è supportato.")
            match o.path.split('/')[1]:
                case 'hinarios':
                    catalog = download_catalog(url, save_hinario=args.save_hinario, save_hino=args.save_hino)
                    if args.save_catalog:
                        catalog_json = json.dumps(catalog, indent=4)
                        filename = f"./{SAVE_DIR}/{catalog['title']}.json"
                        with open(filename, 'w', encoding='utf-8') as outfile:
                            outfile.write(catalog_json)
                case 'person':
                    person = download_person(url, save_hinario=args.save_hinario, save_hino=args.save_hino)
                    if args.save_person:
                        person_json = json.dumps(person, indent=4)
                        filename = f"./{SAVE_DIR}/{person['name']}.json"
                        with open(filename, 'w', encoding='utf-8') as outfile:
                            outfile.write(person_json)
                case 'hinario':
                    hinario = download_hinario(url, save_hino=args.save_hino)
                    if args.save_hinario:
                        hinario_json = json.dumps(hinario, indent=4)
                        filename = f"./{SAVE_DIR}/{hinario['person']} - {hinario['title']}.json"
                        with open(filename, 'w', encoding='utf-8') as outfile:
                            outfile.write(hinario_json)
                case 'hymn':
                    hino = download_hino(url)
                    if args.save_hino:
                        hino_json = json.dumps(hino, indent=4)
                        filename = f"./{SAVE_DIR}/{hino['person']} - {hino['hinario']} - {hino['index']}. {hino['title']}.json"
                        with open(filename, 'w', encoding='utf-8') as outfile:
                            outfile.write(hino_json)
                case other:
                    raise ValueError(f"Non so cosa fare con {o.path.split('/')[1]}.")
        except ValueError:
            logging.error("Non posso lavorare su %s. Vado avanti...", %s)
            continue

if __name__ == "__main__":
    main()
