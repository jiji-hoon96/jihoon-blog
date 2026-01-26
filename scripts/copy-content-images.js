const fs = require('fs-extra')
const path = require('path')

async function copyImages() {
  const contentDir = path.join(__dirname, '../content')
  const publicDir = path.join(__dirname, '../public/content')

  console.log('📸 Copying content images...')
  console.log(`From: ${contentDir}`)
  console.log(`To: ${publicDir}`)

  try {
    // Ensure public directory exists
    await fs.ensureDir(publicDir)

    // Copy all content with filtering
    await fs.copy(contentDir, publicDir, {
      filter: (src) => {
        // Include directories
        if (fs.statSync(src).isDirectory()) {
          return true
        }

        // Include only image files
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|heic|avif|bmp|ico)$/i
        return imageExtensions.test(src)
      },
    })

    console.log('✅ Images copied successfully!')

    // Count copied files
    const files = await fs.readdir(publicDir)
    console.log(`📁 Total folders: ${files.length}`)

  } catch (error) {
    console.error('❌ Error copying images:', error)
    process.exit(1)
  }
}

copyImages()
