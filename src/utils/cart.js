// Pure cart math, kept separate from CartContext so it's testable without React.
export function buildCartLines(items, products){
  return items
    .map(i => ({ ...i, product: products.find(p => p.id === i.productId) }))
    .filter(l => l.product)
}
export function cartCount(items){
  return items.reduce((n, i) => n + i.quantity, 0)
}
export function cartSubtotal(lines){
  return lines.reduce((n, l) => n + l.product.price * l.quantity, 0)
}
