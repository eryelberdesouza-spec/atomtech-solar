// Gera ícones PNG para PWA a partir do SVG usando sharp
import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/atomtech-icon.svg')

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

for (const { size, name } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`./public/${name}`)
  console.log(`✅ ${name}`)
}
