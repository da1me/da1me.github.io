import requests
from bs4 import BeautifulSoup
import nltk as k
import os

base_url = 'https://nossairmandade.com'
hymn_path = '/hinarios/individual'  # Add other paths if needed
hymn_dir = 'hinos'  # folder were text files will be written
response = requests.get(base_url + hymn_path)

soup = BeautifulSoup(response.content, 'html.parser')
donos2 = soup.find_all('div', 'col-md-7')  # parece ter 1 a mais

donos = {}  # hymn "owner", the person who "received" it
achados = []  # found hymnals
for num, dono in enumerate(donos2):  # finding owners and her hymnals
    try:
        nome = dono.find_all('a')[0].get_text()
        if nome == 'Jump to list of individuals':
            continue
        # TODO: check that dono is unique in donos2
        if nome in donos:
            raise Exception('FIXME: A hymnal owner is being overwritten')
        donos[nome] = {}

        a_ = dono.find_all('h4')
        for i in a_:
            a = i.a
            link = a['href']
            hinario = a.get_text().strip()
            print(nome, hinario, link)
            achados.append((nome, hinario, link))  # useful for debugging / developing
            donos[nome][hinario] = { 'link': link, 'hymns': [] }  # useful for reaching final text files
    except:
        print('something went bad with donos2 item in index:', num)

# check donos dictionary is as expected
for dono in donos:
    for hinario in donos[dono]:
        link = hinario['link']
        r = requests.get(link)
        s = BeautifulSoup(r.content, 'html.parser')

        hinos = s.find_all('div', 'hymn-list-name')  # parece ter 1 a mais
        hinos_ = []
        HINOS = {}
        count = 0
        for h in hinos[:1]:
            nome = h.get_text().strip()
            link = h.a['href']

            hinos_.append((nome, link))

            # finally opening an hymn:
            r2 = requests.get(link)
            s2 = BeautifulSoup(r2.content, 'html.parser')
            title = s2.find_all('div', 'hymn-title')[0].get_text().strip()

            # maybe assert(title == nome) ??
            # ===> title parece mais limpo que nome
            estrofes = s2.find_all('div', 'hymnstanza')
            HINO = dict(tokens=[], versos=[], title=title)
            for e in estrofes:
                repeticoes = e.find_all('div', 'hymn-words')
                for r in repeticoes:
                    versos = r.get_text().strip().split('<br>')
                    HINO['versos'].extend(versos)
                    for verso in versos:
                        tokens = k.word_tokenize(verso)
                        HINO['tokens'].extend(tokens)
            HINOS[h] = HINO
            hinario['hymns'].append(HINO)
            print(count)
            count += 1
        hinarios[a] = HINOS

# qua manca:
# capire se donos dict finisce con una buona struttura di dato
# scrivere tutto come un solo file JSON, dopo apriamo questo JSON
# sia in JS per la webpage, che in Python per analisi numeriche e locali

# se possibile:
# pulire lo script, mi sembra che ci sono degli oggetti non necessari.
# scrivere tutto in inglese o italiano o portoghese. Preferisco l'italiano
# capire se possiamo rimouvere lo script di sotto:

######## cancellare?
# achados_ = [i for i in achados if i[0] != 'Jump to list of individuals']
# achados_.pop(3)  # o mestre diz, é uma gravação
# 
# hinarios = {}
# for a in achados_[:10]:
#     r = requests.get(a[2])
#     s = BeautifulSoup(r.content, 'html.parser')
#     hinos = s.find_all('div', 'hymn-list-name')  # parece ter 1 a mais
#     hinos_ = []
#     HINOS = {}
#     count = 0
#     for h in hinos[:1]:
#         nome = h.get_text().strip()
#         link = h.a['href']
#         hinos_.append((nome, link))
#         r2 = requests.get(link)
#         s2 = BeautifulSoup(r2.content, 'html.parser')
#         title = s2.find_all('div', 'hymn-title')[0].get_text().strip()
#         # assert(title == nome)
#         # ===> title mais limpo que nome
#         estrofes = s2.find_all('div', 'hymnstanza')
#         HINO = dict(tokens=[], versos=[])
#         for e in estrofes:
#             repeticoes = e.find_all('div', 'hymn-words')
#             for r in repeticoes:
#                 versos = r.get_text().strip().split('<br>')
#                 HINO['versos'].extend(versos)
#                 for verso in versos:
#                     tokens = k.word_tokenize(verso)
#                     HINO['tokens'].extend(tokens)
#         HINOS[h] = HINO
#         print(count)
#         count += 1
#     hinarios[a] = HINOS
# 
# # qua manca:
######
