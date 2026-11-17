// Genera versiones ligeras de las fotos del sitio para que cada pantalla
// descargue solo el tamaño que necesita.
//
//   npm run optimize:images
//
// - public/img/**/*.jpg|png → foto-640.webp, foto-1280.webp, foto-1920.webp
//   (solo los anchos menores o iguales al original) y la lista
//   src/features/public/imageVariants.json que usa el componente Photo.
// - public/escudo.png → escudo-96.png (logo), escudo-32.png (favicon) y
//   escudo-180.png (ícono de iPhone/iPad), mucho más ligeros que el original.
//
// Es seguro ejecutarlo varias veces: solo regenera lo que falte o haya cambiado.
import { readdir, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import sharp from 'sharp'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const publicDir = join(root, 'public')
const widths = [640, 1280, 1920]

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

async function newer(source, target) {
  try { return (await stat(source)).mtimeMs > (await stat(target)).mtimeMs } catch { return true }
}

const manifest = {}
let created = 0
for await (const file of walk(join(publicDir, 'img'))) {
  if (!/\.(jpe?g|png)$/i.test(file)) continue
  const { width = 0 } = await sharp(file).metadata()
  const sizes = widths.filter((size) => size <= width)
  if (!sizes.length || sizes.at(-1) < width) sizes.push(Math.min(width, 1920))
  const unique = [...new Set(sizes)]
  for (const size of unique) {
    const target = file.replace(/\.[a-z]+$/i, `-${size}.webp`)
    if (!(await newer(file, target))) continue
    await sharp(file).resize({ width: size, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(target)
    created += 1
  }
  manifest['/' + relative(publicDir, file).replace(/\\/g, '/')] = unique
}

const emblem = join(publicDir, 'escudo.png')
for (const size of [32, 96, 180]) {
  const target = join(publicDir, `escudo-${size}.png`)
  if (!(await newer(emblem, target))) continue
  await sharp(emblem).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(target)
  created += 1
}

const manifestFile = join(root, 'src', 'features', 'public', 'imageVariants.json')
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Listo: ${created} archivo(s) generado(s); ${Object.keys(manifest).length} foto(s) en ${relative(root, manifestFile)}.`)
