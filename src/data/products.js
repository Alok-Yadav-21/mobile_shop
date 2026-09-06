import macbook from '@/assets/img/macbook.jpg'
import macbookPro from '@/assets/img/macbook-pro.jpg'
import macbookAirM2 from '@/assets/img/macbook-air-m2.jpg'
import iphone from '@/assets/img/iphone.jpg'
import iphoneTrio from '@/assets/img/iphone-trio.jpg'
import samsung from '@/assets/img/samsung.jpg'
import pixel from '@/assets/img/pixel.jpg'
import laptop from '@/assets/img/laptop.jpg'
import dellXps from '@/assets/img/dell-xps.jpg'
import gamingLaptop from '@/assets/img/gaming-laptop.jpg'
import tabletIpad from '@/assets/img/tablet-ipad.jpg'
import tabletAndroid from '@/assets/img/tablet-android.jpg'
import tabletMini from '@/assets/img/tablet-mini.jpg'
import watch from '@/assets/img/watch.jpg'
import fitnessBand from '@/assets/img/fitness-band.jpg'
import headphones from '@/assets/img/headphones.jpg'
import earbuds from '@/assets/img/earbuds.jpg'
import earpods from '@/assets/img/earpods.jpg'
import speaker from '@/assets/img/speaker.jpg'
import charger from '@/assets/img/charger.jpg'
import powerbank from '@/assets/img/powerbank.jpg'
import phoneCase from '@/assets/img/phone-case.jpg'

