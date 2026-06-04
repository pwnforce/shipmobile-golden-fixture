#!/usr/bin/env node
// golden-fixture/scripts/assert-not-blank.js
//
// The literal "no white screen" gate (D-02). Reads a PNG screenshot captured from the
// emulator (`adb exec-out screencap -p > screen.png`) and EXITS NON-ZERO if the frame is
// blank / a single flat color. A genuine render paints many distinct colors; a white
// (or any single-color) screen collapses to ~1 distinct color.
//
// Dependency-light: decodes the PNG using only Node built-ins (`node:zlib` inflate). It
// supports the 8-bit RGB / RGBA truecolor PNGs that `screencap` produces. Samples pixels
// on a grid and asserts the count of DISTINCT quantized colors exceeds a threshold.
//
// Usage: node scripts/assert-not-blank.js screen.png
// Exit 0 = rendered (varied colors). Exit 1 = blank/white screen (or unreadable PNG).

import fs from 'node:fs'
import zlib from 'node:zlib'

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Minimum number of distinct (quantized) colors a real render must show. A flat/white
// frame yields 1; even a simple two-tone UI clears this. Tuned conservatively to avoid
// false positives on the stable fixture while still catching a single-color screen.
const MIN_DISTINCT_COLORS = 8

function fail(msg) {
  console.error(`assert-not-blank: FAIL — ${msg}`)
  process.exit(1)
}

function pass(msg) {
  console.log(`assert-not-blank: PASS — ${msg}`)
  process.exit(0)
}

function parsePng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    fail('not a PNG file (bad signature)')
  }
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat = []

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const data = buf.subarray(dataStart, dataStart + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data.readUInt8(8)
      colorType = data.readUInt8(9)
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset = dataStart + len + 4 // skip data + CRC
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    fail(`unsupported PNG (bitDepth=${bitDepth}, colorType=${colorType}); expected 8-bit RGB/RGBA`)
  }
  const channels = colorType === 6 ? 4 : 3
  const raw = zlib.inflateSync(Buffer.concat(idat))
  return { width, height, channels, raw }
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

// Unfilter the scanlines in place, returning a contiguous pixel buffer (no filter bytes).
function unfilter({ width, height, channels, raw }) {
  const stride = width * channels
  const out = Buffer.alloc(stride * height)
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const rowStart = y * stride
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos++]
      const a = x >= channels ? out[rowStart + x - channels] : 0
      const b = y > 0 ? out[rowStart - stride + x] : 0
      const c = x >= channels && y > 0 ? out[rowStart - stride + x - channels] : 0
      let val
      switch (filter) {
        case 0: val = rawByte; break
        case 1: val = rawByte + a; break
        case 2: val = rawByte + b; break
        case 3: val = rawByte + ((a + b) >> 1); break
        case 4: val = rawByte + paeth(a, b, c); break
        default: fail(`unknown PNG filter type ${filter}`)
      }
      out[rowStart + x] = val & 0xff
    }
  }
  return { pixels: out, stride }
}

function main() {
  const file = process.argv[2]
  if (!file) fail('usage: assert-not-blank.js <screenshot.png>')
  let buf
  try {
    buf = fs.readFileSync(file)
  } catch (e) {
    fail(`could not read ${file}: ${e.message}`)
  }

  const png = parsePng(buf)
  const { pixels, stride } = unfilter(png)
  const { width, height, channels } = png

  // Sample on a grid (cap total samples for large screenshots). Quantize each color to
  // 5 bits/channel so anti-aliasing noise doesn't inflate the distinct-color count.
  const distinct = new Set()
  const stepX = Math.max(1, Math.floor(width / 64))
  const stepY = Math.max(1, Math.floor(height / 64))
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const idx = y * stride + x * channels
      const r = pixels[idx] >> 3
      const g = pixels[idx + 1] >> 3
      const b = pixels[idx + 2] >> 3
      distinct.add((r << 10) | (g << 5) | b)
    }
  }

  const count = distinct.size
  if (count < MIN_DISTINCT_COLORS) {
    fail(`blank/flat screen — only ${count} distinct color(s) (need >= ${MIN_DISTINCT_COLORS}). Likely a white screen.`)
  }
  pass(`${count} distinct colors across ${width}x${height} (>= ${MIN_DISTINCT_COLORS}).`)
}

main()
