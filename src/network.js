import $ from 'jquery'
import { jaccard, stopWords_ } from './stats.js'
/* global d3 */

export function computeAuthorSets (hinarios) {
  const authors = {}
  hinarios.forEach(h => {
    const tokens = h.hinos.reduce((a, hi) => {
      if (hi.tokens && hi.tokens.pt) return [...a, ...hi.tokens.pt]
      return a
    }, [])
    const lower = tokens.map(t => t.toLowerCase()).filter(t => !stopWords_.includes(t))
    if (!authors[h.person]) authors[h.person] = []
    authors[h.person] = authors[h.person].concat(lower)
  })
  return Object.entries(authors).map(([name, toks]) => [name, new Set(toks)])
}

export function computeAuthorNetwork (authorSets, threshold = 0.05) {
  const nodes = authorSets.map(([name], i) => ({ id: i, name }))
  const links = []
  for (let i = 0; i < authorSets.length; i++) {
    for (let j = i + 1; j < authorSets.length; j++) {
      const s = jaccard(authorSets[i][1], authorSets[j][1])
      if (s >= threshold) links.push({ source: i, target: j, weight: s })
    }
  }
  return { nodes, links }
}

export function drawAuthorNetwork (authorSets) {
  const threshold = Number($('#jaccardThreshold').val()) || 0.05
  const { nodes, links } = computeAuthorNetwork(authorSets, threshold)
  const width = 400
  const height = 300
  const svg = d3.select('#authorNetwork').html('').append('svg')
    .attr('width', width)
    .attr('height', height)

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).distance(80).strength(d => d.weight))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2))

  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .enter().append('line')
    .attr('stroke', '#999')
    .attr('stroke-width', d => 1 + 4 * d.weight)

  const node = svg.append('g')
    .selectAll('circle')
    .data(nodes)
    .enter().append('circle')
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

  const label = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .enter().append('text')
    .attr('dy', -8)
    .attr('font-size', 10)
    .text(d => d.name)

  simulation.on('tick', () => {
    link.attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
    node.attr('cx', d => d.x)
      .attr('cy', d => d.y)
    label.attr('x', d => d.x)
      .attr('y', d => d.y)
  })

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
}
