## run with python3.11 -m IPython
import requests
from bs4 import BeautifulSoup
import nltk as k
import os

base_url = 'https://nossairmandade.com'
hymn_path = '/hinarios/individual'  # Add other paths if needed
hymn_dir = 'hinos'
response = requests.get(base_url + hymn_path)

soup = BeautifulSoup(response.content, 'html.parser')
# hymns = soup.find_all('li')  # Adjust this based on the actual page structure
# donos = soup.find_all('div', 'inline-content big-spacing small-text bigbig darklinks')  # Adjust this based on the actual page structure
# donos_ = [i.get_text().strip() for i in donos]


donos2 = soup.find_all('div', 'col-md-7')  # parece ter 1 a mais

donos = {}
achados = []
for num, dono in enumerate(donos2):
    # hinarios_nomes = dono.find_all('span', 'nossa-blue')[0].get_text().strip()
    try:
        nome = dono.find_all('a')[0].get_text()

        a_ = dono.find_all('h4')
        for i in a_:
            a = i.a
            link = a['href']
            hinario = a.get_text().strip()
            print(nome, hinario, link)
            achados.append((nome, hinario, link))
    except:
        print('exception', num)
        pass

achados_ = [i for i in achados if i[0] != 'Jump to list of individuals']
achados_.pop(3)  # o mestre diz, é uma gravação

hinarios = {}
for a in achados_[:10]:
    r = requests.get(a[2])
    s = BeautifulSoup(r.content, 'html.parser')
    hinos = s.find_all('div', 'hymn-list-name')  # parece ter 1 a mais
    hinos_ = []
    HINOS = {}
    count = 0
    for h in hinos[:1]:
        nome = h.get_text().strip()
        link = h.a['href']
        hinos_.append((nome, link))
        r2 = requests.get(link)
        s2 = BeautifulSoup(r2.content, 'html.parser')
        title = s2.find_all('div', 'hymn-title')[0].get_text().strip()
        # assert(title == nome)
        # ===> title mais limpo que nome
        estrofes = s2.find_all('div', 'hymnstanza')
        HINO = dict(tokens=[], versos=[])
        for e in estrofes:
            repeticoes = e.find_all('div', 'hymn-words')
            for r in repeticoes:
                versos = r.get_text().strip().split('<br>')
                HINO['versos'].extend(versos)
                for verso in versos:
                    tokens = k.word_tokenize(verso)
                    HINO['tokens'].extend(tokens)
        HINOS[h] = HINO
        print(count)
        count += 1
    hinarios[a] = HINOS