// The shelf. Every image is an Unsplash photo under the Unsplash Licence — see
// src/assets/img/ATTRIBUTION.md for the photo id behind each file and the note about
// replacing them with photographs of real stock before trading.
//
// `desc` is what the customer reads on the product page. Written to say what the thing is and
// what condition it is in, because more than half of this catalogue is second-hand and that is
// the fact a buyer is actually weighing up. A description that only lists specifications tells
// somebody nothing they could not get from the title.
export const PRODUCTS = [
  // --- MacBooks -------------------------------------------------------------------------------
  { id:'p1', name:'MacBook Air 13" (refurbished)', category:'MacBooks', price:749, cond:'Refurbished', img:macbook, rating:4.9,
    desc:'Apple M1, 8GB memory, 256GB SSD. Diagnostic-checked, battery health above 85%, cleaned and reset by our technicians. Light marks on the lid consistent with normal use. Includes a 3-month warranty and a charger.' },
  { id:'p11', name:'MacBook Pro 14"', category:'MacBooks', price:1299, cond:'Used', img:macbookPro, rating:4.9,
    desc:'M1 Pro, 16GB memory, 512GB SSD. A trade-in from a customer, fully wiped and tested. Screen and body in very good condition; the underside has a few small scuffs. Charger included.' },
  { id:'p12', name:'MacBook Air 15" (M2)', category:'MacBooks', price:1049, was:1149, cond:'New', img:macbookAirM2, rating:4.8,
    desc:'Sealed, current-generation M2 with 8GB memory and a 256GB SSD. Full manufacturer warranty, and we will transfer your data from an old machine free of charge when you collect.' },

  // --- iPhones --------------------------------------------------------------------------------
  { id:'p2', name:'iPhone 14 — 128GB', category:'iPhones', price:579, cond:'Used', img:iphone, rating:4.8,
    desc:'Unlocked to all networks, 128GB, battery health 89%. Glass front and back are clean with no cracks; the frame shows light wear at the corners. Sold with a charging cable and a 30-day return.' },
  { id:'p13', name:'iPhone 13 — 128GB', category:'iPhones', price:449, was:499, cond:'Refurbished', img:iphoneTrio, rating:4.7,
    desc:'Unlocked, 128GB, in three colours. Every unit is opened, tested against our 40-point check, and fitted with a new battery if health is below 85%. Three-month warranty included.' },

  // --- Smartphones ----------------------------------------------------------------------------
  { id:'p7', name:'Samsung Galaxy S23', category:'Smartphones', price:529, cond:'Used', img:samsung, rating:4.6,
    desc:'256GB, unlocked, available in phantom black, green, cream or lavender. Screens are original Samsung panels with no burn-in. Minor edge wear on some units — ask the branch which colours are in stock.' },
  { id:'p14', name:'Google Pixel 7', category:'Smartphones', price:329, cond:'Refurbished', img:pixel, rating:4.5,
    desc:'128GB, unlocked, with Google’s camera processing and guaranteed OS updates into 2028. Refurbished in branch: new screen protector, tested cameras and charging port, three-month warranty.' },

  // --- Laptops --------------------------------------------------------------------------------
  { id:'p5', name:'Ultrabook 14"', category:'Laptops', price:699, cond:'New', img:laptop, rating:4.5,
    desc:'Intel Core i5, 16GB memory, 512GB SSD, all-day battery in a sub-1.4kg chassis. A sensible everyday laptop for study or office work. Windows 11 installed and updated before collection.' },
  { id:'p15', name:'Dell XPS 13', category:'Laptops', price:849, cond:'Refurbished', img:dellXps, rating:4.7,
    desc:'Core i7, 16GB memory, 512GB SSD with a near-borderless display. Ex-business stock, professionally refurbished: new battery, replaced keyboard, clean Windows install. Three-month warranty.' },
  { id:'p16', name:'Gaming Laptop 15.6" RTX', category:'Laptops', price:1149, was:1299, cond:'New', img:gamingLaptop, rating:4.6,
    desc:'Ryzen 7 with an RTX graphics card, 16GB memory, 1TB SSD and a 144Hz screen. Built for gaming and video work. We will fit extra memory or storage at cost while you wait.' },

  // --- Tablets --------------------------------------------------------------------------------
  { id:'p9', name:'iPad Air (refurbished)', category:'Tablets', price:429, cond:'Refurbished', img:tabletIpad, rating:4.8,
    desc:'10.9-inch, 64GB, Wi-Fi. Battery replaced where it fell below 85%, screen checked for dead pixels, and reset to factory settings. Apple Pencil sold separately. Three-month warranty.' },
  { id:'p10', name:'Galaxy Tab S9', category:'Tablets', price:379, was:429, cond:'New', img:tabletAndroid, rating:4.6,
    desc:'11-inch AMOLED, 128GB, Wi-Fi, with the S Pen included in the box. Sealed and covered by the full manufacturer warranty. A good pairing with a Galaxy phone for notes and drawing.' },
  { id:'p17', name:'iPad mini 6', category:'Tablets', price:319, cond:'Used', img:tabletMini, rating:4.7,
    desc:'8.3-inch, 64GB, Wi-Fi. A customer trade-in, wiped and tested. Screen is unmarked; the aluminium back has a small dent at one corner, which is why it is priced below our refurbished stock.' },

  // --- Audio ----------------------------------------------------------------------------------
  { id:'p3', name:'Over-ear Headphones', category:'Audio', price:129, was:149, cond:'New', img:headphones, rating:4.6,
    desc:'Active noise cancelling, around 30 hours of battery, Bluetooth 5.3 with a wired option for flights. Folds flat into the case supplied. Try a pair at the counter before you buy.' },
  { id:'p6', name:'Wireless Earbuds Pro', category:'Audio', price:99, was:129, cond:'New', img:earbuds, rating:4.8,
    desc:'In-ear noise cancelling with a wireless charging case, roughly 6 hours per charge and 24 with the case. IPX4 water resistant, so fine for the gym and the rain. Three ear-tip sizes included.' },
  { id:'p18', name:'True Wireless Earbuds', category:'Audio', price:59, cond:'New', img:earpods, rating:4.4,
    desc:'A straightforward everyday pair with a compact charging case and USB-C. No noise cancelling at this price, but clear call quality and a secure fit. Popular as a spare set or a first pair.' },
  { id:'p8', name:'Bluetooth Speaker', category:'Audio', price:59, cond:'New', img:speaker, rating:4.7,
    desc:'Portable, IPX7 waterproof, about 12 hours of playback, and it pairs with a second unit for stereo. Survives a garden, a beach and a bathroom shelf. Charges over USB-C.' },

  // --- Wearables ------------------------------------------------------------------------------
  { id:'p4', name:'Smartwatch Series X', category:'Wearables', price:199, cond:'New', img:watch, rating:4.7,
    desc:'Heart rate, sleep and workout tracking with GPS, on a two-day battery. Sealed, with a spare strap in the box. Pairs with both iPhone and Android — tell us which and we will set it up.' },
  { id:'p19', name:'Fitness Band', category:'Wearables', price:39, was:49, cond:'New', img:fitnessBand, rating:4.3,
    desc:'Step, heart rate and sleep tracking with two weeks of battery between charges. Light enough to wear overnight. A sensible first tracker, and the cheapest way to see if you will use one.' },

  // --- Accessories ----------------------------------------------------------------------------
  { id:'p20', name:'USB-C Fast Charging Cable', category:'Accessories', price:12, cond:'New', img:charger, rating:4.5,
    desc:'Braided 2-metre USB-C cable rated for 60W, so it charges a phone, a tablet and most laptops. Tested to survive being wound round a plug. Twelve-month replacement if it fails.' },
  { id:'p21', name:'Power Bank 20,000mAh', category:'Accessories', price:34, was:44, cond:'New', img:powerbank, rating:4.6,
    desc:'Enough for roughly four phone charges, with fast charging on two ports at once and a USB-C input. Airline-safe capacity. Worth having in a bag before a long day rather than after one.' },
  { id:'p22', name:'Protective Phone Case', category:'Accessories', price:15, cond:'New', img:phoneCase, rating:4.4,
    desc:'Shock-absorbing case with a raised lip over the screen and camera, in four colours. We stock cases for most recent iPhone and Galaxy models — bring your phone in and we will match it.' },
]

export const CATEGORIES = ['iPhones','Smartphones','Laptops','MacBooks','Tablets','Audio','Wearables','Accessories']
