# Product image credits

Every image in this folder comes from [Unsplash](https://unsplash.com) and is used under the
[Unsplash Licence](https://unsplash.com/license): free for commercial and non-commercial use, no
permission needed, attribution appreciated but not required. This file exists so the provenance
of each file is recorded rather than assumed — the set that was here before had none, so there
was no way to answer "where did this come from?".

They are downloaded into the repo rather than hot-linked to the Unsplash CDN. A hot-linked image
can change or disappear under you, adds a third party to every page load, and tells that third
party who is visiting your shop.

All are cropped server-side to 1200×675, because the product card renders a wide strip (`h-44`,
`object-cover`) and a portrait photo loses its subject to the crop.

| File | Unsplash photo | Subject |
|---|---|---|
| `macbook.jpg` | `photo-1541807084-5c52b6b3adef` | Open MacBook Air on a wooden desk |
| `macbook-pro.jpg` | `photo-1517336714731-489689fd1ca8` | Slightly opened silver MacBook |
| `iphone.jpg` | `photo-1591337676887-a217a6970a8a` | White smartphone, dual camera |
| `samsung.jpg` | `photo-1707438095940-1eee18e85400` | Four Galaxy handsets in different colours |
| `laptop.jpg` | `photo-1522199755839-a2bacb67c546` | Windows laptop on a table |
| `tablet-ipad.jpg` | `photo-1604399852419-f67ee7d5f2ef` | Tablet and stylus on a blue surface |
| `tablet-android.jpg` | `photo-1625864667534-aa5208d45a87` | White tablet on grey textile |
| `watch.jpg` | `photo-1523275335684-37898b6baf30` | Two white smartwatches |
| `headphones.jpg` | `photo-1505740420928-5e560c06d30e` | Over-ear headphones, flat lay |
| `earbuds.jpg` | `photo-1606220588913-b3aacb4d2f46` | Bluetooth earbuds |
| `earpods.jpg` | `photo-1606741965326-cb990ae01bb2` | Earbuds with charging case |
| `speaker.jpg` | `photo-1589003077984-894e133dabab` | Portable Bluetooth speaker |
| `macbook-air-m2.jpg` | `photo-1632079387592-91f5a4590197` | Silver laptop on a table |
| `iphone-trio.jpg` | `photo-1616410011236-7a42121dd981` | Three handsets in red, white and blue |
| `pixel.jpg` | `photo-1598965402089-897ce52e8355` | Black Android handset in hand |
| `dell-xps.jpg` | `photo-1593642702821-c8da6771f0c6` | Laptop on a white table |
| `gaming-laptop.jpg` | `photo-1603302576837-37561b2e2302` | Laptop with a bright colourful screen |
| `tablet-mini.jpg` | `photo-1637152736123-8a027366b07a` | Small tablet on a table |
| `fitness-band.jpg` | `photo-1576243345690-4e4b79b63288` | Fitness tracker band |
| `charger.jpg` | `photo-1603539444875-76e7684265f6` | White USB cable |
| `powerbank.jpg` | `photo-1566554738544-d962991c3fee` | Phone beside a power bank |
| `phone-case.jpg` | `photo-1535157412991-2ef801c1748b` | Four assorted phone cases |

Rebuild any of them with:

```bash
curl -o <file> "https://images.unsplash.com/<photo-id>?w=1200&h=675&fit=crop&crop=entropy&q=80&fm=jpg"
```

## Before this goes live

These are **stock photos of generic devices**, which is right for a demo and wrong for a real
listing — Virktech sells **used and refurbished** stock, where the photo is how a customer judges
condition. A stock image of a flawless handset next to "Used — £579" is a complaint waiting to
happen, and in the UK it risks falling foul of the Consumer Protection from Unfair Trading
Regulations. Photograph the actual unit before selling it.

Showing a manufacturer's product (an iPhone, a Galaxy) is fine for a shop that repairs and
resells them — that is nominative use. Do not use their logos as your own branding.
