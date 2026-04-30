import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import net from 'node:net'
import { createRequire } from 'node:module'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { getAvailableLanguages, initTradux } from 'tradux'

const mode = process.argv[2] ?? 'dev'
const isDev = mode === 'dev'

if (!['dev', 'start'].includes(mode)) {
  console.error(`Unsupported mode: ${mode}. Use "dev" or "start".`)
  process.exit(1)
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicFiles = new Set(['/styles.css', '/script.js', '/tradux.config.json'])
const rootDocumentPaths = new Set(['/', '/index.html'])
const rootPort = Number.parseInt(process.env.PORT ?? '4173', 10)
const host = process.env.HOST ?? '0.0.0.0'
const repoWebUrl = 'https://github.com/JojoDeveloper01/Tradux'
const docsUrl = `${repoWebUrl}/blob/main/readme.md`
const require = createRequire(import.meta.url)
const traduxPackageDir = path.dirname(require.resolve('tradux/package.json'))
const traduxClientDir = path.join(traduxPackageDir, 'src')
const summaryIcons = ['⚡', '🧠', '🍪', '🌍']

const routeConfigs = [
  {
    name: 'react-vite',
    prefix: '/react-vite/',
    directory: path.join(rootDir, 'react-vite'),
    distDirectory: path.join(rootDir, 'react-vite', 'dist'),
    dev: {
      port: 5173,
      command: 'pnpm',
      args: ['dev', '--host', '0.0.0.0', '--port', '5173', '--strictPort'],
    },
  },
  {
    name: 'vue-vite',
    prefix: '/vue-vite/',
    directory: path.join(rootDir, 'vue-vite'),
    distDirectory: path.join(rootDir, 'vue-vite', 'dist'),
    dev: {
      port: 5174,
      command: 'pnpm',
      args: ['dev', '--host', '0.0.0.0', '--port', '5174', '--strictPort'],
    },
  },
  {
    name: 'svelte-vite',
    prefix: '/svelte-vite/',
    directory: path.join(rootDir, 'svelte-vite'),
    distDirectory: path.join(rootDir, 'svelte-vite', 'dist'),
    dev: {
      port: 5175,
      command: 'pnpm',
      args: ['dev', '--host', '0.0.0.0', '--port', '5175', '--strictPort'],
    },
  },
  {
    name: 'vanilla-vite',
    prefix: '/vanilla-vite/',
    directory: path.join(rootDir, 'vanilla-vite'),
    distDirectory: path.join(rootDir, 'vanilla-vite', 'dist'),
    dev: {
      port: 5176,
      command: 'pnpm',
      args: ['dev', '--host', '0.0.0.0', '--port', '5176', '--strictPort'],
    },
  },
  {
    name: 'astro',
    prefix: '/astro/',
    directory: path.join(rootDir, 'astro'),
    distDirectory: path.join(rootDir, 'astro', 'dist', 'client'),
    dev: {
      port: 4321,
      command: 'pnpm',
      args: ['dev', '--host', '0.0.0.0', '--port', '4321'],
      env: {
        TRADUX_EXAMPLES_BASE: '/astro',
      },
    },
    production: {
      port: 4321,
      command: 'node',
      args: ['dist/server/entry.mjs'],
      env: {
        HOST: '0.0.0.0',
        PORT: '4321',
        TRADUX_EXAMPLES_BASE: '/astro',
      },
    },
  },
]

const childProcesses = []

function log(message) {
  console.log(`[examples:${mode}] ${message}`)
}

function getContentType(filePath) {
  const extension = path.extname(filePath)

  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

function sendFile(response, filePath) {
  try {
    const stat = fs.statSync(filePath)

    if (!stat.isFile()) {
      return false
    }

    response.writeHead(200, {
      'content-type': getContentType(filePath),
      'cache-control': 'no-cache',
    })

    fs.createReadStream(filePath).pipe(response)
    return true
  } catch {
    return false
  }
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
  })
  response.end(html)
}

