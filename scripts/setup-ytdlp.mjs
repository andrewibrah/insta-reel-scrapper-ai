import { createWriteStream, mkdirSync, existsSync, chmodSync } from 'fs'
import { get } from 'https'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const binDir = join(rootDir, 'bin')
const binPath = join(binDir, 'yt-dlp')

if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true })

if (existsSync(binPath)) {
  console.log('yt-dlp standalone binary already exists, skipping download.')
  process.exit(0)
}

// Only download the Linux standalone binary (for Vercel's environment)
if (process.platform !== 'linux') {
  console.log(`Platform is ${process.platform}, not downloading Linux binary. youtube-dl-exec will use its own binary locally.`)
  process.exit(0)
}

const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
console.log(`Downloading yt-dlp standalone binary from ${url} ...`)

function download(url, dest, redirects = 0) {
  if (redirects > 10) {
    console.error('Too many redirects')
    process.exit(1)
  }
  get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      download(res.headers.location, dest, redirects + 1)
      return
    }
    if (res.statusCode !== 200) {
      console.error(`Failed to download: HTTP ${res.statusCode}`)
      process.exit(1)
    }
    const file = createWriteStream(dest)
    res.pipe(file)
    file.on('finish', () => {
      file.close()
      chmodSync(dest, 0o755)
      console.log('yt-dlp standalone binary downloaded and made executable.')
    })
    file.on('error', (err) => {
      console.error('Write error:', err)
      process.exit(1)
    })
  }).on('error', (err) => {
    console.error('Download error:', err)
    process.exit(1)
  })
}

download(url, binPath)
