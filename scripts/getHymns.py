""" Script for scraping hymns """

import re
from pathlib import Path
import json
import requests
from bs4 import BeautifulSoup
import nltk as k

BASE_URL = 'https://nossairmandade.com'
HYMN_PATHS = ['/hinarios/individual']
HYMN_DIR = 'hinos'

def check_name(name_to_check, list_of_names):
    """ Check whether there's an omonym, and if so append a counter to the original name """
    if name_to_check not in list_of_names:
        return name_to_check
    counter = 1
    if len(name_to_check.split('_')) > 1:
        counter = int(name_to_check.split('_')[1]) + 1
    return check_name(f"{name_to_check.split('_')[0]}_{counter}", list_of_names)


for path in HYMN_PATHS:
    response = requests.get(BASE_URL + path, timeout=10)
    soup = BeautifulSoup(response.content, 'html.parser')

    # Elenca tutte le persone
    people_raw = soup.select('.col-md-7:not(.col-sm-6)')
    catalog = {}
    for person in people_raw:
        name = check_name(person.find_all('a')[0].get_text(), catalog)
        catalog[name] = {}

        # Elenca tutti gli hinario per la persona corrente
        hinarios = person.select('h4 a')
        for hinario in hinarios:
            title = hinario.get_text().strip()
            link = hinario.attrs['href']
            catalog[name][title] = {'link': link, 'hymns': [] }
            print(f"{name}, '{title}': {link}")

    # Crea la cartella per salvare i file
    Path(f"./{HYMN_DIR}").mkdir(parents=True, exist_ok=True)

    # Vaglia ogni persona
    for person, hinarios in catalog.items():
        print(f"\n{person.upper()}")

        # Vaglia ogni hinario della persona corrente
        for hinario in hinarios:
            HINARIO = {
                'title': hinario,
                'received_by': person,
                'hinos': []
                }
            print(f"+ {hinario}:")
            link = hinarios[hinario]['link']
            req = requests.get(link, timeout=10)
            soup = BeautifulSoup(req.content, 'html.parser')

            # Ottieni gli hino contenuti nell'hinario corrente
            hinos_raw = soup.select('.hymn-list-name a')
            index = 0
            for hino in hinos_raw:
                index += 1
                hino_link = hino.attrs['href']

                req = requests.get(hino_link, timeout=10)
                soup = BeautifulSoup(req.content, 'html.parser')

                title = soup.select('.hymn-title h5')[0].get_text().strip()
                HINO = {
                    'title': title,
                    'index': index,
                    'tokens': [],
                    'verses': []
                    }
                print(f"  - {title}")

                # Analizza le singole strofe
                stanzas_raw = soup.select('.hymnstanza:has(.hymn-words)')
                for stanza in stanzas_raw:
                    repetitions = stanza.select('.hymn-words')
                    for repetition in repetitions:
                        verses = re.sub(' +', ' ', repetition.get_text().strip()).split('<br>')
                        HINO['verses'].extend(verses)
                        for verse in verses:
                            tokens = k.word_tokenize(verse)
                            HINO['tokens'].extend(tokens)
                
                # Aggiungi l'hino all'hinario corrente
                HINARIO['hinos'].append(HINO)

                # Scrivi hino
                hino_json = json.dumps(HINO, indent=4)
                filename = f"./{HYMN_DIR}/{person} - {hinario} - {index}. {title}.json"
                with open(filename, 'w', encoding='utf-8') as outfile:
                    outfile.write(hino_json)
            
            # Scrivi hinario
            hinario_json = json.dumps(HINARIO, indent=4)
            filename = f"./{HYMN_DIR}/{person} - {hinario}.json"
            with open(filename, 'w', encoding='utf-8') as outfile:
                outfile.write(hinario_json)
