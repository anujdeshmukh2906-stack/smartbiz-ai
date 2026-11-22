# Branded grocery catalogue references

The six built-in sample records use real retail brands, matching product pack
photos, and reference details. Product photos are displayed from their source
catalogue image hosts; the app does not create lookalike brand packaging or
bundle copyrighted retailer photographs. An internet connection is needed to
load these reference images. The app falls back to a product icon if a source
host changes or blocks an image.

The clickable source and image-source links are also stored on each product and
shown in Product details. Product labels can change by package size, region, or
batch. Always check the physical pack for ingredients, allergens, storage,
dates, and MRP. The sample shop selling price is kept separate from any
retailer-listed price. `Shop SKU` values beginning `SB-SAMPLE-` are internal
codes, not manufacturer barcodes.

| Sample item                   | Brand and pack reference                            | Photo source                                                                                                                                                      | Product details source                                                                                                      |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Amul Taaza Toned Milk         | 1 L Tetra Pak                                       | [Total Foods image](https://www.totalfoods.in/media/catalog/product/cache/8b4a49e9f6847b494363463d01b29018/3/1/31rwse1mzwl.jpg)                                   | [JioMart listing](https://www.jiomart.com/p/groceries/amul-taaza-homogenised-toned-long-life-milk-1-l-tetra-pak/490010311)  |
| India Gate Super Basmati Rice | 1 kg                                                | [KPN Fresh image](https://services.kpnfresh.com/media/v1/products/images/ec5a162e-68f4-43aa-bf42-1d6027901cd8/india-gate-super-basmati-rice.webp?c_type=C2)       | [Zepto listing](https://www.zepto.com/pn/india-gate-basmati-rice-super/pvid/09e2efe9-b663-46ed-9d94-bc482f5a3ee8)           |
| Britannia Brown Bread         | 400 g                                               | [BigBasket image](https://www.bbassets.com/media/uploads/p/l/40092241_8-britannia-brown-bread-with-goodness-of-wheat-enriched-with-vitamins.jpg)                  | [Zepto listing](https://www.zepto.com/pn/britannia-brown-bread/pvid/9df86bf5-25f9-46e2-bc1d-4d2742ca2f2e)                   |
| Fortune Sunlite Sunflower Oil | 1 L bottle                                          | [BigBasket image](https://www.bbassets.com/media/uploads/p/l/40161771_7-fortune-sunflower-oil.jpg)                                                                | [Fortune Foods product page](https://www.fortunefoods.com/oil/fortune-sunlite-sunflower-oil/)                               |
| Epigamia Natural Greek Yogurt | 90 g reference cup (current listings may show 85 g) | [Retail product image](https://rukminim1.flixcart.com/image/400/400/jhwazrk0/curd-yogurt/c/j/2/90-greek-natural-cup-epigamia-original-imaf5st72aaytkkm.jpeg?q=90) | [Zepto listing](https://www.zepto.com/pn/epigamia-natural-greek-flavoured-yogurt/pvid/d511102d-e29c-4c7d-86c7-671c9e78ae2b) |
| Tata Tea Gold                 | 250 g pouch                                         | [Vridhistores image](https://www.vridhistores.com/uploads/2023/May/products/16843049731290.jpg)                                                                   | [JioMart listing](https://www.jiomart.com/p/groceries/tata-gold-tea-250-g/490001340)                                        |

On first server startup, the catalogue migration updates only the six
matching untouched seed products. It preserves the shop's selling prices,
quantities, batches, and transaction history. Products renamed or customized by
the owner are left as they are.
