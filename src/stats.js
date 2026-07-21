import $ from 'jquery'

export const stopWords = [
  'a', 'à', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo',
  'as', 'às', 'até', 'com', 'como', 'da', 'das', 'de', 'dela', 'delas', 'dele',
  'deles', 'depois', 'do', 'dos', 'e', 'é', 'ela', 'elas', 'ele', 'eles', 'em',
  'entre', 'era', 'eram', 'éramos', 'essa', 'essas', 'esse', 'esses', 'esta',
  'está', 'estamos', 'estão', 'estar', 'estas', 'estava', 'estavam', 'estávamos',
  'este', 'esteja', 'estejam', 'estejamos', 'estes', 'esteve', 'estive',
  'estivemos', 'estiver', 'estivera', 'estiveram', 'estivéramos', 'estiverem',
  'estivermos', 'estivesse', 'estivessem', 'estivéssemos', 'estou', 'eu', 'foi',
  'fomos', 'for', 'fora', 'foram', 'fôramos', 'forem', 'formos', 'fosse',
  'fossem', 'fôssemos', 'fui', 'há', 'haja', 'hajam', 'hajamos', 'hão',
  'havemos', 'haver', 'hei', 'houve', 'houvemos', 'houver', 'houvera',
  'houverá', 'houveram', 'houvéramos', 'houverão', 'houverei', 'houverem',
  'houveremos', 'houveria', 'houveriam', 'houveríamos', 'houvermos', 'houvesse',
  'houvessem', 'houvéssemos', 'isso', 'isto', 'já', 'lhe', 'lhes', 'mais', 'mas',
  'me', 'mesmo', 'meu', 'meus', 'minha', 'minhas', 'muito', 'na', 'não', 'nas',
  'nem', 'no', 'nos', 'nós', 'nossa', 'nossas', 'nosso', 'nossos', 'num', 'numa',
  'o', 'os', 'ou', 'para', 'pela', 'pelas', 'pelo', 'pelos', 'por', 'qual',
  'quando', 'que', 'quem', 'são', 'se', 'seja', 'sejam', 'sejamos', 'sem', 'ser',
  'será', 'serão', 'serei', 'seremos', 'seria', 'seriam', 'seríamos', 'seu',
  'seus', 'só', 'somos', 'sou', 'sua', 'suas', 'também', 'te', 'tem', 'tém',
  'temos', 'tenha', 'tenham', 'tenhamos', 'tenho', 'terá', 'terão', 'terei',
  'teremos', 'teria', 'teriam', 'teríamos', 'teu', 'teus', 'teve', 'tinha',
  'tinham', 'tínhamos', 'tive', 'tivemos', 'tiver', 'tivera', 'tiveram',
  'tivéramos', 'tiverem', 'tivermos', 'tivesse', 'tivessem', 'tivéssemos', 'tu',
  'tua', 'tuas', 'um', 'uma', 'você', 'vocês', 'vos'
]

export const punct = [',', '"', "'", '.', '!']
export const stopWords_ = [...stopWords, ...punct]

const stopWordSet = new Set(stopWords_)

const nf = new Intl.NumberFormat('en-US')
const fmt = n => nf.format(Math.round(n))

/** Every content word in a hymnal, lower-cased, stop words removed. */
export function collectTokenSet (hinario) {
  const set = new Set()
  hinario.hinos.forEach(h => {
    const tokens = (h.tokens && h.tokens.pt) || []
    tokens.forEach(t => {
      const lower = t.toLowerCase()
      if (!stopWordSet.has(lower)) set.add(lower)
    })
  })
  return set
}

export function jaccard (setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0
  // Walk the smaller set and derive the union from sizes, so neither the
  // intersection nor the union needs to be materialised.
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA]
  let inter = 0
  small.forEach(x => {
    if (large.has(x)) inter += 1
  })
  return inter / (setA.size + setB.size - inter)
}

