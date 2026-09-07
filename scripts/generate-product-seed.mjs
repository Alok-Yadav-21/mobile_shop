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

// `img: macbook` refers to an imported asset; the seed leaves image_url null because the app
// ships the photographs as local files rather than URLs (see the note in seed.sql).
const products = new Function(`return ${arrayLiteral('PRODUCTS').replace(/img\s*:\s*[A-Za-z_$][\w$]*/g, 'img: null')}`)()
const categories = new Function(`return ${arrayLiteral('CATEGORIES')}`)()

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v == null ? 'null' : Number(v))

const rows = products.map((p) => {
  if (!categories.includes(p.category)) throw new Error(`${p.id} has category "${p.category}", which is not in CATEGORIES`)
  return `  (${q(p.name)}, ${q(p.brand)}, ${n(p.price)}, ${n(p.was)}, ${q(p.cond)}, ${n(p.rating)}, ${q(p.desc)}, ${q(p.category)})`
})

const sql = `-- GENERATED FILE - do not edit.
-- Run: node scripts/generate-product-seed.mjs
-- Source of truth: src/data/products.js (${products.length} products)
--
-- image_url is null on purpose: the app ships the product photographs as local assets built into
-- the bundle, not as URLs. See src/assets/img/ATTRIBUTION.md, and the warning there that both the
-- photographs and the brand names have to match real stock before trading.

insert into products (name, brand, price, was_price, condition, rating, description, category_id)
select v.name, v.brand, v.price, v.was_price, v.condition, v.rating, v.description, c.id
from (values
${rows.join(',\n')}
) as v(name, brand, price, was_price, condition, rating, description, category_name)
join categories c on c.name = v.category_name
where not exists (select 1 from products p where p.name = v.name);
`

writeFileSync(join(root, 'supabase/seed/products.generated.sql'), sql)
console.log(`Wrote supabase/seed/products.generated.sql — ${products.length} products across ${categories.length} categories.`)
