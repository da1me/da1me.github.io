import $ from 'jquery'

// The UI runs on hinos/corpus.json (~2MB, tokens only). Verse text lives in the
// full ~18MB scrape, so it is fetched once, on demand, the first time someone
// asks to read the lines behind a word.
let fullCorpusPromise

function loadFullCorpus () {
  if (!fullCorpusPromise) {
    fullCorpusPromise = fetch('hinos/td.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .catch(err => {
        fullCorpusPromise = undefined
        throw err
      })
  }
  return fullCorpusPromise
}

function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Match the word on its own, tolerating the accents already present in the text.
function wordMatcher (word) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(word)})(?=[^\\p{L}\\p{N}]|$)`, 'giu')
}

/**
 * Find verses containing `word` within a given hymnal.
 * Returns { matches, total } where matches is capped at `limit`.
 */
export function findVerses (fullData, hinarioTitle, person, word, limit = 12) {
  const hinario = fullData.hinarios.find(
    h => h.title === hinarioTitle && h.person === person
  )
  if (!hinario) return { matches: [], total: 0 }

  const re = wordMatcher(word)
  const matches = []
  let total = 0

  hinario.hinos.forEach(hino => {
    ;(hino.verses || []).forEach(verse => {
      re.lastIndex = 0
      if (!re.test(verse.text)) return
      total += 1
      if (matches.length < limit) {
        matches.push({ hymn: hino.title, index: hino.index, text: verse.text })
      }
    })
  })

  return { matches, total }
}

function renderVerse (text, word) {
  const frag = $('<p/>', { class: 'conc-text' })
  const re = wordMatcher(word)
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[1].length
    frag.append(document.createTextNode(text.slice(last, start)))
    frag.append($('<mark/>').text(m[2]))
    last = start + m[2].length
  }
  frag.append(document.createTextNode(text.slice(last)))
  return frag
}

/**
 * Populate the word modal with the hymn lines that contain `word`.
 */
export function showConcordance (word, count, hinario) {
  const body = $('#modalBody').empty()
  $('#modalWord').text(word)
  $('#wordModal').removeAttr('hidden')

  $('<p/>', { class: 'modal-meta' })
    .text(`${count} occurrence${count === 1 ? '' : 's'} in “${hinario.title}” by ${hinario.person}`)
    .appendTo(body)

  const status = $('<div/>', { class: 'modal-status' }).appendTo(body)
  $('<div/>', { class: 'spinner' }).appendTo(status)
  $('<span/>').text('Loading hymn text…').appendTo(status)

  loadFullCorpus()
    .then(full => {
      // A different word may have been opened while this was in flight.
      if ($('#modalWord').text() !== word) return
      body.empty()
      $('<p/>', { class: 'modal-meta' })
        .text(`${count} occurrence${count === 1 ? '' : 's'} in “${hinario.title}” by ${hinario.person}`)
        .appendTo(body)

      const { matches, total } = findVerses(full, hinario.title, hinario.person, word)
      if (!matches.length) {
        $('<p/>', { class: 'modal-meta' })
          .text('No verse text available for this word.')
          .appendTo(body)
        return
      }

      const ul = $('<ul/>', { class: 'concordance' }).appendTo(body)
      matches.forEach(m => {
        const li = $('<li/>').appendTo(ul)
        $('<span/>', { class: 'conc-source' })
          .text(`${m.index}. ${m.hymn}`)
          .appendTo(li)
        renderVerse(m.text, word).appendTo(li)
      })

      if (total > matches.length) {
        $('<p/>', { class: 'card-note' })
          .text(`Showing ${matches.length} of ${total} matching verses.`)
          .appendTo(body)
      }
    })
    .catch(err => {
      console.warn('Concordance unavailable:', err)
      if ($('#modalWord').text() !== word) return
      body.find('.modal-status').remove()
      $('<p/>', { class: 'modal-meta' })
        .text('Could not load the hymn text right now.')
        .appendTo(body)
    })
}
