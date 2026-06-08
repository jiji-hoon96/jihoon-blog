const fs = require('fs-extra')
const path = require('path')

const CONTENT_DIR = path.join(__dirname, '../content')
const PUBLIC_DIR = path.join(__dirname, '../public/content')
const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg|heic|avif|bmp|ico|mov|mp4|webm)$/i

async function copyAllImages() {
  console.log('📸 Copying content images...')
  console.log(`From: ${CONTENT_DIR}`)
  console.log(`To: ${PUBLIC_DIR}`)

  await fs.ensureDir(PUBLIC_DIR)

  await fs.copy(CONTENT_DIR, PUBLIC_DIR, {
    filter: (src) => {
      if (fs.statSync(src).isDirectory()) return true
      return IMAGE_REGEX.test(src)
    },
  })

  const folders = await fs.readdir(PUBLIC_DIR)
  console.log(`✅ Images copied successfully! 📁 Total folders: ${folders.length}`)
}

function startWatching() {
  console.log('👀 Watching content/ for image changes...')

  const debounce = new Map()

  fs.watch(CONTENT_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return
    if (!IMAGE_REGEX.test(filename)) return

    if (debounce.has(filename)) clearTimeout(debounce.get(filename))
    debounce.set(
      filename,
      setTimeout(async () => {
        debounce.delete(filename)
        const srcPath = path.join(CONTENT_DIR, filename)
        const destPath = path.join(PUBLIC_DIR, filename)

        try {
          if (await fs.pathExists(srcPath)) {
            await fs.ensureDir(path.dirname(destPath))
            await fs.copy(srcPath, destPath)
            console.log(`  ↻ synced ${filename}`)
          } else {
            await fs.remove(destPath)
            console.log(`  ✕ removed ${filename}`)
          }
        } catch (err) {
          console.error(`  ⚠ failed to sync ${filename}:`, err.message)
        }
      }, 100),
    )
  })
}

async function main() {
  const watch = process.argv.includes('--watch')

  try {
    await copyAllImages()
    if (watch) startWatching()
  } catch (error) {
    console.error('❌ Error copying images:', error)
    process.exit(1)
  }
}

main()
