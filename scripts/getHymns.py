""" Script for scraping hymns """

import argparse
import logging
from urllib.parse import urlparse
import re
from pathlib import Path
import json
import requests
from bs4 import BeautifulSoup
from langdetect import detect

SAVE_DIR = 'hinos'


def check_name(name_to_check, list_of_names, separator='_'):
    """
    Controlla che non ci siano omonimi e, in caso affermativo, aggiunge
    un contatore al termine del nome.
    """
    if name_to_check not in list_of_names:
        return name_to_check
    counter = 1
    if len(name_to_check.split(separator)) > 1:
        counter = int(name_to_check.split(separator)[1]) + 1
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

    logging.info('+ %s (%s)', hinario['title'], hinario['person'])

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
        # e il titolo sono informazioni ridondanti.ù

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

        # Se invece viene passato il titolo, per recuperare l'indice corretto
        # è necessario selezionare l'indice relativo all'hinario interessato
        # in quanto lo stesso hino può figurare in più di un hinario.

    else:
        sources_raw = soup.select('.hinario-breadcrumb-hinario')
        for source_raw in sources_raw:
            source = source_raw.get_text().split('#')[0].strip()
            if source == hinario:
                index = source_raw.get_text().split('#')[1].strip()
                break

    # Hino contiene alcuni metadati ('person', 'hinario', 'index', 'title', 'reps_pattern')
    # e 'text' che contiene il testo strutturato:
    # text: {
    #     'pt': [
    #       {
    #           'reps_pattern': [
    #               {
    #                  'from': block_index,
    #                  'to': block_index + block_length - 1,
    #                  'reps': reps
    #              }
    #           ],
    #           'verses': [
    #             'verso 1',
    #             'verso 2,
    #             ...
    #           ]
    #     ],
    #     'en': [
    #       ...
    #     ],
    #     ...
    # }

    hino = {
        'person': soup.select('.breadcrumb li:nth-of-type(1) a')[0].get_text().strip(),
        'hinario': hinario,
        'index': index,
        'title': soup.select('.hymn-title h5')[0].get_text().strip(),
        'text': {}
        }

    logging.info('  - %s. %s', hino['index'], hino['title'])

    # Analizza le singole strofe
    stanzas_raw = soup.select('.hymnstanza:has(.hymn-words)')

    # Qui è memorizzato il pattern della strofa con le barre.
    last_reps_pattern = []

    for stanza_raw in stanzas_raw:

        # Ogni strofa è divisa in uno o più blocchi per via delle ripetizioni.
        # Ogni blocco è contrassegnato dalla classe 'hymn-words'.

        blocks = stanza_raw.select('.hymn-words')
        verses = split_verses(blocks)
        reps_pattern = []

        # Se la strofa non contiene hymn-bar-full signfica o che l'hino non ha
        # un pattern di ripetizione, o che si tratta di una strofa successiva
        # a quella con il pattern, perciò in entrambi i casi possiamo impostarlo
        # sull'ultimo.

        if len(stanza_raw.select('[class*=hymn-bar-full]')) == 0:
            if len(last_reps_pattern) == 0:
                last_reps_pattern = [{
                    'from': 1,
                    'to': len(verses),
                    'reps': 1
                }]
            reps_pattern = last_reps_pattern
        else:

            # Bisogna distinguere tra blocchi e barre: a ogni blocco ('.hymn-words')
            # corrisponde una e una sola barra ('.hymn-bar-*'), ma ogni barra può
            # contenere più di un blocco. Dato che le ripetizioni vanno dall'interno
            # verso l'esterno, è necessario avere il numero dei blocchi per partire dal
            # fondo della lista.

            blocks = stanza_raw.select('.hymn-words')
            bars = stanza_raw.select('[class*=hymn-bar-]:not(:has(.hymn-spacer))')

            # Se il numero di barre è uguale a quello dei blocchi, significa che non ci
            # sono barre che coinvolgono più di un blocco e perciò il pattern è piatto,
            # ossia ogni verso compare una sola volta nel pattern e l'ordine di ripetizione
            # corrisponde a quello in cui compaiono gli elementi HTML.
            #
            # Se invece le barre sono più dei blocchi, significa che alcuni versi
            # compariranno in più di una ripetizione. Dato che le ultime ripetizioni
            # compaiono per prime nel DOM, bisogna per prima cosa invertirle considerando
            # il numero di blocchi nella strofa.
            #
            # EDIT: Questo è ciò che pensavo, ma Amigo Velho mi ha fatto capire che il punto
            # non è tanto il numero quanto se uno è multiplo dell'altro.

            if len(bars) % len(blocks) > 0:
                tmp_bars = []
                rev_bars = list(reversed(bars))
                for i in range(0, len(bars), 2):
                    try:
                        tmp_bars.extend([rev_bars[i + 1], rev_bars[i]])
                    except IndexError:
                        tmp_bars.append(rev_bars[i])
                bars = tmp_bars

            reps_pattern = get_reps_pattern(bars, verses)
            last_reps_pattern = reps_pattern

            # A questo punto l'unica cosa che bisogna controllare è che non ci fossero
            # blocchi con la doppia barra, perché in quel caso l'algoritmo registra due
            # ripetizioni da due invece che una ripetizione da quattro o più.  Per fare
            # questo è sufficiente controllare se ci sono dict identici in reps_pattern.
            #
            # Per amor di semplicità, daremo per scontato che in una strofa non esista
            # più di un solo blocco con doppia barra.

            # df = pd.DataFrame(reps_pattern)
            # duplicates = df[df.duplicated(subset=['from', 'to', 'reps'], keep="first")]
            # if not duplicates.empty:
            #     reps = 4


            #     df.at[duplicates.index[0], 'reps_pattern'] = reps
            #     df.drop_duplicates(keep='first')
            #     reps_pattern = df.to_dict(orient='records')

        flat_verses = ' '.join(verses)
        if len(flat_verses) > 0:
            lang = detect(' '.join(verses))
            try:
                hino['text'][lang].append({
                    'reps_pattern': reps_pattern,
                    'verses': verses
                })
            except KeyError:
                hino['text'][lang] = []
                hino['text'][lang].append({
                    'reps_pattern': reps_pattern,
                    'verses': verses
                })

    # Infine controllo se ci sono elementi che meritino un controllo manuale.

    hino = flag_hino(hino)

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

