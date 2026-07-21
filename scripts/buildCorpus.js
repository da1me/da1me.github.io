#!/usr/bin/env node
// Derives hinos/corpus.json (tokens only) from the full hinos/td.json scrape.
// The UI only needs tokens to render; verse text is fetched lazily and just for
// the concordance, so shipping it up front costs ~16MB for nothing.
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'hinos', 'td.json')
const target = path.join(root, 'hinos', 'corpus.json')

const data = JSON.parse(fs.readFileSync(source, 'utf8'))

const hinarios = data.hinarios
  .filter(h => h.title !== 'O Mestre Diz')
  .filter(h => h.hinos.some(hi => hi.tokens && hi.tokens.pt && hi.tokens.pt.length))
  .map(h => ({
    person: h.person,
    title: h.title,
    hinos: h.hinos.map(hi => ({
      index: hi.index,
      title: hi.title,
      tokens: { pt: (hi.tokens && hi.tokens.pt) || [] }
    }))
  }))

fs.writeFileSync(target, JSON.stringify({ title: data.title, hinarios }))

const before = fs.statSync(source).size
const after = fs.statSync(target).size
const mb = n => (n / 1048576).toFixed(1) + 'MB'
console.log(`corpus.json: ${mb(before)} -> ${mb(after)} (${hinarios.length} hymnals)`)
