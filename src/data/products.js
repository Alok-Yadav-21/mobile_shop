import macbook from '@/assets/img/macbook.jpg'
import iphone from '@/assets/img/iphone.jpg'
import headphones from '@/assets/img/headphones.jpg'
import watch from '@/assets/img/watch.jpg'
import laptop from '@/assets/img/laptop.jpg'
import earbuds from '@/assets/img/earbuds.jpg'
import samsung from '@/assets/img/samsung.jpg'
import speaker from '@/assets/img/speaker.jpg'

export const PRODUCTS = [
  { id:'p1', name:'MacBook Air (refurbished)', category:'MacBooks', price:749, cond:'Refurbished', img:macbook, rating:4.9 },
  { id:'p2', name:'iPhone 14 — 128GB', category:'iPhones', price:579, cond:'Used', img:iphone, rating:4.8 },
  { id:'p3', name:'Over-ear Headphones', category:'Audio', price:129, was:149, cond:'New', img:headphones, rating:4.6 },
  { id:'p4', name:'Smartwatch Series X', category:'Wearables', price:199, cond:'New', img:watch, rating:4.7 },
  { id:'p5', name:'Ultrabook 14"', category:'Laptops', price:699, cond:'New', img:laptop, rating:4.5 },
  { id:'p6', name:'Wireless Earbuds Pro', category:'Audio', price:99, was:129, cond:'New', img:earbuds, rating:4.8 },
  { id:'p7', name:'Samsung Galaxy S23', category:'Smartphones', price:529, cond:'Used', img:samsung, rating:4.6 },
  { id:'p8', name:'Bluetooth Speaker', category:'Accessories', price:59, cond:'New', img:speaker, rating:4.7 },
]
export const CATEGORIES = ['iPhones','Smartphones','Laptops','MacBooks','Tablets','Audio','Wearables','Accessories']