export function computeStats (hinario) {
  const hymnTokenCounts = hinario.hinos.map(h =>
    h.tokens && h.tokens.pt ? h.tokens.pt.length : 0
  )
  const uniqueTokens = new Set()
  let tokenCount = 0
  hinario.hinos.forEach(h => {
    const tokens = (h.tokens && h.tokens.pt) || []
    tokenCount += tokens.length
    tokens.forEach(t => uniqueTokens.add(t.toLowerCase()))
  })

  const hymnsCount = hinario.hinos.length
  return {
    hymnsCount,
    tokenCount,
    uniqueTokens: uniqueTokens.size,
    avgTokensPerHymn: hymnsCount ? tokenCount / hymnsCount : 0,
    uniqueTokenRatio: tokenCount ? uniqueTokens.size / tokenCount : 0,
    longestHymn: hymnTokenCounts.length ? Math.max(...hymnTokenCounts) : 0,
    shortestHymn: hymnTokenCounts.length ? Math.min(...hymnTokenCounts) : 0
  }
}

function statList (div, rows) {
  const ul = $('<ul/>', { class: 'stat-list' }).appendTo(div)
  rows.forEach(([key, value]) => {
    const li = $('<li/>').appendTo(ul)
    $('<span/>', { class: 'stat-key' }).text(key).appendTo(li)
    $('<span/>', { class: 'stat-val' }).text(value).appendTo(li)
  })
  return ul
}

export function updateStats (hinario) {
  const stats = computeStats(hinario)
  const div = $('#statsDiv').empty()
  $('<h3/>').text('Hymnal stats').appendTo(div)
  statList(div, [
    ['Hymns', fmt(stats.hymnsCount)],
    ['Total words', fmt(stats.tokenCount)],
    ['Unique words', fmt(stats.uniqueTokens)],
    ['Avg words / hymn', stats.avgTokensPerHymn.toFixed(1)],
    ['Lexical diversity', stats.uniqueTokenRatio.toFixed(2)],
    ['Longest hymn', `${fmt(stats.longestHymn)} w`],
    ['Shortest hymn', `${fmt(stats.shortestHymn)} w`]
  ])
  $('<p/>', { class: 'card-note' })
    .text('Lexical diversity is unique words divided by total words — higher means less repetition.')
    .appendTo(div)
}

export function computeCorpusStats (hinarios) {
  const uniqueTokens = new Set()
  let tokenCount = 0
  let hymns = 0
  const authors = new Set()

  hinarios.forEach(h => {
    authors.add(h.person)
    hymns += h.hinos.length
    h.hinos.forEach(hi => {
      const tokens = (hi.tokens && hi.tokens.pt) || []
      tokenCount += tokens.length
      tokens.forEach(t => {
        const lower = t.toLowerCase()
        if (!stopWordSet.has(lower)) uniqueTokens.add(lower)
      })
    })
  })

  return {
    hymnalCount: hinarios.length,
    authorCount: authors.size,
    hymns,
    tokenCount,
    uniqueTokens: uniqueTokens.size
  }
}

export function updateCorpusStats (stats) {
  const div = $('#corpusStats').empty()
  $('<h3/>').text('Corpus stats').appendTo(div)
  statList(div, [
    ['Hymnals', fmt(stats.hymnalCount)],
    ['Authors', fmt(stats.authorCount)],
    ['Hymns', fmt(stats.hymns)],
    ['Total words', fmt(stats.tokenCount)],
    ['Unique words', fmt(stats.uniqueTokens)]
  ])
}

/**
 * Render the three closest hymnals. `onSelect(index)` makes each row clickable.
 */