function serveRootAsset(requestPath, response) {
  if (requestPath.startsWith('/i18n/')) {
    return sendFile(response, path.join(rootDir, requestPath.slice(1)))
  }

  if (!publicFiles.has(requestPath)) {
    return false
  }

  const filePath = path.join(rootDir, requestPath.slice(1))
  return sendFile(response, filePath)
}

function serveTraduxClient(requestPath, response) {
  if (!requestPath.startsWith('/tradux/') || !requestPath.endsWith('.js')) {
    return false
  }

  const relativePath = requestPath.replace(/^\/tradux\//, '')
  const filePath = path.resolve(traduxClientDir, relativePath)

  if (!filePath.startsWith(traduxClientDir)) {
    return false
  }

  return sendFile(response, filePath)
}

function getRouteConfig(requestPath) {
  return routeConfigs.find(
    (route) => requestPath === route.prefix.slice(0, -1) || requestPath === route.prefix || requestPath.startsWith(route.prefix),
  )
}

function getRefererRoute(request) {
  const referer = request.headers.referer

  if (!referer) {
    return undefined
  }

  try {
    const refererUrl = new URL(referer, `http://${request.headers.host ?? 'localhost'}`)
    return getRouteConfig(refererUrl.pathname)
  } catch {
    return undefined
  }
}

function getStaticCandidates(route, requestPath) {
  const relativePath = requestPath.startsWith(route.prefix)
    ? requestPath.slice(route.prefix.length)
    : requestPath.replace(/^\//, '')
  const safeRelativePath = relativePath === '' ? 'index.html' : relativePath
  const candidate = path.join(route.distDirectory, safeRelativePath)

  return [candidate, path.join(candidate, 'index.html')]
}

function getRouteAssetCandidates(route, requestPath) {
  const relativePath = requestPath.replace(/^\//, '')

  return [
    path.join(route.distDirectory, relativePath),
    path.join(route.directory, 'public', relativePath),
    path.join(route.directory, relativePath),
  ]
}

function getPrefixedRequestUrl(request, route) {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  requestUrl.pathname = `${route.prefix}${requestUrl.pathname.replace(/^\//, '')}`
  return `${requestUrl.pathname}${requestUrl.search}`
}

function proxyHttp(request, response, route, pathOverride = request.url) {
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: route.targetPort,
      method: request.method,
      path: pathOverride,
      headers: {
        ...request.headers,
        host: `127.0.0.1:${route.targetPort}`,
        'x-forwarded-host': request.headers.host ?? '',
        'x-forwarded-proto': 'http',
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
      upstreamResponse.pipe(response)
    },
  )

  upstream.on('error', () => {
    sendHtml(
      response,
      502,
      `<h1>${route.name} is unavailable</h1><p>The upstream server on port ${route.targetPort} is not responding yet.</p>`,
    )
  })

  request.pipe(upstream)
}

function proxyUpgrade(request, socket, head, route) {
  const upstream = net.connect(route.targetPort, '127.0.0.1', () => {
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`)

    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined || key === 'host') {
        continue
      }

      upstream.write(`${key}: ${value}\r\n`)
    }

    upstream.write(`host: 127.0.0.1:${route.targetPort}\r\n\r\n`)

    if (head.length > 0) {
      upstream.write(head)
    }

    socket.pipe(upstream).pipe(socket)
  })

  upstream.on('error', () => {
    socket.destroy()
  })
}

function parseCookies(cookieHeader = '') {
  const entries = cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const separator = chunk.indexOf('=')

      if (separator === -1) {
        return [chunk, '']
      }

      return [chunk.slice(0, separator), chunk.slice(separator + 1)]
    })

  return Object.fromEntries(entries)
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replacePlaceholders(template, values) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '')
}

function renderCommandLines(command) {
  return String(command)
    .split('\n')
    .map(
      (line, index) =>
        `<span class="command-line"><span class="line-number">${String(index + 1).padStart(2, '0')}</span><span class="line-prompt">$</span><span class="line-command">${escapeHtml(line)}</span></span>`,
    )
    .join('')
}

function renderRootPage({ requestUrl, language, languages, ui }) {
  const stats = Array.isArray(ui.stats) ? ui.stats : []
  const summary = Array.isArray(ui.summary) ? ui.summary : []
  const workflowSteps = Array.isArray(ui.workflow?.steps) ? ui.workflow.steps : []
  const integrations = Object.entries(ui.integrations ?? {})

  const languageOptions = languages
    .map((item) => {
      const selected = item.value === language ? ' selected' : ''
      return `<option value="${escapeHtml(item.value)}"${selected}>${escapeHtml(item.name)}</option>`
    })
    .join('')

  const statMarkup = stats
    .map(
      (item) =>
        `<li class="stat-card"><span class="stat-value">${escapeHtml(item.value)}</span><span class="stat-label">${escapeHtml(item.label)}</span></li>`,
    )
    .join('')

  const summaryMarkup = summary
    .map(
      (item, index) =>
        `<article class="summary-card" data-icon="${escapeHtml(summaryIcons[index] ?? '✦')}"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`,
    )
    .join('')

  const workflowMarkup = workflowSteps
    .map(
      (item) => `<article class="workflow-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></article>`,
    )
    .join('')

  const integrationsMarkup = integrations
    .map(([integrationKey, integration]) => {
      const previewPath = integration.previewPath ?? '/'
      const command = integration.command ?? ''

      return `
        <article class="integration-card theme-${escapeHtml(integrationKey)}">
          <div class="card-header">
            <div>
              <p class="integration-badge">${escapeHtml(integration.badge)}</p>
              <h3>${escapeHtml(integration.name)}</h3>
            </div>
            <span class="import-path">${escapeHtml(integration.importPath)}</span>
          </div>

          <p class="integration-description">${escapeHtml(integration.description)}</p>

          <div class="integration-meta">
            <div>
              <span class="meta-label">${escapeHtml(ui.card.howToStart)}</span>
              <p class="integration-start">${escapeHtml(integration.start)}</p>
            </div>
            <div>
              <span class="meta-label">${escapeHtml(ui.card.pathLabel)}</span>
              <p class="preview-label">
                <a class="preview-path" href="${escapeHtml(previewPath)}" aria-label="${escapeHtml(replacePlaceholders(ui.card.openRouteAria, { name: integration.name }))}">${escapeHtml(previewPath)}</a>
              </p>
              <span class="route-chip">${escapeHtml(ui.card.previewRoute)}</span>
            </div>
          </div>

          <div class="command-panel">
            <div class="command-toolbar">
              <span>${escapeHtml(ui.card.commandLabel)}</span>
              <span>${escapeHtml(ui.card.commandToolbar)}</span>
            </div>
            <pre class="command-lines"><code>${renderCommandLines(command)}</code></pre>
            <div class="command-footer">
              <p class="command-caption">${escapeHtml(ui.card.commandMeta)}</p>
              <button
                class="copy-button"
                type="button"
                data-copy-command
                data-command="${escapeHtml(encodeURIComponent(command))}"
                data-copy-default="${escapeHtml(ui.card.copyCommand)}"
                data-copy-success="${escapeHtml(ui.card.copied)}"
                data-copy-fallback="${escapeHtml(ui.card.copyManually)}"
              >${escapeHtml(ui.card.copyCommand)}</button>
            </div>
          </div>

          <div class="card-links">
            <a class="text-link" href="${escapeHtml(previewPath)}" target="_blank" aria-label="${escapeHtml(replacePlaceholders(ui.card.livePreviewAria, { name: integration.name }))}">${escapeHtml(ui.card.livePreview)}</a>
            <a class="text-link" href="${escapeHtml(integration.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(replacePlaceholders(ui.card.documentationAria, { name: integration.name }))}">${escapeHtml(ui.card.documentation)}</a>
          </div>
        </article>`
    })
    .join('')

  return `<!doctype html>
<html lang="${escapeHtml(language)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ui.meta.title)}</title>
  <meta name="description" content="${escapeHtml(ui.meta.description)}" />
  <link rel="stylesheet" href="/styles.css" />
  <script type="importmap">{"imports":{"tradux":"/tradux/client.js"}}</script>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="hero-topbar">
        <div>
          <div class="brand-mark"><span class="brand-badge">T</span><span>Tradux examples</span></div>
          <span class="eyebrow">${escapeHtml(ui.hero.eyebrow)}</span>
        </div>

        <div class="language-switcher" aria-label="${escapeHtml(ui.hero.languageLabel)}">
          <span class="language-switcher-label">${escapeHtml(ui.hero.languagePrompt)}</span>
          <form class="language-form" method="get" action="${escapeHtml(requestUrl.pathname)}" data-language-form>
            <label class="visually-hidden" for="lang-select">${escapeHtml(ui.hero.languageLabel)}</label>
            <select id="lang-select" name="lang" class="language-select" data-language-select>${languageOptions}</select>
          </form>
        </div>
      </div>

      <div class="hero-grid">
        <div>
          <h1>${escapeHtml(ui.hero.title)}</h1>
          <p class="lead">${escapeHtml(ui.hero.lead)}</p>

          <div class="hero-actions">
            <a class="button button-primary" href="${escapeHtml(docsUrl)}" target="_blank" rel="noreferrer">${escapeHtml(ui.hero.documentation)}</a>
          </div>

          <ul class="stats-grid" aria-label="Highlights">${statMarkup}</ul>
        </div>

        <aside class="hero-terminal" aria-label="${escapeHtml(ui.terminal.eyebrow)}">
          <p class="panel-eyebrow">${escapeHtml(ui.terminal.eyebrow)}</p>
          <h2>${escapeHtml(ui.terminal.title)}</h2>
          <p class="terminal-note">${escapeHtml(ui.terminal.note)}</p>
          <div class="command-panel command-panel-featured">
            <div class="command-toolbar">
              <span>${escapeHtml(ui.terminal.toolbarPrimary)}</span>
              <span>${escapeHtml(ui.terminal.toolbarSecondary)}</span>
            </div>
            <pre class="command-lines"><code>${renderCommandLines((ui.terminal.lines ?? []).join('\n'))}</code></pre>
          </div>
        </aside>
      </div>
    </section>

    <section class="summary-grid" aria-label="Tradux capabilities">${summaryMarkup}</section>

    <section class="workflow-section">
      <div class="section-heading">
        <span class="eyebrow">${escapeHtml(ui.workflow.eyebrow)}</span>
        <h2>${escapeHtml(ui.workflow.title)}</h2>
        <p class="section-description">${escapeHtml(ui.workflow.description)}</p>
      </div>
      <div class="workflow-grid">${workflowMarkup}</div>
    </section>

    <section class="integrations-section">
      <div class="section-heading">
        <span class="eyebrow">${escapeHtml(ui.integrationsSection.eyebrow)}</span>
        <h2>${escapeHtml(ui.integrationsSection.title)}</h2>
        <p class="section-description">${escapeHtml(ui.integrationsSection.description)}</p>
      </div>
      <div class="integrations-grid">${integrationsMarkup}</div>
    </section>
  </main>

  <script type="module" src="/script.js"></script>
</body>
</html>`
}

async function renderRootDocument(request, response, requestUrl) {
  const cookies = parseCookies(request.headers.cookie ?? '')
  const cookieLanguage = cookies.tradux_lang ? decodeURIComponent(cookies.tradux_lang) : null
  const tradux = await initTradux(cookieLanguage)
  const languages = getAvailableLanguages()
  const requestLanguage = requestUrl.searchParams.get('lang')

  if (requestLanguage && languages.some((item) => item.value === requestLanguage)) {
    await tradux.setLanguage(requestLanguage, {
      setCookieHeader(cookieValue) {
        response.setHeader('Set-Cookie', `${cookieValue}; SameSite=Lax`)
      },
    })
  }

  const ui = tradux.t.examples ?? {}
  const language = tradux.currentLanguage

  sendHtml(
    response,
    200,
    renderRootPage({
      requestUrl,
      language,
      languages,
      ui,
    }),
  )
}

function spawnRouteProcess(route, lifecycle) {
  const config = lifecycle === 'dev' ? route.dev : route.production

  if (!config) {
    return
  }

  const child = spawn(config.command, config.args, {
    cwd: route.directory,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    env: {
      ...process.env,
      ...config.env,
    },
  })

  route.targetPort = config.port
  childProcesses.push(child)

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    log(`${route.name} exited unexpectedly with ${signal ?? `code ${code}`}`)
  })

  child.on('error', (error) => {
    log(`${route.name} failed to start: ${error.message}`)
  })
}

let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const child of childProcesses) {
    child.kill('SIGTERM')
  }

  setTimeout(() => {
    for (const child of childProcesses) {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
    }

    process.exit(exitCode)
  }, 1500).unref()
}

