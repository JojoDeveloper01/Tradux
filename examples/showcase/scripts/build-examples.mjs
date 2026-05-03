import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const showcaseDir = path.resolve(scriptsDir, '..')
const examplesDir = path.resolve(showcaseDir, '..')
const frameworksDir = path.join(examplesDir, 'frameworks')

const examples = [
  { name: 'react-vite', cwd: path.join(frameworksDir, 'react-vite'), env: { TRADUX_EXAMPLES_BASE: '/react-vite/' } },
  { name: 'vue-vite', cwd: path.join(frameworksDir, 'vue-vite'), env: { TRADUX_EXAMPLES_BASE: '/vue-vite/' } },
  { name: 'svelte-vite', cwd: path.join(frameworksDir, 'svelte-vite'), env: { TRADUX_EXAMPLES_BASE: '/svelte-vite/' } },
  { name: 'vanilla-vite', cwd: path.join(frameworksDir, 'vanilla-vite'), env: { TRADUX_EXAMPLES_BASE: '/vanilla-vite/' } },
  { name: 'astro', cwd: path.join(frameworksDir, 'astro'), env: { TRADUX_EXAMPLES_BASE: '/astro' } },
]

function run(command, args, cwd, label, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    })

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${label} failed with ${signal ?? `exit code ${code}`}`))
    })

    child.on('error', reject)
  })
}

for (const example of examples) {
  console.log(`\n→ Installing ${example.name} dependencies`)
  await run('pnpm', ['install', '--frozen-lockfile'], example.cwd, `${example.name} install`, example.env)

  console.log(`\n→ Building ${example.name}`)
  await run('pnpm', ['build'], example.cwd, example.name, example.env)
}

console.log('\nAll examples built successfully.')
