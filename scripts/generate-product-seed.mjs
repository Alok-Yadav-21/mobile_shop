// Regenerate supabase/seed/products.generated.sql from src/data/products.js.
//
//   node scripts/generate-product-seed.mjs
//
// The seed used to carry a hand-written list of eight products while the app shipped twenty-nine,
// with different names, no brands and no descriptions. Anyone standing the database up got a
// different shop from the one in the demo. Hand-copying it again would just restart that drift,
// so the catalogue is generated from the file the app itself reads.
//
// products.js imports its images as Vite asset modules, which node cannot resolve, so the array
// is read out of the source text with those references neutralised rather than imported.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'src/data/products.js'), 'utf8')

function arrayLiteral(name) {
  const start = source.indexOf(`export const ${name} = [`)
  if (start === -1) throw new Error(`${name} not found in src/data/products.js`)
  const open = source.indexOf('[', start)
  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1
    else if (source[i] === ']') {
      depth -= 1
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  throw new Error(`Unterminated ${name} array`)
}

// `img: macbook` refers to an asset Vite imports and node cannot, so the identifier is kept as a
// string. It becomes products.image_url, and src/data/productImages.js (also generated here)
// turns it back into the bundled photograph when the catalogue is read from the database.
//
// A real URL survives this untouched, which is the point: when the shop replaces these stock
// photographs with pictures of its own stock and uploads them, image_url holds the URL and the
// lookup simply does not find a key to swap.
const products = new Function(`return ${arrayLiteral('PRODUCTS').replace(/img\s*:\s*([A-Za-z_$][\w$]*)/g, "img: '$1'")}`)()
const categories = new Function(`return ${arrayLiteral('CATEGORIES')}`)()

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v == null ? 'null' : Number(v))

// The same figure the mock adapter derives, so a database-backed shop opens with the same stock
// on the shelf as the demo rather than everything reading "out of stock".
const stockFor = (i) => 8 + (i % 5) * 3

const rows = products.map((p, i) => {
  if (!categories.includes(p.category)) throw new Error(`${p.id} has category "${p.category}", which is not in CATEGORIES`)
  return `  (${q(p.name)}, ${q(p.brand)}, ${n(p.price)}, ${n(p.was)}, ${q(p.cond)}, ${n(p.rating)}, ${q(p.desc)}, ${q(p.img)}, ${stockFor(i)}, ${q(p.category)})`
})

const sql = `-- GENERATED FILE - do not edit.
-- Run: node scripts/generate-product-seed.mjs
-- Source of truth: src/data/products.js (${products.length} products)
--
-- image_url holds the key of a photograph bundled into the app, not a URL: these are Unsplash
-- images built into the bundle rather than files on a server. src/data/productImages.js maps
-- them back. See src/assets/img/ATTRIBUTION.md, and the warning there that both the photographs
-- and the brand names have to match real stock before trading - at which point these become
-- ordinary URLs and the lookup stops finding anything to swap.

insert into products (name, brand, price, was_price, condition, rating, description, image_url, stock, category_id)
select v.name, v.brand, v.price, v.was_price, v.condition, v.rating, v.description, v.image_url, v.stock, c.id
from (values
${rows.join(',\n')}
) as v(name, brand, price, was_price, condition, rating, description, image_url, stock, category_name)
join categories c on c.name = v.category_name
where not exists (select 1 from products p where p.name = v.name);
`

writeFileSync(join(root, 'supabase/seed/products.generated.sql'), sql)

// The other half: turning that key back into the photograph. Generated from the same source in
// the same run, so the two cannot drift apart.
const keys = [...new Set(products.map((p) => p.img).filter(Boolean))]
const js = `// GENERATED FILE - do not edit.
// Run: node scripts/generate-product-seed.mjs
//
// A catalogue read from the database carries products.image_url. For the seeded shop that is the
// key of a photograph bundled into the app rather than a URL, because these are Unsplash images
// built into the bundle - see src/assets/img/ATTRIBUTION.md. This maps the key back to the
// imported asset. Anything that is not a key here (a real URL, once the shop photographs its own
// stock) is passed through untouched by productImage() below.
${keys.map((k) => `import ${k} from '@/assets/img/${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}.jpg'`).join('\n')}

export const PRODUCT_IMAGES = {
${keys.map((k) => `  ${k},`).join('\n')}
}

export function productImage(imageUrl) {
  if (!imageUrl) return null
  return PRODUCT_IMAGES[imageUrl] ?? imageUrl
}
`
writeFileSync(join(root, 'src/data/productImages.js'), js)

console.log(`Wrote supabase/seed/products.generated.sql — ${products.length} products across ${categories.length} categories.`)
console.log(`Wrote src/data/productImages.js — ${keys.length} photographs.`)
