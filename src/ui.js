import $ from 'jquery'

export function showWordDetail (item) {
  const [word, count] = item
  $('#modalWord').text(`${word} - ${count}x`)
  $('#wordModal').show()
}

export function setupUI (onControlsChange = () => {}) {
  $(function () {
    $('#wordModal .close').on('click', () => $('#wordModal').hide())
    $('#wordModal').on('click', e => {
      if (e.target.id === 'wordModal') $('#wordModal').hide()
    })
    function toggleFullscreen (element) {
      const doc = document
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        const elem = element || document.documentElement
        if (elem.requestFullscreen) {
          elem.requestFullscreen()
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen()
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen()
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen()
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen()
        }
      }
    }

    $('#fullscreenBtn').on('click', () => toggleFullscreen(document.getElementById('canvasContainer')))
    $('#networkFullscreenBtn').on('click', () => toggleFullscreen(document.getElementById('networkContainer')))

    $('#wordCount').on('change', onControlsChange)
    $('#includeStopwords').on('change', onControlsChange)
  })
}

export function getWordcloudOptions () {
  return {
    maxWords: Number($('#wordCount').val()) || undefined,
    includeStopWords: $('#includeStopwords').is(':checked')
  }
}
