import $ from 'jquery'
import { jaccard, stopWords_ } from './stats.js'

/* global d3 */

const stopWordSet = new Set(stopWords_)
let currentNetwork
let activeAuthor

export function computeAuthorSets (hinarios) {
  const authors = new Map()
  hinarios.forEach(h => {
    if (!authors.has(h.person)) authors.set(h.person, new Set())
    const set = authors.get(h.person)
    h.hinos.forEach(hi => {
      const tokens = (hi.tokens && hi.tokens.pt) || []
      tokens.forEach(t => {
        const lower = t.toLowerCase()
        if (!stopWordSet.has(lower)) set.add(lower)
      })
    })
  })
  return [...authors.entries()]
}

// Pairwise similarity is independent of the threshold, but redrawing happens on
// every slider nudge, resize and theme switch. Compute it once per author set.
const pairCache = new WeakMap()

function similarityPairs (authorSets) {
  const cached = pairCache.get(authorSets)
  if (cached) return cached

  const pairs = []
  let minWeight = Infinity
  let maxWeight = 0

  for (let i = 0; i < authorSets.length; i++) {
    for (let j = i + 1; j < authorSets.length; j++) {
      const s = jaccard(authorSets[i][1], authorSets[j][1])
      if (s < minWeight) minWeight = s
      if (s > maxWeight) maxWeight = s
      pairs.push({ i, j, s })
    }
  }

  if (minWeight === Infinity) minWeight = 0
  const result = { pairs, minWeight, maxWeight }
  pairCache.set(authorSets, result)
  return result
}

export function computeAuthorNetwork (authorSets, threshold = 0.05) {
  const nodes = authorSets.map(([name, tokens], i) => ({
    id: i,
    name,
    vocab: tokens.size,
    degree: 0
  }))
  const { pairs, minWeight, maxWeight } = similarityPairs(authorSets)
  const links = []

  pairs.forEach(({ i, j, s }) => {
    if (s < threshold) return
    links.push({ source: i, target: j, weight: s })
    nodes[i].degree += 1
    nodes[j].degree += 1
  })

  return { nodes, links, minWeight, maxWeight }
}

