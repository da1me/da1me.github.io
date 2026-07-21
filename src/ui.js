import $ from 'jquery'

const THEME_KEY = 'aeterni-theme'

function systemPrefersDark () {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function storedTheme () {
  try {
    return window.localStorage.getItem(THEME_KEY)
  } catch (err) {
    return null
  }
}

export function currentTheme () {
  const explicit = document.documentElement.getAttribute('data-theme')
  if (explicit) return explicit
  return systemPrefersDark() ? 'dark' : 'light'
}

function applyTheme (theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch (err) {
    /* storage blocked; the theme still applies for this page view */
  }
}

export function hideLoading () {
  $('#loading').addClass('is-hidden')
}

export function closeModal () {
  $('#wordModal').attr('hidden', true)
}

function toggleFullscreen (element) {
  const doc = document
  const active =
    doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement
  if (!active) {
    const elem = element || doc.documentElement
    const request =
      elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen
    if (request) Promise.resolve(request.call(elem)).catch(err => console.warn(err))
  } else {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen
    if (exit) Promise.resolve(exit.call(doc)).catch(err => console.warn(err))
  }
}

/**
 * Wire up chrome that does not depend on corpus data.
 * `handlers.onControlsChange` fires when the word-cloud controls change;
 * `handlers.onThemeChange` fires after a theme switch so canvases can redraw.
 */
export function setupUI (handlers = {}) {
  const { onControlsChange = () => {}, onThemeChange = () => {} } = handlers

  const saved = storedTheme()
  if (saved) document.documentElement.setAttribute('data-theme', saved)

  $(function () {
    $('#themeToggle').on('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark')
      onThemeChange()
    })

    // Follow the OS while the user has not chosen explicitly.
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => {
        if (!storedTheme()) onThemeChange()
      }
      if (mq.addEventListener) mq.addEventListener('change', listener)
      else if (mq.addListener) mq.addListener(listener)
    }

    $('#wordModal .close').on('click', closeModal)
    $('#wordModal').on('click', e => {
      if (e.target.id === 'wordModal') closeModal()
    })
    $(document).on('keydown', e => {
      if (e.key === 'Escape') closeModal()
    })

    $('#fullscreenBtn').on('click', () =>
      toggleFullscreen(document.getElementById('canvasContainer'))
    )
    $('#networkFullscreenBtn').on('click', () =>
      toggleFullscreen(document.getElementById('networkContainer'))
    )

    $('#wordCount').on('change', onControlsChange)
    $('#includeStopwords').on('change', onControlsChange)
  })
}

export function getWordcloudOptions () {
  const raw = Number($('#wordCount').val())
  const maxWords = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 500) : 100
  return {
    maxWords,
    includeStopWords: $('#includeStopwords').is(':checked')
  }
}

function slugify (text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function triggerDownload (href, filename, revoke) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (revoke) URL.revokeObjectURL(href)
}

export function downloadCanvasPng (hinario) {
  const canvas = document.getElementById('contentCanvas')
  if (!canvas) return
  const name = hinario ? slugify(`${hinario.title}-${hinario.person}`) : 'wordcloud'
  triggerDownload(canvas.toDataURL('image/png'), `${name}-wordcloud.png`)
}

export function downloadFrequencyCsv (hinario, list) {
  if (!list || !list.length) return
  const escape = value => `"${String(value).replace(/"/g, '""')}"`
  const rows = [['word', 'count'], ...list].map(r => r.map(escape).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8' })
  const name = hinario ? slugify(`${hinario.title}-${hinario.person}`) : 'wordcloud'
  triggerDownload(URL.createObjectURL(blob), `${name}-frequencies.csv`, true)
}
