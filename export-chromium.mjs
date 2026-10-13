import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { chromium } from 'playwright'

const seconds = Number(process.argv[2] ?? 96)
const root = new URL('.', import.meta.url).pathname
const server = createServer(async (req, res) => {
  try {
    const body = await readFile(join(root, decodeURIComponent(req.url.split('?')[0])))
    res.writeHead(200, { 'content-type': extname(req.url) === '.mjs' ? 'text/javascript' : 'text/html' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0)
const base = `http://localhost:${server.address().port}`

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage()
await page.goto(`${base}/signal.mjs`)
const bytes = await page.evaluate(async (seconds) => {
  const { Output, Mp4OutputFormat, BufferTarget, AudioSampleSource, AudioSample } = await import('/node_modules/mediabunny/dist/bundles/mediabunny.mjs')
  const { signalChunk, sampleRate, numberOfChannels } = await import('/signal.mjs')
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
  const source = new AudioSampleSource({ codec: 'aac', bitrate: 128000 })
  output.addAudioTrack(source)
  await output.start()
  for (let frame = 0; frame < seconds * sampleRate; frame += 1024) {
    const sample = new AudioSample({ format: 'f32', sampleRate, numberOfChannels, timestamp: frame / sampleRate, data: signalChunk(frame, 1024) })
    await source.add(sample)
    sample.close()
  }
  source.close()
  await output.finalize()
  return Array.from(new Uint8Array(output.target.buffer))
}, seconds)
await writeFile('chromium.mp4', Buffer.from(bytes))
console.log(JSON.stringify({ out: 'chromium.mp4', version: browser.version() }))
await browser.close()
server.close()
