import $ from 'jquery'
import { setupAuth } from './auth.js'
import {
  setupUI,
  getWordcloudOptions,
  hideLoading,
  downloadCanvasPng,
  downloadFrequencyCsv
} from './ui.js'
import { plotWordcloud } from './wordcloud.js'
import {
  collectTokenSet,
  computeCorpusStats,
  updateCorpusStats,
  updateStats,
  updateSimilarHinarios,
  computeCorpusComparison,
  updateCorpusComparison,
  updateTopWords
} from './stats.js'
import { computeAuthorSets, drawAuthorNetwork, highlightAuthor } from './network.js'
import { showConcordance } from './concordance.js'

window.jQuery = $

let hinarios = []
let hinarioSets = []
let corpusStats
let authorSets
let currentIndex = 0
let currentList = []

const currentHinario = () => hinarios[currentIndex]

function openWord (word, count) {
  const hinario = currentHinario()
  if (hinario) showConcordance(word, count, hinario)
}

function updateWordcloud () {
  const hinario = currentHinario()
  if (!hinario) return
  currentList = plotWordcloud(hinario, getWordcloudOptions(), openWord)
  updateTopWords(currentList, openWord)
}

function selectHinario (index, { scroll = false } = {}) {
  if (!hinarios[index]) return
  currentIndex = index
  $('#mselect').val(String(index))

  const hinario = currentHinario()
  updateWordcloud()
  updateStats(hinario)
  updateSimilarHinarios(index, hinarioSets, hinarios, i =>
    selectHinario(i, { scroll: true })
  )
  highlightAuthor(hinario.person)
  if (corpusStats) updateCorpusComparison(computeCorpusComparison(hinario, corpusStats))

  if (scroll) {
    document.getElementById('selectedHymnal').scrollIntoView({ behavior: 'smooth' })
  }
}

setupUI({
  onControlsChange: updateWordcloud,
  onThemeChange: () => {
    updateWordcloud()
    if (authorSets) drawAuthorNetwork(authorSets)
  }
})

setupAuth()

/** Build the searchable hymnal picker. */
function buildPicker () {
  const div = $('#selectDiv').empty()

  $('<label/>', { for: 'mselect' }).text('Hymnal').appendTo(div)
  const select = $('<select/>', { id: 'mselect' })
    .attr('title', 'Select a hymnal to analyse')
    .appendTo(div)
    .on('change', e => selectHinario(Number(e.currentTarget.value)))

  $('<input/>', {
    id: 'hymnalSearch',
    type: 'search',
    placeholder: 'Filter by title or author…',
    'aria-label': 'Filter hymnals by title or author'
  })
    .appendTo(div)
    .on('input', e => {
      const q = e.currentTarget.value.trim().toLowerCase()
      let firstMatch = -1
      select.children('option').each(function () {
        const option = $(this)
        const hit = !q || option.data('search').includes(q)
        option.prop('hidden', !hit)
        if (hit && firstMatch === -1) firstMatch = Number(option.val())
      })
      // Keep the select showing something valid as the list narrows.
      if (firstMatch !== -1 && select.children('option:selected').prop('hidden')) {
        selectHinario(firstMatch)
      }
    })

  hinarios.forEach((h, i) => {
    $('<option/>')
      .val(i)
      .text(`${h.title} — ${h.person}`)
      .data('search', `${h.title} ${h.person}`.toLowerCase())
      .appendTo(select)
  })

  return select
}

function showLoadError (message) {
  $('#loading').removeClass('is-hidden').find('.loading-inner').html('')
  $('<p/>', { class: 'loading-text' }).text(message).appendTo('#loading .loading-inner')
}

fetch('hinos/corpus.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })
  .then(data => {
    hinarios = data.hinarios || []
    if (!hinarios.length) {
      showLoadError('The corpus is empty. Run `npm run build` to regenerate it.')
      return
    }

    hinarioSets = hinarios.map(collectTokenSet)
    corpusStats = computeCorpusStats(hinarios)
    authorSets = computeAuthorSets(hinarios)
    updateCorpusStats(corpusStats)

    buildPicker()

    const redrawNetwork = () => drawAuthorNetwork(authorSets)
    document.addEventListener('fullscreenchange', redrawNetwork)

    // Debounce resize so dragging a window edge does not re-run the simulation
    // on every frame.
    let resizeTimer
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        redrawNetwork()
        updateWordcloud()
      }, 250)
    })

    $('#jaccardThreshold').on('input', e =>
      $('#thresholdValue').text(Number(e.currentTarget.value).toFixed(2))
    )
    $('#jaccardThreshold').on('change', redrawNetwork)

    $('#downloadCloud').on('click', () => downloadCanvasPng(currentHinario()))
    $('#downloadCsv').on('click', () => downloadFrequencyCsv(currentHinario(), currentList))

    redrawNetwork()
    selectHinario(0)
    hideLoading()
  })
  .catch(err => {
    console.error('Could not load the corpus:', err)
    showLoadError('Could not load the corpus. Please refresh to try again.')
  })
