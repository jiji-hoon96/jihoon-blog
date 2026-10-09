const fs = require('fs-extra')
const path = require('path')

const CONTENT_DIR = path.join(__dirname, '../content')
const PUBLIC_DIR = path.join(__dirname, '../public/content')
const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg|heic|avif|bmp|ico|mov|mp4|webm)$/i

/**
 * 본문 그림의 WebP 사본을 폭별로 만든다. `1.png` 옆에 `1.720w.webp`,
 * `1.1440w.webp`, 원본 폭의 `1.1600w.webp` 가 생기고, `rehype-image-path.ts` 가
 * 이 파일들을 찾아 `<picture>` 의 `srcset` 으로 건다.
 *
 * 2026-10-09 에 261001 을 재 보니 본문 폭 720px 자리에 1600px PNG 를 장당
 * 100~380KB 씩 받고 있었다. 치수 속성은 있어서 레이아웃은 밀리지 않았지만
 * 빈 칸이 늦게 채워졌다.
 *
 * 사본은 git 에 넣지 않는다(.gitignore). 빌드가 매번 만들고, 원본보다 새것이면
 * 건너뛴다. GIF 와 SVG 는 대상이 아니다. 움직임과 벡터를 잃는다.
 */
const VARIANT_SOURCE_REGEX = /\.(png|jpe?g)$/i
const VARIANT_REGEX = /^(.+)\.(\d+)w\.webp$/
const VARIANT_WIDTHS = [720, 1440]

/**
 * sharp 는 의존성에 따로 넣지 않고 Next 가 함께 설치한 것을 쓴다. 직접 추가하면
 * pnpm 이 `@opentelemetry/api` 의 해석까지 바꿔서 Sentry 와 Next 의 의존성이
 * 같이 움직였다.
 */
function loadSharp() {
  const nextDir = path.dirname(require.resolve('next/package.json'))
  return require(require.resolve('sharp', { paths: [nextDir] }))
}

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

  const generated = await generateAllVariants()
  const removed = await pruneOrphans()
  const folders = await fs.readdir(PUBLIC_DIR)
  const prunedNote = removed.length ? ` 🧹 Pruned: ${removed.length}` : ''
  const variantNote = generated ? ` 🖼  WebP: ${generated}` : ''
  console.log(`✅ Images copied successfully! 📁 Total folders: ${folders.length}${prunedNote}${variantNote}`)
}

async function generateAllVariants() {
  let count = 0
  for (const dir of await fs.readdir(CONTENT_DIR)) {
    const sourceDir = path.join(CONTENT_DIR, dir)
    if (!(await fs.stat(sourceDir)).isDirectory()) continue
    for (const file of await fs.readdir(sourceDir)) {
      if (!VARIANT_SOURCE_REGEX.test(file)) continue
      count += await generateVariants(path.join(dir, file))
    }
  }
  return count
}

/** `relativePath` 는 `content/` 기준이다. 새로 만든 파일 수를 돌려준다. */
async function generateVariants(relativePath) {
  const sharp = loadSharp()
  const sourcePath = path.join(CONTENT_DIR, relativePath)
  const { width } = await sharp(sourcePath).metadata()
  if (!width) return 0

  const stem = relativePath.replace(VARIANT_SOURCE_REGEX, '')
  const sourceTime = (await fs.stat(sourcePath)).mtimeMs
  const widths = [...VARIANT_WIDTHS.filter((w) => w < width), width]
  let made = 0

  for (const w of widths) {
    const target = path.join(PUBLIC_DIR, `${stem}.${w}w.webp`)
    if ((await fs.pathExists(target)) && (await fs.stat(target)).mtimeMs >= sourceTime) continue
    await fs.ensureDir(path.dirname(target))
    await sharp(sourcePath).resize({ width: w }).webp({ quality: 82 }).toFile(target)
    made += 1
  }
  return made
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

    const sources = await fs.readdir(sourcePath)
    for (const file of await fs.readdir(copiedPath)) {
      if (sources.includes(file)) continue
      // WebP 사본은 같은 이름의 원본이 있으면 남긴다. 원본 폭이 바뀌어 더 이상
      // 만들지 않는 폭의 사본은 다음 빌드가 다시 만들지 않으므로 여기서 지운다.
      const variant = file.match(VARIANT_REGEX)
      if (variant && (await isLiveVariant(sourcePath, sources, variant[1], Number(variant[2])))) continue
      await fs.remove(path.join(copiedPath, file))
      removed.push(`${name}/${file}`)
    }
  }

  return removed
}

async function isLiveVariant(sourceDir, sources, stem, width) {
  const source = sources.find(
    (name) => VARIANT_SOURCE_REGEX.test(name) && name.replace(VARIANT_SOURCE_REGEX, '') === stem,
  )
  if (!source) return false
  const { width: sourceWidth } = await loadSharp()(path.join(sourceDir, source)).metadata()
  return width === sourceWidth || (VARIANT_WIDTHS.includes(width) && width < sourceWidth)
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
            if (VARIANT_SOURCE_REGEX.test(filename)) await generateVariants(filename)
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
