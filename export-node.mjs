import { writeFileSync } from 'node:fs'
import { signalChunk, sampleRate, numberOfChannels } from './signal.mjs'

const wc = await import(process.env.WEBCODECS_PATH ?? '@napi-rs/webcodecs')
const out = process.argv[3] ?? 'node.mp4'
const arrivals = []
let flushResolvedAt = -1
class TracedAudioEncoder extends wc.AudioEncoder {
  constructor(init) {
    super({
      ...init,
      output: (chunk, meta) => {
        arrivals.push({ timestamp: chunk.timestamp, duration: chunk.duration })
        init.output(chunk, meta)
      },
    })
  }
  async flush() {
    await super.flush()
    flushResolvedAt = arrivals.length
  }
}
globalThis.AudioEncoder = TracedAudioEncoder
for (const k of ['AudioData', 'EncodedAudioChunk', 'AudioDecoder', 'EncodedVideoChunk', 'VideoFrame', 'VideoEncoder', 'VideoDecoder']) {
  globalThis[k] ??= wc[k]
}
const { Output, Mp4OutputFormat, BufferTarget, AudioSampleSource, AudioSample } = await import('mediabunny')

const seconds = Number(process.argv[2] ?? 96)
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
writeFileSync(out, Buffer.from(output.target.buffer))

await new Promise((resolve) => setTimeout(resolve, 1000))
console.log(JSON.stringify({ out, arrivalsTotal: arrivals.length, flushResolvedAt, tail: arrivals.slice(-2) }))
