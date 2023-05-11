
var $ = document.querySelector.bind(document)

var state = {
  theme: args.theme,
  raw: args.raw,
  themes: args.themes,
  content: args.content,
  compiler: args.compiler,
  icon: args.icon,
  html: '',
  markdown: '',
  toc: '',
  reload: {
    interval: null,
    ms: 1000,
    md: false,
  },
  _themes: {
    'github': 'light',
    'github-dark': 'dark',
    'almond': 'light',
    // 'air': 'light',
    'awsm': 'light',
    'axist': 'light',
    'bamboo': 'auto',
    'bullframe': 'light',
    'holiday': 'auto',
    'kacit': 'light',
    'latex': 'light',
    'marx': 'light',
    'mini': 'light',
    'modest': 'light',
    'new': 'auto',
    'no-class': 'auto',
    'pico': 'auto',
    'retro': 'dark',
    'sakura': 'light',
    'sakura-vader': 'dark',
    'semantic': 'light',
    'simple': 'auto',
    // 'splendor': 'light',
    'style-sans': 'light',
    'style-serif': 'light',
    'stylize': 'light',
    'superstylin': 'auto',
    'tacit': 'light',
    'vanilla': 'auto',
    'water': 'light',
    'water-dark': 'dark',
    'writ': 'light',
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === 'reload') {
    location.reload(true)
  }
  else if (req.message === 'theme') {
    state.theme = req.theme
    m.redraw()
  }
  else if (req.message === 'themes') {
    state.themes = req.themes
    m.redraw()
  }
  else if (req.message === 'raw') {
    state.raw = req.raw
    m.redraw()
  }
  else if (req.message === 'autoreload') {
    clearInterval(state.reload.interval)
  }
})

var oncreate = {
  markdown: () => {
    setTimeout(() => scroll(), 0)
  },
  html: () => {
    update()
  }
}

var onupdate = {
  html: () => {
    if (state.reload.md) {
      state.reload.md = false
      update(true)
    }
  },
  theme: () => {
    if (state.content.mermaid) {
      setTimeout(() => mmd.render(), 0)
    }
  }
}

var update = (update) => {
  scroll(update)

  if (state.content.syntax) {
    setTimeout(() => Prism.highlightAll(), 20)
  }

  if (state.content.mermaid) {
    setTimeout(() => mmd.render(), 40)
  }

  if (state.content.mathjax) {
    setTimeout(() => mj.render(), 60)
  }
}

var render = (md) => {
  state.markdown = frontmatter(md)
  chrome.runtime.sendMessage({
    message: 'markdown',
    compiler: state.compiler,
    markdown: state.markdown
  }, (res) => {
    state.html = res.html
    if (state.content.emoji) {
      state.html = emojinator(state.html)
    }
    if (state.content.mermaid) {
      state.html = state.html.replace(
        /<code class="language-(?:mermaid|mmd)">/gi,
        '<code class="mermaid">'
      )
    }
    if (state.content.toc) {
      // Crie o sumário aqui
      createToc(state.html)
    }
    state.html = anchors(state.html)
    m.redraw()
  })
}

// A função para criar o sumário
var createToc = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

  let toc = '';
  let currentLevel = 1;
  let stack = [0];

  headers.forEach((header) => {
    const level = parseInt(header.tagName.slice(1), 10);

    while (stack[0] < level) {
      toc += '<ul>';
      stack.unshift(level);
    }

    while (stack[0] > level) {
      toc += '</li></ul>';
      stack.shift();
    }

    if (currentLevel === level) {
      toc += '</li>';
    }

    const link = `<li><a href="#${header.id}">${header.textContent}</a>`;
    toc += link;

    currentLevel = level;
  });

  while (stack.length > 1) {
    toc += '</li></ul>';
    stack.shift();
  }

  state.toc = toc;
}

