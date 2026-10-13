import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const rate = 8000
const seconds = 96
const lanes = [
  { file: 'chromium.mp4', label: 'Chromium WebCodecs' },
  { file: 'node.mp4', label: '@napi-rs/webcodecs 1.4.2' },
  { file: 'node-patched.mp4', label: '@napi-rs/webcodecs with fix' },
].filter((lane) => existsSync(lane.file))

// aresample=async=1 places decoded audio at its packet timestamps and fills gaps with silence
const decode = (file) => {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-af', 'aresample=async=1', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
  return new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4)
}

const W = 1400, laneH = 150, T = 50, L = 230, R = 20, B = 40
const H = T + lanes.length * laneH + B
const c = createCanvas(W, H), g = c.getContext('2d')
g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
const x = (s) => L + (s / seconds) * (W - L - R)

g.fillStyle = '#111'; g.font = 'bold 18px sans-serif'
g.fillText('Same input (1 kHz beep every second, 96 s) encoded to AAC/MP4 via mediabunny', 20, 30)
g.font = '13px sans-serif'; g.strokeStyle = '#e5e5e5'
for (let s = 0; s <= seconds; s += 8) {
  g.beginPath(); g.moveTo(x(s), T); g.lineTo(x(s), T + lanes.length * laneH); g.stroke()
  g.fillStyle = '#555'; g.fillText(`${s}s`, x(s) - 10, H - 15)
}

lanes.forEach((lane, i) => {
  const pcm = decode(lane.file)
  const mid = T + i * laneH + laneH / 2
  const amp = laneH * 0.4
  g.fillStyle = '#111'; g.font = 'bold 14px sans-serif'; g.fillText(lane.label, 20, mid - 6)
  g.font = '13px sans-serif'; g.fillStyle = '#555'
  let last = pcm.length - 1
  while (last > 0 && Math.abs(pcm[last]) < 0.01) last--
  let max = 0
  for (const v of pcm) max = Math.max(max, Math.abs(v))
  g.fillText(`last beep ends at ${(last / rate).toFixed(2)} s`, 20, mid + 14)
  const cols = W - L - R
  const perCol = (seconds * rate) / cols
  g.fillStyle = i === 0 ? '#0969da' : '#cf222e'
  if (lane.file === 'node-patched.mp4') g.fillStyle = '#2ea043'
  for (let col = 0; col < cols; col++) {
    let peak = 0
    const end = Math.min(pcm.length, Math.floor((col + 1) * perCol))
    for (let j = Math.floor(col * perCol); j < end; j++) peak = Math.max(peak, Math.abs(pcm[j]))
    if (peak > 0) g.fillRect(L + col, mid - (peak / max) * amp, 1, Math.max(1, (peak / max) * amp * 2))
  }
  g.strokeStyle = '#ccc'; g.beginPath(); g.moveTo(L, mid); g.lineTo(W - R, mid); g.stroke()
})
writeFileSync('waveform.png', c.toBuffer('image/png'))
