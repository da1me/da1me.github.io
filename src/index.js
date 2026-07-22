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
import {
  loadUserData,
  hymnalKey,
  isSignedIn,
  isFavorite,
  toggleFavorite,
  getNote,
  saveNote
} from './userdata.js'

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

/** Reflect the current hymnal's saved state in the favourite button and notes. */
function renderUserState () {
  const hinario = currentHinario()
  const signedIn = isSignedIn()

  $('#favoritesOnlyWrap').attr('hidden', !signedIn)
  $('#notesSignedOut').attr('hidden', signedIn)
  $('#notesEditor').attr('hidden', !signedIn)

  const btn = $('#favoriteBtn').prop('disabled', !signedIn)
  if (!signedIn) {
    btn.attr('aria-pressed', 'false').attr('title', 'Sign in to save favourites')
    $('#favoriteLabel').text('Save to favourites')
    $('#favoritesOnly').prop('checked', false)
    return
  }

  const key = hymnalKey(hinario)
  const fav = isFavorite(key)
  btn
    .attr('aria-pressed', String(fav))
    .attr('title', fav ? 'Remove from favourites' : 'Save to favourites')
  $('#favoriteLabel').text(fav ? 'In your favourites' : 'Save to favourites')

  // Do not clobber what the user is mid-way through typing.
  if (!$('#noteText').is(':focus')) $('#noteText').val(getNote(key))
  $('#noteStatus').removeClass('is-error').text('')
}

function selectHinario (index, { scroll = false } = {}) {
  if (!hinarios[index]) return
  currentIndex = index
  $('#mselect').val(String(index))

  const hinario = currentHinario()
  updateWordcloud()
  renderUserState()
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

// Signing in only adds favourites and notes on top of the public corpus, so the
// page never waits on auth before rendering.
setupAuth(user => {
  loadUserData(user).then(() => {
    if (hinarios.length) {
      renderUserState()
      decorateOptions()
      applyPickerFilter()
    }
  })
})

$('#favoriteBtn').on('click', () => {
  if (!isSignedIn()) return
  const key = hymnalKey(currentHinario())
  toggleFavorite(key)
    .then(() => {
      renderUserState()
      decorateOptions()
      applyPickerFilter()
    })
    .catch(err => {
      console.warn('Could not save favourite:', err)
      $('#noteStatus').addClass('is-error').text('Could not save that. Check your connection.')
    })
})

$('#favoritesOnly').on('change', applyPickerFilter)

// Autosave notes shortly after typing stops, and immediately on blur.
let noteTimer
function flushNote () {
  clearTimeout(noteTimer)
  if (!isSignedIn()) return
  const key = hymnalKey(currentHinario())
  const text = $('#noteText').val()
  if (text.trim() === getNote(key)) return
  $('#noteStatus').removeClass('is-error').text('Saving…')
  saveNote(key, text)
    .then(() => $('#noteStatus').text('Saved'))
    .catch(err => {
      console.warn('Could not save note:', err)
      $('#noteStatus').addClass('is-error').text('Could not save. Check your connection.')
    })
}

$('#noteText').on('input', () => {
  clearTimeout(noteTimer)
  noteTimer = setTimeout(flushNote, 900)
})
$('#noteText').on('blur', flushNote)

/** Mark favourited hymnals with a star in the picker. */
function decorateOptions () {
  const signedIn = isSignedIn()
  $('#mselect')
    .children('option')
    .each(function () {
      const option = $(this)
      const h = hinarios[Number(option.val())]
      const star = signedIn && isFavorite(hymnalKey(h)) ? '★ ' : ''
      option.text(`${star}${h.title} — ${h.person}`)
    })
}

/** Narrow the picker by the search box and the favourites-only checkbox. */
function applyPickerFilter () {
  const select = $('#mselect')
  if (!select.length) return

  const q = ($('#hymnalSearch').val() || '').trim().toLowerCase()
  const favOnly = isSignedIn() && $('#favoritesOnly').is(':checked')
  let firstMatch = -1

  select.children('option').each(function () {
    const option = $(this)
    const h = hinarios[Number(option.val())]
    const matchesText = !q || option.data('search').includes(q)
    const matchesFav = !favOnly || isFavorite(hymnalKey(h))
    const hit = matchesText && matchesFav
    option.prop('hidden', !hit)
    if (hit && firstMatch === -1) firstMatch = Number(option.val())
  })

  // Keep the select showing something valid as the list narrows.
  if (firstMatch !== -1 && select.children('option:selected').prop('hidden')) {
    selectHinario(firstMatch)
  }
}

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
    .on('input', applyPickerFilter)

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
    decorateOptions()

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
