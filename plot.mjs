import { readFileSync, writeFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const r = JSON.parse(readFileSync('result.json', 'utf8'))
const W = 1200, H = 640, L = 90, R = 30, T = 60, B = 70
const c = createCanvas(W, H), g = c.getContext('2d')
g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
const n = r.arrivals.length, maxS = r.seconds
const x = (i) => L + (i / (n - 1)) * (W - L - R)
const y = (s) => H - B - (s / maxS) * (H - T - B)

g.strokeStyle = '#ddd'; g.fillStyle = '#555'; g.font = '14px sans-serif'
for (let s = 0; s <= maxS; s += 16) { g.beginPath(); g.moveTo(L, y(s)); g.lineTo(W - R, y(s)); g.stroke(); g.fillText(`${s}s`, 40, y(s) + 5) }
for (let i = 0; i <= n; i += 500) g.fillText(String(i), x(Math.min(i, n - 1)) - 12, H - B + 22)

g.fillStyle = 'rgba(46,160,67,0.08)'; g.fillRect(L, T, x(r.flushResolvedAt) - L, H - T - B)
r.arrivals.forEach((a, i) => {
  g.fillStyle = i < r.flushResolvedAt ? '#2ea043' : '#cf222e'
  g.fillRect(x(i) - 1, y(a.timestamp / 1e6) - 1, 2, 2)
})
g.strokeStyle = '#0969da'; g.lineWidth = 2; g.setLineDash([6, 4])
g.beginPath(); g.moveTo(x(r.flushResolvedAt), T); g.lineTo(x(r.flushResolvedAt), H - B); g.stroke(); g.setLineDash([])

g.fillStyle = '#111'; g.font = 'bold 18px sans-serif'
g.fillText(`@napi-rs/webcodecs AudioEncoder (AAC): chunk timestamp by arrival order, ${maxS}s input`, L, 32)
g.font = '14px sans-serif'; g.fillStyle = '#0969da'
g.fillText(`flush() resolved after ${r.flushResolvedAt} / ${n} chunks`, x(r.flushResolvedAt) + 8, T + 20)
g.fillStyle = '#2ea043'; g.fillText('received before flush() resolved', L + 10, H - B - 50); g.fillText(`→ written to MP4 (${r.packetsInMp4} packets)`, L + 10, H - B - 30)
g.fillStyle = '#cf222e'; g.fillText(`received after flush() resolved → not in MP4 (${n - r.flushResolvedAt} chunks)`, x(r.flushResolvedAt) + 8, H - B - 30)
const last = r.arrivals.at(-1).timestamp
r.arrivals.forEach((a, i) => {
  if (i >= r.flushResolvedAt || a.timestamp < last - 1) return
  g.strokeStyle = '#bf8700'; g.lineWidth = 2; g.beginPath(); g.arc(x(i), y(a.timestamp / 1e6), 9, 0, Math.PI * 2); g.stroke()
})
g.fillStyle = '#bf8700'
g.fillText('the final chunks (ts ≈ 95.98s, duration = 1024) arrive here,', x(r.flushResolvedAt) + 8, T + 44)
g.fillText('before ~3500 earlier chunks', x(r.flushResolvedAt) + 8, T + 62)
g.fillStyle = '#555'; g.fillText('arrival index', W / 2 - 40, H - 20)
g.save(); g.translate(18, H / 2 + 40); g.rotate(-Math.PI / 2); g.fillText('chunk.timestamp', 0, 0); g.restore()
writeFileSync('arrival-order.png', c.toBuffer('image/png'))
