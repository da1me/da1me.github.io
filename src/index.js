import $ from 'jquery'
import { setupUI, getWordcloudOptions } from './ui.js'
import { plotWordcloud } from './wordcloud.js'
import {
  collectTokenSet,
  computeCorpusStats,
  updateCorpusStats,
  updateStats,
  updateSimilarHinarios
} from './stats.js'
import { computeAuthorSets, drawAuthorNetwork } from './network.js'

window.jQuery = $

let currentHinario
function updateWordcloud () {
  if (!currentHinario) return
  plotWordcloud(currentHinario, getWordcloudOptions())
}

setupUI(updateWordcloud)

let hinarioSets = []
let corpusStats
let authorSets

$.getJSON('hinos/td.json', function (data) {
  // drop hymnals that lack tokens or have the unwanted title
  data.hinarios = data.hinarios.filter(h => {
    if (h.title === 'O Mestre Diz') return false
    return h.hinos.some(hi => hi.tokens && hi.tokens.pt && hi.tokens.pt.length)
  })
  $('<label/>', { for: 'mselect' }).html('select hymnal: ').appendTo('#selectDiv')
  const s = $('<select/>', { id: 'mselect' }).appendTo('#selectDiv')
    .attr('title', 'Select hymn to analyze.')
    .on('change', aself => {
      const ii = aself.currentTarget.value
      if (ii === '-1') return
      currentHinario = data.hinarios[ii]
      updateWordcloud()
      updateSimilarHinarios(Number(ii), hinarioSets, data.hinarios)
      updateStats(currentHinario)
    })

  window.adata = data
  hinarioSets = data.hinarios.map(h => collectTokenSet(h))
  corpusStats = computeCorpusStats(data.hinarios)
  authorSets = computeAuthorSets(data.hinarios)
  updateCorpusStats(corpusStats)
  drawAuthorNetwork(authorSets)
  data.hinarios.forEach((i, count) => {
    const aname = `${i.title} - ${i.person}`
    s.append($('<option/>', { class: 'pres' }).val(count).html(aname))
    $('#loading').hide()
  })
  currentHinario = data.hinarios[0]
  updateWordcloud()
  updateSimilarHinarios(0, hinarioSets, data.hinarios)
  updateStats(currentHinario)
})
