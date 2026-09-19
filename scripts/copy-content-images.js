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

  const removed = await pruneOrphans()
  const folders = await fs.readdir(PUBLIC_DIR)
  const prunedNote = removed.length ? ` 🧹 Pruned: ${removed.length}` : ''
  console.log(`✅ Images copied successfully! 📁 Total folders: ${folders.length}${prunedNote}`)
}

/**
 * content/ 에서 사라진 이미지를 public/content/ 에서도 지운다.
 *
 * fs.copy 는 더하기만 해서, 글을 지워도 public/content 에는 그대로 남았다.
 * 실제로 글 44개 분량 295MB 가 아무도 안 읽는 채로 저장소와 배포에 실려 있었다.
 *
 * 폴더 단위로만 지우던 버전은 파일 단위 드리프트를 놓쳤다. 글 두 편의
 * 이미지 16개가 content/ 에는 없고 public/content/ 에만 남아 git 에 추적되고
 * 있었다. 본문이 그것을 참조하므로 화면은 멀쩡했고, 참조에서 존재를 확인하는
 * 게이트도 통과했다. 파일 단위로 지우는 순간 6개 로케일에서 깨졌을 것이다.
 * 그래서 파일까지 본다. 이제 public/content/ 는 content/ 의 파생물이다.
 */
async function pruneOrphans() {
  const removed = []

  for (const name of await fs.readdir(PUBLIC_DIR)) {
    const copiedPath = path.join(PUBLIC_DIR, name)
    const sourcePath = path.join(CONTENT_DIR, name)

    if (!(await fs.stat(copiedPath)).isDirectory()) continue

    if (!(await fs.pathExists(sourcePath))) {
      await fs.remove(copiedPath)
      removed.push(name)
      continue
    }

    for (const file of await fs.readdir(copiedPath)) {
      if (await fs.pathExists(path.join(sourcePath, file))) continue
      await fs.remove(path.join(copiedPath, file))
      removed.push(`${name}/${file}`)
    }
  }

  return removed
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
