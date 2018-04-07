
md.detect = ({storage: {state}, inject}) => {

  var onwakeup = true

  var code = `
    JSON.stringify({
      url: window.location.href,
      header: document.contentType,
      loaded: !!window.state,
    })
  `

  var tab = (id, info, tab) => {
    if (info.status === 'loading') {
      // try
      chrome.tabs.executeScript(id, {code, runAt: 'document_start'}, (res) => {
        if (chrome.runtime.lastError) {
          // origin not allowed
          return
        }

        try {
          var win = JSON.parse(res)
        }
        catch (err) {
          // JSON parse error
          return
        }

        if (win.loaded) {
          // anchor
          return
        }

        if (header(win.header) || match(win.url)) {
          if (onwakeup && state.intercept) {
            onwakeup = false
            chrome.tabs.reload(id)
          }
          else {
            inject()
          }
        }
      })
    }
  }

  var header = (value) => {
    return state.header && value && /text\/(?:x-)?markdown/i.test(value)
  }

  var match = (url) => {
    var location = new URL(url)

    var origin =
      state.origins[location.origin] ||
      state.origins['*://' + location.host] ||
      state.origins['*://*']

    // ff: webRequest bug - does not match on `hostname:port`
    if (!origin && /Firefox/.test(navigator.userAgent)) {
      var origin =
        state.origins[location.protocol + '//' + location.hostname] ||
        state.origins['*://' + location.hostname] ||
        state.origins['*://*']
    }

    if (origin && origin.match && new RegExp(origin.match).test(location.href)) {
      return origin
    }
  }

  return {tab, header, match}
}