export function updateSimilarHinarios (index, hinarioSets, hinarios, onSelect) {
  const base = hinarioSets[index]
  const sims = hinarioSets
    .map((set, i) => (i === index ? null : { i, s: jaccard(base, set) }))
    .filter(Boolean)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)

  const div = $('#similarDiv').empty()
  $('<h3/>').text('Closest hymnals').appendTo(div)

  if (!sims.length) {
    $('<p/>', { class: 'card-note' }).text('No comparable hymnals.').appendTo(div)
    return
  }

  const ul = $('<ul/>', { class: 'sim-list' }).appendTo(div)
  const top = sims[0].s || 1
  sims.forEach(m => {
    const h = hinarios[m.i]
    const li = $('<li/>').appendTo(ul)
    const btn = $('<button/>', {
      class: 'sim-item',
      type: 'button',
      title: `Open ${h.title}`
    }).appendTo(li)
    $('<span/>', { class: 'sim-title' }).text(h.title).appendTo(btn)
    $('<span/>', { class: 'sim-author' }).text(h.person).appendTo(btn)
    const meta = $('<span/>', { class: 'sim-meta' }).appendTo(btn)
    const bar = $('<span/>', { class: 'sim-bar' }).appendTo(meta)
    $('<span/>').css('width', `${Math.max((m.s / top) * 100, 4)}%`).appendTo(bar)
    $('<span/>', { class: 'sim-score' }).text(m.s.toFixed(2)).appendTo(meta)
    if (onSelect) btn.on('click', () => onSelect(m.i))
  })

  $('<p/>', { class: 'card-note' })
    .text('Jaccard similarity over shared content words. Click to open a hymnal.')
    .appendTo(div)
}

export function computeCorpusComparison (hinario, corpusStats) {
  const hStats = computeStats(hinario)
  return {
    hymnsShare: corpusStats.hymns ? hStats.hymnsCount / corpusStats.hymns : 0,
    tokenShare: corpusStats.tokenCount ? hStats.tokenCount / corpusStats.tokenCount : 0,
    uniqueShare: corpusStats.uniqueTokens ? hStats.uniqueTokens / corpusStats.uniqueTokens : 0
  }
}

export function updateCorpusComparison (stats) {
  const div = $('#corpusComparison').empty()
  $('<h3/>').text('Share of corpus').appendTo(div)
  const ul = $('<ul/>', { class: 'share-list' }).appendTo(div)

  const rows = [
    ['Hymns', stats.hymnsShare],
    ['Words', stats.tokenShare],
    ['Unique words', stats.uniqueShare]
  ]
  // Bars are scaled to the largest of the three so small shares stay readable.
  const top = Math.max(...rows.map(r => r[1]), 0.0001)

  rows.forEach(([key, value]) => {
    const li = $('<li/>').appendTo(ul)
    const head = $('<div/>', { class: 'share-head' }).appendTo(li)
    $('<span/>', { class: 'share-key' }).text(key).appendTo(head)
    $('<span/>', { class: 'share-val' }).text(`${(value * 100).toFixed(1)}%`).appendTo(head)
    const bar = $('<div/>', { class: 'share-bar' }).appendTo(li)
    $('<span/>').css('width', `${(value / top) * 100}%`).appendTo(bar)
  })

  $('<p/>', { class: 'card-note' })
    .text('How much of the whole collection this one hymnal accounts for. Bars are scaled to the largest of the three.')
    .appendTo(div)
}

/**
 * Ranked word-frequency bars. `onSelect(word, count)` makes rows clickable.
 */
export function updateTopWords (list, onSelect) {
  const div = $('#topWordsDiv').empty()
  $('<h3/>').text('Most frequent words').appendTo(div)

  const top = list.slice(0, 10)
  if (!top.length) {
    $('<p/>', { class: 'card-note' }).text('No words to show.').appendTo(div)
    return
  }

  const max = top[0][1]
  const ul = $('<ul/>', { class: 'bar-list' }).appendTo(div)
  top.forEach(([word, count], i) => {
    const li = $('<li/>').appendTo(ul)
    const row = $('<button/>', {
      class: 'bar-row',
      type: 'button',
      title: `Read the lines containing “${word}”`
    }).appendTo(li)
    $('<span/>', { class: 'bar-rank' }).text(i + 1).appendTo(row)
    const track = $('<span/>', { class: 'bar-track' }).appendTo(row)
    $('<span/>', { class: 'bar-fill' })
      .css('width', `${Math.max((count / max) * 100, 6)}%`)
      .appendTo(track)
    $('<span/>', { class: 'bar-word' }).text(word).appendTo(track)
    $('<span/>', { class: 'bar-count' }).text(fmt(count)).appendTo(row)
    if (onSelect) row.on('click', () => onSelect(word, count))
  })
}
