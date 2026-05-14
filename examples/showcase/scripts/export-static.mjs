import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createTradux } from 'tradux/edge'
import { availableLanguages as languageDefinitions } from 'tradux/languages'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const showcaseDir = path.resolve(scriptsDir, '..')
const examplesDir = path.resolve(showcaseDir, '..')
const frameworksDir = path.join(examplesDir, 'frameworks')
const outputDir = path.join(showcaseDir, 'dist')
const repoWebUrl = 'https://github.com/JojoDeveloper01/Tradux'
const docsUrl = `${repoWebUrl}/blob/main/readme.md`
const summaryIcons = ['⚡', '🧠', '🍪', '🌍']
const require = createRequire(import.meta.url)
const traduxPackageDir = path.dirname(require.resolve('tradux/package.json'))

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

function renderRootPage({ language, languages, ui }) {
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
<body data-static-root="true">
  <main class="page">
    <section class="hero">
      <div class="hero-topbar">
        <div>
          <div class="brand-mark"><span class="brand-badge">T</span><span>Tradux examples</span></div>
          <span class="eyebrow">${escapeHtml(ui.hero.eyebrow)}</span>
        </div>

        <div class="language-switcher" aria-label="${escapeHtml(ui.hero.languageLabel)}">
          <span class="language-switcher-label">${escapeHtml(ui.hero.languagePrompt)}</span>
          <form class="language-form" method="get" action="/${escapeHtml(language)}/" data-language-form>
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function copyIfExists(from, to) {
  await cp(from, to, { recursive: true })
}

async function main() {
  const config = await readJson(path.join(showcaseDir, 'tradux.config.json'))
  const translations = {}

  for (const language of config.availableLanguages ?? []) {
    translations[language] = await readJson(path.join(showcaseDir, 'i18n', `${language}.json`))
  }

  const languages = (config.availableLanguages ?? Object.keys(translations)).map((code) => {
    const definition = languageDefinitions.find((language) => language.value === code)
    return definition ? { name: definition.name, value: code } : { name: code, value: code }
  })

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  await copyIfExists(path.join(showcaseDir, 'styles.css'), path.join(outputDir, 'styles.css'))
  await copyIfExists(path.join(showcaseDir, 'script.js'), path.join(outputDir, 'script.js'))
  await copyIfExists(path.join(showcaseDir, 'tradux.config.json'), path.join(outputDir, 'tradux.config.json'))
  await copyIfExists(path.join(showcaseDir, 'i18n'), path.join(outputDir, 'i18n'))
  await copyIfExists(path.join(traduxPackageDir, 'src'), path.join(outputDir, 'tradux'))

  const routes = [
    ['react-vite', 'react-vite'],
    ['vue-vite', 'vue-vite'],
    ['svelte-vite', 'svelte-vite'],
    ['vanilla-vite', 'vanilla-vite'],
    ['astro', 'astro'],
  ]

  for (const [routeName, folderName] of routes) {
    await copyIfExists(
      path.join(frameworksDir, folderName, 'dist'),
      path.join(outputDir, routeName),
    )
  }

  for (const language of Object.keys(translations)) {
    const tradux = await createTradux({
      translations,
      lang: language,
      defaultLanguage: config.defaultLanguage ?? 'en',
      availableLanguages: config.availableLanguages,
      languageDefinitions,
    })
    const html = renderRootPage({ language, languages, ui: tradux.t.examples ?? {} })
    const languageDir = path.join(outputDir, language)
    await mkdir(languageDir, { recursive: true })
    await writeFile(path.join(languageDir, 'index.html'), html)

    if (language === (config.defaultLanguage ?? 'en')) {
      await writeFile(path.join(outputDir, 'index.html'), html)
    }
  }

  console.log(`Static showcase exported to ${outputDir}`)
}

await main()
