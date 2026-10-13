import * as wc from '@napi-rs/webcodecs'
const arrivals = []
let flushResolvedAt = -1
class TracedAudioEncoder extends wc.AudioEncoder {
  constructor(init) {
    super({ ...init, output: (chunk, meta) => { arrivals.push({ timestamp: chunk.timestamp, duration: chunk.duration }); init.output(chunk, meta) } })
  }
  async flush() { await super.flush(); flushResolvedAt = arrivals.length }
}
globalThis.AudioEncoder = TracedAudioEncoder
for (const k of ['AudioData', 'EncodedAudioChunk', 'AudioDecoder', 'EncodedVideoChunk', 'VideoFrame', 'VideoEncoder', 'VideoDecoder']) globalThis[k] ??= wc[k]
const { Output, Mp4OutputFormat, BufferTarget, AudioSampleSource, AudioSample, Input, BufferSource, ALL_FORMATS, EncodedPacketSink } = await import('mediabunny')

const sampleRate = 48000, ch = 2, seconds = Number(process.argv[2] ?? 96)
const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
const src = new AudioSampleSource({ codec: 'aac', bitrate: 128000 })
output.addAudioTrack(src)
await output.start()
let seed = 1
for (let off = 0; off < seconds * sampleRate; off += 1024) {
  const data = new Float32Array(1024 * ch)
  for (let i = 0; i < data.length; i++) { seed = (seed * 1103515245 + 12345) >>> 0; data[i] = (seed / 0xffffffff - 0.5) }
  const s = new AudioSample({ format: 'f32', sampleRate, numberOfChannels: ch, timestamp: off / sampleRate, data })
  await src.add(s); s.close()
}
src.close()
await output.finalize()
const input = new Input({ source: new BufferSource(output.target.buffer), formats: ALL_FORMATS })
const track = await input.getPrimaryAudioTrack()
const sink = new EncodedPacketSink(track)
const ts = []
for await (const p of sink.packets()) ts.push(p.timestamp)
await new Promise((r) => setTimeout(r, 2000))
const { writeFileSync } = await import('node:fs')
const result = { seconds, packetsInMp4: ts.length, arrivalsTotal: arrivals.length, flushResolvedAt, arrivals, mp4Timestamps: ts }
writeFileSync('result.json', JSON.stringify(result))
console.log(JSON.stringify({ seconds, packetsInMp4: ts.length, arrivalsTotal: arrivals.length, flushResolvedAt, tail: arrivals.slice(flushResolvedAt - 5, flushResolvedAt + 2) }))
