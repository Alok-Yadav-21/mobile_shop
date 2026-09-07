-- GENERATED FILE - do not edit.
-- Run: node scripts/generate-product-seed.mjs
-- Source of truth: src/data/products.js (29 products)
--
-- image_url is null on purpose: the app ships the product photographs as local assets built into
-- the bundle, not as URLs. See src/assets/img/ATTRIBUTION.md, and the warning there that both the
-- photographs and the brand names have to match real stock before trading.

insert into products (name, brand, price, was_price, condition, rating, description, category_id)
select v.name, v.brand, v.price, v.was_price, v.condition, v.rating, v.description, c.id
from (values
  ('MacBook Air 13" (refurbished)', 'Apple', 749, null, 'Refurbished', 4.9, 'Apple M1, 8GB memory, 256GB SSD. Diagnostic-checked, battery health above 85%, cleaned and reset by our technicians. Light marks on the lid consistent with normal use. Includes a 3-month warranty and a charger.', 'MacBooks'),
  ('MacBook Pro 14"', 'Apple', 1299, null, 'Used', 4.9, 'M1 Pro, 16GB memory, 512GB SSD. A trade-in from a customer, fully wiped and tested. Screen and body in very good condition; the underside has a few small scuffs. Charger included.', 'MacBooks'),
  ('MacBook Air 15" (M2)', 'Apple', 1049, 1149, 'New', 4.8, 'Sealed, current-generation M2 with 8GB memory and a 256GB SSD. Full manufacturer warranty, and we will transfer your data from an old machine free of charge when you collect.', 'MacBooks'),
  ('iPhone 14 — 128GB', 'Apple', 579, null, 'Used', 4.8, 'Unlocked to all networks, 128GB, battery health 89%. Glass front and back are clean with no cracks; the frame shows light wear at the corners. Sold with a charging cable and a 30-day return.', 'iPhones'),
  ('iPhone 13 — 128GB', 'Apple', 449, 499, 'Refurbished', 4.7, 'Unlocked, 128GB, in three colours. Every unit is opened, tested against our 40-point check, and fitted with a new battery if health is below 85%. Three-month warranty included.', 'iPhones'),
  ('Samsung Galaxy S23', 'Samsung', 529, null, 'Used', 4.6, '256GB, unlocked, available in phantom black, green, cream or lavender. Screens are original Samsung panels with no burn-in. Minor edge wear on some units — ask the branch which colours are in stock.', 'Smartphones'),
  ('Google Pixel 7', 'Google', 329, null, 'Refurbished', 4.5, '128GB, unlocked, with Google’s camera processing and guaranteed OS updates into 2028. Refurbished in branch: new screen protector, tested cameras and charging port, three-month warranty.', 'Smartphones'),
  ('Ultrabook 14"', 'Acer', 699, null, 'New', 4.5, 'Intel Core i5, 16GB memory, 512GB SSD, all-day battery in a sub-1.4kg chassis. A sensible everyday laptop for study or office work. Windows 11 installed and updated before collection.', 'Laptops'),
  ('Dell XPS 13', 'Dell', 849, null, 'Refurbished', 4.7, 'Core i7, 16GB memory, 512GB SSD with a near-borderless display. Ex-business stock, professionally refurbished: new battery, replaced keyboard, clean Windows install. Three-month warranty.', 'Laptops'),
  ('Gaming Laptop 15.6" RTX', 'Virktech', 1149, 1299, 'New', 4.6, 'Ryzen 7 with an RTX graphics card, 16GB memory, 1TB SSD and a 144Hz screen. Built for gaming and video work. We will fit extra memory or storage at cost while you wait.', 'Laptops'),
  ('iPad Air (refurbished)', 'Apple', 429, null, 'Refurbished', 4.8, '10.9-inch, 64GB, Wi-Fi. Battery replaced where it fell below 85%, screen checked for dead pixels, and reset to factory settings. Apple Pencil sold separately. Three-month warranty.', 'Tablets'),
  ('Galaxy Tab S9', 'Samsung', 379, 429, 'New', 4.6, '11-inch AMOLED, 128GB, Wi-Fi, with the S Pen included in the box. Sealed and covered by the full manufacturer warranty. A good pairing with a Galaxy phone for notes and drawing.', 'Tablets'),
  ('iPad mini 6', 'Apple', 319, null, 'Used', 4.7, '8.3-inch, 64GB, Wi-Fi. A customer trade-in, wiped and tested. Screen is unmarked; the aluminium back has a small dent at one corner, which is why it is priced below our refurbished stock.', 'Tablets'),
  ('Over-ear Headphones', 'Virktech', 129, 149, 'New', 4.6, 'Active noise cancelling, around 30 hours of battery, Bluetooth 5.3 with a wired option for flights. Folds flat into the case supplied. Try a pair at the counter before you buy.', 'Audio'),
  ('Wireless Earbuds Pro', 'Virktech', 99, 129, 'New', 4.8, 'In-ear noise cancelling with a wireless charging case, roughly 6 hours per charge and 24 with the case. IPX4 water resistant, so fine for the gym and the rain. Three ear-tip sizes included.', 'Audio'),
  ('True Wireless Earbuds', 'Virktech', 59, null, 'New', 4.4, 'A straightforward everyday pair with a compact charging case and USB-C. No noise cancelling at this price, but clear call quality and a secure fit. Popular as a spare set or a first pair.', 'Audio'),
  ('Bluetooth Speaker', 'Virktech', 59, null, 'New', 4.7, 'Portable, IPX7 waterproof, about 12 hours of playback, and it pairs with a second unit for stereo. Survives a garden, a beach and a bathroom shelf. Charges over USB-C.', 'Audio'),
  ('Smartwatch Series X', 'Virktech', 199, null, 'New', 4.7, 'Heart rate, sleep and workout tracking with GPS, on a two-day battery. Sealed, with a spare strap in the box. Pairs with both iPhone and Android — tell us which and we will set it up.', 'Wearables'),
  ('Fitness Band', 'Virktech', 39, 49, 'New', 4.3, 'Step, heart rate and sleep tracking with two weeks of battery between charges. Light enough to wear overnight. A sensible first tracker, and the cheapest way to see if you will use one.', 'Wearables'),
  ('USB-C Fast Charging Cable', 'Virktech', 12, null, 'New', 4.5, 'Braided 2-metre USB-C cable rated for 60W, so it charges a phone, a tablet and most laptops. Tested to survive being wound round a plug. Twelve-month replacement if it fails.', 'Accessories'),
  ('Power Bank 20,000mAh', 'Virktech', 34, 44, 'New', 4.6, 'Enough for roughly four phone charges, with fast charging on two ports at once and a USB-C input. Airline-safe capacity. Worth having in a bag before a long day rather than after one.', 'Accessories'),
  ('Protective Phone Case', 'Virktech', 15, null, 'New', 4.4, 'Shock-absorbing case with a raised lip over the screen and camera, in four colours. We stock cases for most recent iPhone and Galaxy models — bring your phone in and we will match it.', 'Accessories'),
  ('Wireless Mouse', 'Virktech', 19, null, 'New', 4.3, 'Silent-click wireless mouse with a USB-C rechargeable battery that lasts about two months. Works on glass and fabric. Pairs over Bluetooth or the bundled dongle, so it suits an older laptop too.', 'Accessories'),
  ('Wireless Keyboard', 'Virktech', 29, 35, 'New', 4.4, 'Low-profile UK-layout keyboard, Bluetooth to three devices at once with a key to switch between them. Runs months on a charge. Handy if you use a laptop docked at a desk.', 'Accessories'),
  ('Laptop Sleeve 13-14"', 'Virktech', 22, null, 'New', 4.5, 'Padded felt sleeve that fits a 13 to 14-inch laptop, with a pocket for a charger. Slips inside a rucksack rather than replacing one. The cheapest way to stop the scuffs we see most often.', 'Accessories'),
  ('Apple Watch Series 9', 'Apple', 329, null, 'Refurbished', 4.8, '41mm GPS, aluminium case with a sport band. Refurbished in branch: new battery where health was below 85%, screen checked, and reset. Pairs with iPhone only. Three-month warranty.', 'Wearables'),
  ('AirPods Pro (2nd gen)', 'Apple', 179, 229, 'Used', 4.7, 'Active noise cancelling with the MagSafe charging case. A trade-in: both buds tested and sanitised, case holds charge normally. Ear tips are new. Sold with a 30-day return.', 'Audio'),
  ('Sony On-ear Headphones', 'Sony', 35, null, 'New', 4.4, 'Lightweight wired on-ear pair with a 3.5mm jack — no charging, no pairing, nothing to go flat. Folds for a bag. A sensible spare set, and it still works with a laptop or a mixing desk.', 'Audio'),
  ('ThinkPad T-series 15"', 'Lenovo', 579, 649, 'Refurbished', 4.6, 'Core i5, 16GB memory, 512GB SSD. Ex-corporate stock with the keyboard ThinkPads are bought for. Refurbished here: new battery, clean Windows 11 install, ports and fingerprint reader tested. Three-month warranty.', 'Laptops')
) as v(name, brand, price, was_price, condition, rating, description, category_name)
join categories c on c.name = v.category_name
where not exists (select 1 from products p where p.name = v.name);
