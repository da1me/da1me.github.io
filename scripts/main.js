console.log('scripts/main.js being executed YAUIASHUDAS')
const $ = require('jquery')
const WordCloud = require('wordcloud')
window.jQuery = $
let hinarioSets = []

// load the JSON file from the hymns
// plot hymn words according to the selected hymn
$.getJSON('hinos/td.json', function (data) {
  $('<label/>', { for: 'mselect' }).html('select hymnal: ').appendTo('#selectDiv')
  const s = $('<select/>', { id: 'mselect' }).appendTo('#selectDiv')
    .attr('title', 'Select hymn to analyze.')
    .on('change', aself => {
      console.log('hymn changed', aself)
      const ii = aself.currentTarget.value
      console.log({ ii })
      if (ii === '-1') {
        return
      }
      const e = data.hinarios[ii]
      console.log({ e, data })
      // fazer análise da:
      // pessoa
      // hinário
      // cada hino
      plotWordcloud(e)
      updateSimilarHinarios(Number(ii))
    })

  // const cd = $('<div/>', { id: 'contentDiv' }).appendTo('body')
  // $('<canvas/>', { id: 'contentCanvas', width: '1000' }).appendTo(cd)

  window.adata = data
  hinarioSets = data.hinarios.map(h => collectTokenSet(h))
  data.hinarios.forEach((i, count) => {
    const aname = `${i.title} - ${i.person}`
    s.append($('<option/>', { class: 'pres' }).val(count).html(aname))
    $('#loading').hide()
  })
  plotWordcloud(data.hinarios[0])
  updateSimilarHinarios(0)
})

function plotWordcloud (hinario) {
  function getTokens (tokens) {
    if ('pt' in tokens) {
      return tokens.pt
    }
    return []
  }
  const tokens = hinario.hinos.reduce((a, h) => [...a, ...getTokens(h.tokens)], [])
  console.log({ tokens })
  window.tt = tokens
  const tokensLower = tokens.map(t => t.toLowerCase())
  const tokensSet = [...new Set(tokensLower)].filter(t => !stopWords_.includes(t))
  const tokensHist = tokensSet.map(t => {
    const count = tokensLower.filter(tt => t === tt).length
    return { t, count }
  })
  tokensHist.sort((a, b) => a.count > b.count ? -1 : 1)
  // const items = tokensHist.map((t, i) => {
  //   return `<li>(${i}) ${t.t} - ${t.count}x</li>`
  // })
  // $('<ul/>', {
  //   class: 'my-new-list',
  //   html: items.join('')
  // }).appendTo('#contentDiv')
  const list = tokensHist.map(i => [i.t, i.count])
  WordCloud(document.getElementById('contentCanvas'), { list, weightFactor: 100 / tokensHist[0].count })

  window.th = { tokensHist, list }
}

const stopWords = [
  'a',
  'à',
  'ao',
  'aos',
  'aquela',
  'aquelas',
  'aquele',
  'aqueles',
  'aquilo',
  'as',
  'às',
  'até',
  'com',
  'como',
  'da',
  'das',
  'de',
  'dela',
  'delas',
  'dele',
  'deles',
  'depois',
  'do',
  'dos',
  'e',
  'é',
  'ela',
  'elas',
  'ele',
  'eles',
  'em',
  'entre',
  'era',
  'eram',
  'éramos',
  'essa',
  'essas',
  'esse',
  'esses',
  'esta',
  'está',
  'estamos',
  'estão',
  'estar',
  'estas',
  'estava',
  'estavam',
  'estávamos',
  'este',
  'esteja',
  'estejam',
  'estejamos',
  'estes',
  'esteve',
  'estive',
  'estivemos',
  'estiver',
  'estivera',
  'estiveram',
  'estivéramos',
  'estiverem',
  'estivermos',
  'estivesse',
  'estivessem',
  'estivéssemos',
  'estou',
  'eu',
  'foi',
  'fomos',
  'for',
  'fora',
  'foram',
  'fôramos',
  'forem',
  'formos',
  'fosse',
  'fossem',
  'fôssemos',
  'fui',
  'há',
  'haja',
  'hajam',
  'hajamos',
  'hão',
  'havemos',
  'haver',
  'hei',
  'houve',
  'houvemos',
  'houver',
  'houvera',
  'houverá',
  'houveram',
  'houvéramos',
  'houverão',
  'houverei',
  'houverem',
  'houveremos',
  'houveria',
  'houveriam',
  'houveríamos',
  'houvermos',
  'houvesse',
  'houvessem',
  'houvéssemos',
  'isso',
  'isto',
  'já',
  'lhe',
  'lhes',
  'mais',
  'mas',
  'me',
  'mesmo',
  'meu',
  'meus',
  'minha',
  'minhas',
  'muito',
  'na',
  'não',
  'nas',
  'nem',
  'no',
  'nos',
  'nós',
  'nossa',
  'nossas',
  'nosso',
  'nossos',
  'num',
  'numa',
  'o',
  'os',
  'ou',
  'para',
  'pela',
  'pelas',
  'pelo',
  'pelos',
  'por',
  'qual',
  'quando',
  'que',
  'quem',
  'são',
  'se',
  'seja',
  'sejam',
  'sejamos',
  'sem',
  'ser',
  'será',
  'serão',
  'serei',
  'seremos',
  'seria',
  'seriam',
  'seríamos',
  'seu',
  'seus',
  'só',
  'somos',
  'sou',
  'sua',
  'suas',
  'também',
  'te',
  'tem',
  'tém',
  'temos',
  'tenha',
  'tenham',
  'tenhamos',
  'tenho',
  'terá',
  'terão',
  'terei',
  'teremos',
  'teria',
  'teriam',
  'teríamos',
  'teu',
  'teus',
  'teve',
  'tinha',
  'tinham',
  'tínhamos',
  'tive',
  'tivemos',
  'tiver',
  'tivera',
  'tiveram',
  'tivéramos',
  'tiverem',
  'tivermos',
  'tivesse',
  'tivessem',
  'tivéssemos',
  'tu',
  'tua',
  'tuas',
  'um',
  'uma',
  'você',
  'vocês',
  'vos'
]

const punct = [
  ',',
  '"',
  "'",
  '.',
  '!'
]

const stopWords_ = [...stopWords, ...punct]

function collectTokenSet (hinario) {
  const tokens = hinario.hinos.reduce((a, h) => {
    if (h.tokens && h.tokens.pt) return [...a, ...h.tokens.pt]
    return a
  }, [])
  const lower = tokens.map(t => t.toLowerCase())
  return new Set(lower.filter(t => !stopWords_.includes(t)))
}

function jaccard (setA, setB) {
  const inter = [...setA].filter(x => setB.has(x))
  const union = new Set([...setA, ...setB])
  return inter.length / union.size
}

function updateSimilarHinarios (index) {
  const base = hinarioSets[index]
  const sims = hinarioSets.map((set, i) => {
    if (i === index) return null
    return { i, s: jaccard(base, set) }
  }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 3)
  const div = $('#similarDiv').empty()
  $('<h3/>').text('Similar Hymnals').appendTo(div)
  const ul = $('<ul/>').appendTo(div)
  sims.forEach(m => {
    const h = window.adata.hinarios[m.i]
    const label = `${h.title} - ${h.person} (${m.s.toFixed(2)})`
    $('<li/>').text(label).appendTo(ul)
  })
}
