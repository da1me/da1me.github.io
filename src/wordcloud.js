import WordCloud from 'wordcloud'
import { stopWords_ } from './stats.js'
import { currentTheme } from './ui.js'

// Two ramps that stay legible on their own background.
const PALETTE_LIGHT = ['#6d4aad', '#3f6fb5', '#2f8f7d', '#b5642a', '#a63d63', '#4b4a6a']
const PALETTE_DARK = ['#b79cf0', '#7fb0ee', '#5fcfae', '#f0a94a', '#f08cae', '#c9c4e0']

/**
 * Word frequencies for a hymnal, highest first.
 * Returns [[word, count], ...] — also what the CSV export writes.
 */
export function computeFrequencies (hinario, opts = {}) {
  const { maxWords, includeStopWords = false } = opts

  const freq = new Map()
  hinario.hinos.forEach(h => {
    const tokens = (h.tokens && h.tokens.pt) || []
    tokens.forEach(token => {
      const t = token.toLowerCase()
      if (!includeStopWords && stopWords_.includes(t)) return
      freq.set(t, (freq.get(t) || 0) + 1)
    })
  })

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return maxWords ? sorted.slice(0, maxWords) : sorted
}

function sizeCanvasToContainer (canvas) {
  // Render at device resolution so text is crisp on retina displays.
  const rect = canvas.getBoundingClientRect()
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const cssWidth = Math.max(rect.width || canvas.clientWidth || 640, 320)
  const cssHeight = Math.round(cssWidth * 0.62)
  canvas.style.height = `${cssHeight}px`
  canvas.width = Math.round(cssWidth * ratio)
  canvas.height = Math.round(cssHeight * ratio)
  return ratio
}

/**
 * Draw the word cloud and return the frequency list that was rendered.
 */
export function plotWordcloud (hinario, opts = {}, onWordClick) {
  const canvas = document.getElementById('contentCanvas')
  if (!canvas) return []

  const list = computeFrequencies(hinario, opts)
  const ratio = sizeCanvasToContainer(canvas)

  if (!list.length) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    return []
  }

  const palette = currentTheme() === 'dark' ? PALETTE_DARK : PALETTE_LIGHT
  const max = list[0][1]
  const area = canvas.width * canvas.height
  // Scale the largest word to the canvas so dense and sparse hymnals both fill it.
  const weightFactor = (Math.sqrt(area) / 9) / Math.sqrt(max)

  WordCloud(canvas, {
    list,
    gridSize: Math.round(6 * ratio),
    weightFactor: count => Math.max(Math.sqrt(count) * weightFactor, 8 * ratio),
    fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
    color: (word, weight) => palette[Math.floor(Math.random() * palette.length)],
    backgroundColor: 'transparent',
    rotateRatio: 0.28,
    rotationSteps: 2,
    shuffle: false,
    drawOutOfBound: false,
    shrinkToFit: true,
    click: item => {
      if (onWordClick && item) onWordClick(item[0], item[1])
    }
  })

  return list
}
