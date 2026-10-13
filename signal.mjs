// A 1 kHz beep for the first 100 ms of every second, so truncation and shifts are visible in a waveform.
export const sampleRate = 48000
export const numberOfChannels = 2

export function signalChunk(startFrame, frames) {
  const data = new Float32Array(frames * numberOfChannels)
  for (let i = 0; i < frames; i++) {
    const t = (startFrame + i) / sampleRate
    const v = t % 1 < 0.1 ? 0.5 * Math.sin(2 * Math.PI * 1000 * t) : 0
    for (let c = 0; c < numberOfChannels; c++) data[i * numberOfChannels + c] = v
  }
  return data
}
