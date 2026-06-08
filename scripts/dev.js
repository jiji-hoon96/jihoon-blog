const { spawn } = require('child_process')
const path = require('path')

const scriptDir = __dirname

const watcher = spawn(
  'node',
  [path.join(scriptDir, 'copy-content-images.js'), '--watch'],
  { stdio: 'inherit' },
)

const nextDev = spawn('npx', ['next', 'dev', '--webpack'], {
  stdio: 'inherit',
})

let exiting = false
const cleanup = (code) => {
  if (exiting) return
  exiting = true
  if (!watcher.killed) watcher.kill('SIGTERM')
  if (!nextDev.killed) nextDev.kill('SIGTERM')
  process.exit(code ?? 0)
}

process.on('SIGINT', () => cleanup(0))
process.on('SIGTERM', () => cleanup(0))

nextDev.on('exit', (code) => cleanup(code ?? 0))
watcher.on('exit', (code) => {
  if (code !== 0 && !exiting) {
    console.error(`Image watcher exited unexpectedly with code ${code}`)
    cleanup(code ?? 1)
  }
})