if (isDev) {
  for (const route of routeConfigs) {
    spawnRouteProcess(route, 'dev')
  }
} else {
  const astroRoute = routeConfigs.find((route) => route.name === 'astro')

  if (astroRoute) {
    spawnRouteProcess(astroRoute, 'start')
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const requestPath = requestUrl.pathname

  try {
    if (serveTraduxClient(requestPath, response)) {
      return
    }

    if (rootDocumentPaths.has(requestPath)) {
      await renderRootDocument(request, response, requestUrl)
      return
    }

    const route = getRouteConfig(requestPath)

    if (!route) {
      const refererRoute = getRefererRoute(request)

      if (refererRoute) {
        for (const assetCandidate of getRouteAssetCandidates(refererRoute, requestPath)) {
          if (sendFile(response, assetCandidate)) {
            return
          }
        }

        if (isDev || refererRoute.name === 'astro') {
          proxyHttp(request, response, refererRoute, getPrefixedRequestUrl(request, refererRoute))
          return
        }

        for (const staticCandidate of getStaticCandidates(refererRoute, requestPath)) {
          if (sendFile(response, staticCandidate)) {
            return
          }
        }

        const fallbackFile = path.join(refererRoute.distDirectory, 'index.html')

        if (sendFile(response, fallbackFile)) {
          return
        }
      }

      if (serveRootAsset(requestPath, response)) {
        return
      }

      sendHtml(response, 404, '<h1>Not found</h1>')
      return
    }

    if (requestPath === route.prefix.slice(0, -1)) {
      response.writeHead(308, {
        location: `${route.prefix}${requestUrl.search}`,
      })
      response.end()
      return
    }

    if (isDev) {
      proxyHttp(request, response, route)
      return
    }

    if (route.name === 'astro') {
      for (const staticCandidate of getStaticCandidates(route, requestPath)) {
        if (sendFile(response, staticCandidate)) {
          return
        }
      }

      proxyHttp(request, response, route)
      return
    }

    for (const staticCandidate of getStaticCandidates(route, requestPath)) {
      if (sendFile(response, staticCandidate)) {
        return
      }
    }

    const fallbackFile = path.join(route.distDirectory, 'index.html')

    if (sendFile(response, fallbackFile)) {
      return
    }

    sendHtml(
      response,
      503,
      `<h1>${route.name} is not built</h1><p>Run <code>pnpm build</code> inside <code>examples/</code> before starting production mode.</p>`,
    )
  } catch (error) {
    console.error(error)
    sendHtml(response, 500, '<h1>Internal server error</h1>')
  }
})

server.on('upgrade', (request, socket, head) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const route = getRouteConfig(requestUrl.pathname)

  if (!route || (!isDev && route.name !== 'astro')) {
    socket.destroy()
    return
  }

  proxyUpgrade(request, socket, head, route)
})

server.on('error', (error) => {
  console.error(error)
  shutdown(1)
})

server.listen(rootPort, host, () => {
  log(`Listening on http://${host}:${rootPort}`)

  for (const route of routeConfigs) {
    const status = isDev || route.name === 'astro' ? `proxied to :${route.targetPort}` : 'served from dist/'
    log(`${route.prefix} → ${status}`)
  }
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