def flag_hino(hino):
    """ Controlla che non ci siano stranezze da controllare a mano. """
    flags = []

    # Per prima cosa elimino le lingue pt e en, che sono le più frequenti. Se
    # resta qualcosa, allora significa che ci potrebbero essere lingue errate.

    lang_hino = dict(hino['text'])
    lang_hino.pop('pt', None)
    lang_hino.pop('en', None)
    if len(lang_hino) > 0:
        flags.append('lang')

    # Infine calcolo la lunghezza delle strofe.  Se sono presenti strofe con un
    # numero differente, è meglio controllare.
    lengths = []
    try:
        for stanza in hino['text']['pt']:
            lengths.append(len(stanza['verses']))
        if any(length != lengths[0] for length in lengths):
            flags.append('length')
    except (IndexError, KeyError):
        flags.append('other')

    if len(flags) > 0:
        hino['flag'] = flags

    return hino

def get_parent_with_class(element, parent_class):
    """ Torna indietro fino a che non ha trovato il genitore con una classe
        specifica e restituisce quell'elemento.
    """
    if parent_class in element.parent.attrs['class']:
        return element.parent
    return get_parent_with_class(element.parent, parent_class)

def get_reps_pattern(bars, verses_list):
    """ Estrare la ripetizione. """
    reps_pattern = []
    for bar in bars:

        # Se un hymn-bar-empty contiene uno o più hymn-bar-, allora è un
        # riempitivo e dobbiamo ignorarlo.

        if (('hymn-bar-empty' in bar.attrs['class']) and
            (len(bar.select('[class*=hymn-bar-]')) > 0)):
            continue

        bar_verses = split_verses(bar.select('.hymn-words'))

        if len(bar_verses) < 1:
            continue

        bar_rep = 0
        bar_index = verses_list.index(bar_verses[0]) + 1
        if 'hymn-bar-empty' in bar.attrs['class']:
            bar_rep = 1
        else:
            bar_rep = 2

        # La voce 'raw' viene inserita per poter, all'occorrenza, recuperare
        # il valore della ripetizione quando è indicata a margine.  Prima che
        # venga salvato nell'hino tutti i 'raw' saranno rimossi.

        reps_pattern.append({
            # 'raw' : bar,
            'from': bar_index,
            'to': bar_index + len(bar_verses) - 1,
            'reps': bar_rep
        })
    return reps_pattern

def split_verses(block_of_text):
    """ Restituisce una lista di versi.
    """
    verses = []
    for block in block_of_text:
        verses.extend(re.sub(' +', ' ', block.get_text().strip()).split('\n'))
    return [verse.strip() for verse in verses if (verse != '') and (verse != '\xa0')]

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
                    catalog = download_catalog(url,
                                               save_hinario=args.save_hinario,
                                               save_hino=args.save_hino
                                               )
                    if args.save_catalog:
                        catalog_json = json.dumps(catalog, indent=4)
                        filename = f"./{SAVE_DIR}/{catalog['title']}.json"
                        with open(filename, 'w', encoding='utf-8') as outfile:
                            outfile.write(catalog_json)
                case 'person':
                    person = download_person(url,
                                             save_hinario=args.save_hinario,
                                             save_hino=args.save_hino
                                             )
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
            logging.error('Non posso lavorare su %s. Vado avanti...', url)
            continue

if __name__ == "__main__":
    main()
