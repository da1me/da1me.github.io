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

export function collectTokenSet (hinario) {
  const tokens = hinario.hinos.reduce((a, h) => {
    if (h.tokens && h.tokens.pt) return [...a, ...h.tokens.pt]
    return a
  }, [])
  const lower = tokens.map(t => t.toLowerCase())
  return new Set(lower.filter(t => !stopWords_.includes(t)))
}

export function jaccard (setA, setB) {
  const union = new Set([...setA, ...setB])
  if (union.size === 0) return 0
  const inter = [...setA].filter(x => setB.has(x))
  return inter.length / union.size
}

export function computeStats (hinario) {
  const hymnTokenCounts = hinario.hinos.map(h => {
    if (h.tokens && h.tokens.pt) return h.tokens.pt.length
    return 0
  })
  const tokens = hinario.hinos.reduce((a, h) => {
    if (h.tokens && h.tokens.pt) return [...a, ...h.tokens.pt]
    return a
  }, [])
  const hymnsCount = hinario.hinos.length
  const tokenCount = tokens.length
  const uniqueTokens = new Set(tokens.map(t => t.toLowerCase()))
  const avgTokensPerHymn = hymnsCount ? tokenCount / hymnsCount : 0
  const uniqueTokenRatio = tokenCount ? uniqueTokens.size / tokenCount : 0
  const longestHymn = hymnTokenCounts.length ? Math.max(...hymnTokenCounts) : 0
  const shortestHymn = hymnTokenCounts.length ? Math.min(...hymnTokenCounts) : 0
  return {
    hymnsCount,
    tokenCount,
    uniqueTokens: uniqueTokens.size,
    avgTokensPerHymn,
    uniqueTokenRatio,
    longestHymn,
    shortestHymn
  }
}

export function updateStats (hinario) {
  const stats = computeStats(hinario)
  const div = $('#statsDiv').empty()
  $('<h3/>').text('Hymnal Stats').appendTo(div)
  const ul = $('<ul/>').appendTo(div)
  $('<li/>').text(`Hymns: ${stats.hymnsCount}`).appendTo(ul)
  $('<li/>').text(`Total words: ${stats.tokenCount}`).appendTo(ul)
  $('<li/>').text(`Unique words: ${stats.uniqueTokens}`).appendTo(ul)
  $('<li/>').text(`Avg words/hymn: ${stats.avgTokensPerHymn.toFixed(2)}`).appendTo(ul)
  $('<li/>').text(`Unique/word ratio: ${stats.uniqueTokenRatio.toFixed(2)}`).appendTo(ul)
  $('<li/>').text(`Longest hymn: ${stats.longestHymn} words`).appendTo(ul)
  $('<li/>').text(`Shortest hymn: ${stats.shortestHymn} words`).appendTo(ul)
}

export function computeCorpusStats (hinarios) {
  const hymnalCount = hinarios.length
  const hymns = hinarios.reduce((acc, h) => acc + h.hinos.length, 0)
  const tokens = hinarios.reduce((a, h) => {
    return [...a, ...h.hinos.reduce((x, hi) => {
      if (hi.tokens && hi.tokens.pt) return [...x, ...hi.tokens.pt]
      return x
    }, [])]
  }, [])
  const tokenCount = tokens.length
  const uniqueTokens = new Set(tokens.map(t => t.toLowerCase()).filter(t => !stopWords_.includes(t))).size
  return { hymnalCount, hymns, tokenCount, uniqueTokens }
}

export function updateCorpusStats (stats) {
  const div = $('#corpusStats').empty()
  $('<h3/>').text('Corpus Stats').appendTo(div)
  const ul = $('<ul/>').appendTo(div)
  $('<li/>').text(`Hymnals: ${stats.hymnalCount}`).appendTo(ul)
  $('<li/>').text(`Hymns: ${stats.hymns}`).appendTo(ul)
  $('<li/>').text(`Total words: ${stats.tokenCount}`).appendTo(ul)
  $('<li/>').text(`Unique words: ${stats.uniqueTokens}`).appendTo(ul)
}

export function updateSimilarHinarios (index, hinarioSets, hinarios) {
  const base = hinarioSets[index]
  const sims = hinarioSets.map((set, i) => {
    if (i === index) return null
    return { i, s: jaccard(base, set) }
  }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 3)
  const div = $('#similarDiv').empty()
  $('<h3/>').text('Similar Hymnals').appendTo(div)
  const ul = $('<ul/>').appendTo(div)
  sims.forEach(m => {
    const h = hinarios[m.i]
    const label = `${h.title} - ${h.person} (${m.s.toFixed(2)})`
    $('<li/>').text(label).appendTo(ul)
  })
}
