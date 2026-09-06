import macbook from '@/assets/img/macbook.jpg'
import iphone from '@/assets/img/iphone.jpg'
import headphones from '@/assets/img/headphones.jpg'
import watch from '@/assets/img/watch.jpg'
import laptop from '@/assets/img/laptop.jpg'
import earbuds from '@/assets/img/earbuds.jpg'
import samsung from '@/assets/img/samsung.jpg'
import speaker from '@/assets/img/speaker.jpg'
import macbookPro from '@/assets/img/macbook-pro.jpg'
import tabletIpad from '@/assets/img/tablet-ipad.jpg'
import tabletAndroid from '@/assets/img/tablet-android.jpg'

export const PRODUCTS = [
  { id:'p1', name:'MacBook Air (refurbished)', category:'MacBooks', price:749, cond:'Refurbished', img:macbook, rating:4.9 },
  { id:'p2', name:'iPhone 14 — 128GB', category:'iPhones', price:579, cond:'Used', img:iphone, rating:4.8 },
  { id:'p3', name:'Over-ear Headphones', category:'Audio', price:129, was:149, cond:'New', img:headphones, rating:4.6 },
  { id:'p4', name:'Smartwatch Series X', category:'Wearables', price:199, cond:'New', img:watch, rating:4.7 },
  { id:'p5', name:'Ultrabook 14"', category:'Laptops', price:699, cond:'New', img:laptop, rating:4.5 },
  { id:'p6', name:'Wireless Earbuds Pro', category:'Audio', price:99, was:129, cond:'New', img:earbuds, rating:4.8 },
  { id:'p7', name:'Samsung Galaxy S23', category:'Smartphones', price:529, cond:'Used', img:samsung, rating:4.6 },
  { id:'p8', name:'Bluetooth Speaker', category:'Accessories', price:59, cond:'New', img:speaker, rating:4.7 },
  // Tablets was in CATEGORIES with nothing in it, so the category filter led to an empty shelf.
  { id:'p9', name:'iPad Air (refurbished)', category:'Tablets', price:429, cond:'Refurbished', img:tabletIpad, rating:4.8 },
  { id:'p10', name:'Galaxy Tab S9', category:'Tablets', price:379, was:429, cond:'New', img:tabletAndroid, rating:4.6 },
  { id:'p11', name:'MacBook Pro 14"', category:'MacBooks', price:1299, cond:'Used', img:macbookPro, rating:4.9 },
]
export const CATEGORIES = ['iPhones','Smartphones','Laptops','MacBooks','Tablets','Audio','Wearables','Accessories']
