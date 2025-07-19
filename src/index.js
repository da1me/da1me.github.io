import $ from 'jquery'
import { setupUI } from './ui.js'
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

setupUI()

let hinarioSets = []
let corpusStats
let authorSets

$.getJSON('hinos/td.json', function (data) {
  $('<label/>', { for: 'mselect' }).html('select hymnal: ').appendTo('#selectDiv')
  const s = $('<select/>', { id: 'mselect' }).appendTo('#selectDiv')
    .attr('title', 'Select hymn to analyze.')
    .on('change', aself => {
      const ii = aself.currentTarget.value
      if (ii === '-1') return
      const e = data.hinarios[ii]
      plotWordcloud(e)
      updateSimilarHinarios(Number(ii), hinarioSets, data.hinarios)
      updateStats(e)
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
  plotWordcloud(data.hinarios[0])
  updateSimilarHinarios(0, hinarioSets, data.hinarios)
  updateStats(data.hinarios[0])
})