const cssVar = name =>
  window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export function drawAuthorNetwork (authorSets) {
  const container = $('#authorNetwork')
  const el = container.get(0)
  if (!el || typeof d3 === 'undefined') return

  const slider = $('#jaccardThreshold')
  let threshold = Number(slider.val())
  if (!Number.isFinite(threshold)) threshold = 0.05

  let network = computeAuthorNetwork(authorSets, threshold)
  const range = network.maxWeight - network.minWeight
  slider
    .attr('min', network.minWeight)
    .attr('max', network.maxWeight)
    .attr('step', range > 0 ? range / 100 : 0.01)

  const clampedThreshold = Math.min(
    Math.max(threshold, network.minWeight),
    network.maxWeight
  )
  if (clampedThreshold !== threshold) {
    threshold = clampedThreshold
    slider.val(threshold)
    network = computeAuthorNetwork(authorSets, threshold)
  }
  $('#thresholdValue').text(Number(slider.val()).toFixed(2))

  const { nodes, links } = network
  const width = Math.max(el.clientWidth, 320)
  const height = Math.max(el.clientHeight, 280)

  const accent = cssVar('--accent') || '#6d4aad'
  const highlight = cssVar('--highlight') || '#d97706'
  const linkColor = cssVar('--border-strong') || '#cdc7bc'
  const nodeStroke = cssVar('--bg-sunken') || '#edebe6'

  container.empty()
  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Everything zoomable lives in this group; labels can then spill past the
  // old fixed bounds without being clipped.
  const root = svg.append('g')

  const maxVocab = Math.max(...nodes.map(n => n.vocab), 1)
  const radiusFor = d => 4 + 7 * Math.sqrt(d.vocab / maxVocab)

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3.forceLink(links).distance(d => 60 + 90 * (1 - d.weight)).strength(d => d.weight)
    )
    .force('charge', d3.forceManyBody().strength(-220))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(d => radiusFor(d) + 14))
    .force('x', d3.forceX(width / 2).strength(0.05))
    .force('y', d3.forceY(height / 2).strength(0.05))

  const link = root
    .append('g')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', linkColor)
    .attr('stroke-opacity', 0.7)
    .attr('stroke-width', d => 0.6 + 3.5 * d.weight)

  const node = root
    .append('g')
    .selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', radiusFor)
    .attr('fill', accent)
    .attr('stroke', nodeStroke)
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('mouseover', (event, d) => paint(d))
    .on('mouseout', () => paint(nodes.find(n => n.name === activeAuthor)))
    .call(
      d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended)
    )

  node.append('title').text(d => `${d.name}\n${d.vocab} unique words\n${d.degree} connections`)

  // 46 labels at once is unreadable, so only the most prominent authors are
  // named by default; the rest surface on hover, focus, or zoom-in.
  const alwaysLabelled = new Set(
    [...nodes]
      .sort((a, b) => b.degree - a.degree || b.vocab - a.vocab)
      .slice(0, 12)
      .map(d => d.id)
  )

  const label = root
    .append('g')
    .selectAll('text')
    .data(nodes)
    .enter()
    .append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', d => -radiusFor(d) - 5)
    .text(d => d.name)

  const render = () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
    node.attr('cx', d => d.x).attr('cy', d => d.y)
    label.attr('x', d => d.x).attr('y', d => d.y)
  }
  simulation.on('tick', render)

  // Settle the layout synchronously so the graph appears already arranged
  // instead of animating in from the origin — and so it still renders when
  // requestAnimationFrame is throttled (background tab, reduced motion).
  simulation.stop()
  simulation.tick(200)
  render()

  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 6])
    .on('zoom', event => {
      root.attr('transform', event.transform)
      // Once zoomed in there is room for every name.
      if (event.transform.k > 1.8) label.attr('opacity', 1)
      else paint(nodes.find(n => n.name === activeAuthor))
    })
  svg.call(zoom)

  // Frame the settled layout, leaving room for the labels that sit above nodes.
  const pad = 48
  const xs = nodes.map(d => d.x)
  const ys = nodes.map(d => d.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const scale = Math.min(
    (width - pad * 2) / spanX,
    (height - pad * 2) / spanY,
    1.4
  )
  svg.call(
    zoom.transform,
    d3.zoomIdentity
      .translate(
        width / 2 - ((minX + maxX) / 2) * scale,
        height / 2 - ((minY + maxY) / 2) * scale
      )
      .scale(scale)
  )

  function dragstarted (event) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }
  function dragged (event) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }
  function dragended (event) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }

  /** Emphasise one author and its neighbours; `undefined` resets. */
  function paint (focus) {
    if (!focus) {
      link.attr('stroke', linkColor).attr('stroke-opacity', 0.7)
        .attr('stroke-width', d => 0.6 + 3.5 * d.weight)
      node.attr('fill', accent).attr('opacity', 1)
      label
        .classed('is-active', false)
        .attr('opacity', n => (alwaysLabelled.has(n.id) ? 1 : 0))
      return
    }

    const neigh = new Set([focus.id])
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      if (s === focus.id) neigh.add(t)
      if (t === focus.id) neigh.add(s)
    })

    const touches = l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source
      const t = typeof l.target === 'object' ? l.target.id : l.target
      return s === focus.id || t === focus.id
    }

    link
      .attr('stroke', l => (touches(l) ? highlight : linkColor))
      .attr('stroke-opacity', l => (touches(l) ? 0.95 : 0.2))
      .attr('stroke-width', l => (0.6 + 3.5 * l.weight) * (touches(l) ? 1.8 : 1))
    node
      .attr('fill', n => (n.id === focus.id ? highlight : accent))
      .attr('opacity', n => (neigh.has(n.id) ? 1 : 0.4))
    label
      .classed('is-active', n => n.id === focus.id)
      .attr('opacity', n => {
        if (neigh.has(n.id)) return 1
        return alwaysLabelled.has(n.id) ? 0.35 : 0
      })
  }

  currentNetwork = { nodes, paint }
  if (activeAuthor) highlightAuthor(activeAuthor)
}

export function highlightAuthor (name) {
  activeAuthor = name
  if (!currentNetwork) return
  currentNetwork.paint(currentNetwork.nodes.find(n => n.name === name))
}