function mount () {
  $('pre').style.display = 'none'
  var md = $('pre').innerText
  favicon()

  m.mount($('body'), {
    oninit: () => {
      render(md)
    },
    view: () => {
      var dom = []

      if (state.raw) {
        dom.push(m('pre#_markdown', {oncreate: oncreate.markdown}, state.markdown))
        $('body').classList.remove('_toc-left', '_toc-right')
      }
      else if (state.html) {
        var loaded = Array.from($('body').classList).filter((name) => /^_theme/.test(name))[0]
        $('body').classList.remove(loaded)
        dom.push(m('link#_theme', {
          onupdate: onupdate.theme,
          rel: 'stylesheet', type: 'text/css',
          href: chrome.runtime.getURL(`/themes/${state.theme}.css`),
        }))
        dom.push(m('link#_style', {
          onupdate: onupdate.theme,
          rel: 'stylesheet', type: 'text/css',
          href: `/Volumes/Sites/chrome/markdown-viewer/assets/style.css`,
        }))
        $('body').classList.add(`_theme-${state.theme}`)

        if (state.content.syntax) {
          var prism =
            state._themes[state.theme] === 'dark' ||
            (state._themes[state.theme] === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'prism-okaidia' : 'prism'
          dom.push(m('link#_prism', {
            rel: 'stylesheet', type: 'text/css',
            href: chrome.runtime.getURL(`/vendor/${prism}.min.css`),
          }))
        }

        dom.push(m('#_html', {oncreate: oncreate.html, onupdate: onupdate.html,
          class: (/github(-dark)?/.test(state.theme) ? 'markdown-body' : 'markdown-theme') +
          (state.themes.width !== 'auto' ? ` _width-${state.themes.width}` : '')
        },
          m.trust(state.html)
        ))

        if (state.content.toc) {
          dom.push(m('#_toc.tex2jax-ignore', m.trust(state.toc)))
          $('body').classList.add('_toc-left')
        }
      }

      return dom
    }
  })
}

var anchors = (html) =>
  html.replace(/(<h[1-6] id="(.*?)">)/g, (header, _, id) =>
    header +
    '<a class="anchor" name="' + id + '" href="#' + id + '">' +
    '<span class="octicon octicon-link"></span></a>'
  )

// Função TOC
var toc = (() => {
  var walk = (regex, string, group, result = [], match = regex.exec(string)) =>
    !match ? result : walk(regex, string, group, result.concat(!group ? match[1] :
      group.reduce((all, name, index) => (all[name] = match[index + 1], all), {})));
  return {
    render: (html) => {
      let stack = [0];
      let output = '';
      walk(/<h([1-6]) id="(.*?)">(.*?)<\/h[1-6]>/gs, html, ['level', 'id', 'title'])
        .forEach(({id, title, level}) => {
          title = title.replace(/<a[^>]+>/g, '').replace(/<\/a>/g, '');
          level = parseInt(level, 10);
          if (level > stack[0]) {
            output += '<ul>'.repeat(level - stack[0]);
            stack.unshift(level);
          } else if (level < stack[0]) {
            output += '</li></ul>'.repeat(stack[0] - level);
            stack = [level].concat(stack.filter(l => l >= level));
          } else {
            output += '</li>';
          }
          output += '<li><a href="#' + id + '" class="toc-link" data-level="' + level + '">' + title + '</a>';
        });
      output += '</li></ul>'.repeat(stack[0]);
      return output;
    }
  }
})();

document.addEventListener('DOMContentLoaded', function() {
  var tocLinks = document.querySelectorAll('#_toc a');

  tocLinks.forEach(function(tocLink) {
    tocLink.addEventListener('click', function(e) {
      e.preventDefault();
      var ul = this.parentNode.querySelector('ul');

      if (ul) {
        if (ul.style.display === 'none' || ul.style.display === '') {
          ul.style.display = 'block';
        } else {
          ul.style.display = 'none';
        }
      }
    });
  });
});


var frontmatter = (md) => {
  if (/^-{3}[\s\S]+?-{3}/.test(md)) {
    var [, yaml] = /^-{3}([\s\S]+?)-{3}/.exec(md)
    var title = /title: (?:'|")*(.*)(?:'|")*/.exec(yaml)
    title && (document.title = title[1])
  }
  else if (/^\+{3}[\s\S]+?\+{3}/.test(md)) {
    var [, toml] = /^\+{3}([\s\S]+?)\+{3}/.exec(md)
    var title = /title = (?:'|"|`)*(.*)(?:'|"|`)*/.exec(toml)
    title && (document.title = title[1])
  }
  return md.replace(/^(?:-|\+){3}[\s\S]+?(?:-|\+){3}/, '')
}

var favicon = () => {
  var favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.href = chrome.runtime.getURL(`/icons/${state.icon}/16x16.png`)
  $('head').appendChild(favicon)
}

if (document.readyState === 'complete') {
  mount()
}
else {
  var timeout = setInterval(() => {
    if (document.readyState === 'complete') {
      clearInterval(timeout)
      mount()
    }
  }, 0)
}

// Adicione este trecho ao final do seu código JavaScript
document.addEventListener('DOMContentLoaded', function() {
  var tocLinks = document.querySelectorAll('.toc-link');

  tocLinks.forEach(function(tocLink) {
    tocLink.addEventListener('click', function(e) {
      e.preventDefault();
      var ul = this.nextElementSibling;

      if (ul.style.display === 'none') {
        ul.style.display = 'block';
      } else {
        ul.style.display = 'none';
      }
    });
  });
});
