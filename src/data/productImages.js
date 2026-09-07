// GENERATED FILE - do not edit.
// Run: node scripts/generate-product-seed.mjs
//
// A catalogue read from the database carries products.image_url. For the seeded shop that is the
// key of a photograph bundled into the app rather than a URL, because these are Unsplash images
// built into the bundle - see src/assets/img/ATTRIBUTION.md. This maps the key back to the
// imported asset. Anything that is not a key here (a real URL, once the shop photographs its own
// stock) is passed through untouched by productImage() below.
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
import headphones from '@/assets/img/headphones.jpg'
import earbuds from '@/assets/img/earbuds.jpg'
import earpods from '@/assets/img/earpods.jpg'
import speaker from '@/assets/img/speaker.jpg'
import watch from '@/assets/img/watch.jpg'
import fitnessBand from '@/assets/img/fitness-band.jpg'
import charger from '@/assets/img/charger.jpg'
import powerbank from '@/assets/img/powerbank.jpg'
import phoneCase from '@/assets/img/phone-case.jpg'
import mouse from '@/assets/img/mouse.jpg'
import keyboard from '@/assets/img/keyboard.jpg'
import laptopSleeve from '@/assets/img/laptop-sleeve.jpg'
import appleWatch from '@/assets/img/apple-watch.jpg'
import airpods from '@/assets/img/airpods.jpg'
import sonyHeadphones from '@/assets/img/sony-headphones.jpg'
import thinkpad from '@/assets/img/thinkpad.jpg'

export const PRODUCT_IMAGES = {
  macbook,
  macbookPro,
  macbookAirM2,
  iphone,
  iphoneTrio,
  samsung,
  pixel,
  laptop,
  dellXps,
  gamingLaptop,
  tabletIpad,
  tabletAndroid,
  tabletMini,
  headphones,
  earbuds,
  earpods,
  speaker,
  watch,
  fitnessBand,
  charger,
  powerbank,
  phoneCase,
  mouse,
  keyboard,
  laptopSleeve,
  appleWatch,
  airpods,
  sonyHeadphones,
  thinkpad,
}

export function productImage(imageUrl) {
  if (!imageUrl) return null
  return PRODUCT_IMAGES[imageUrl] ?? imageUrl
}
