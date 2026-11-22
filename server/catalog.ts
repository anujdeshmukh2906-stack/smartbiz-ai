import type { Product, State } from "./domain.ts";

export type RetailProduct = Partial<Product> & {
  id: string;
  legacyName: string;
  name: string;
  image: string;
};

// Public catalogue references are linked from their retailer listings.
// Keep image URLs separate from the source pages so the photo can be opened
// directly while the product facts remain traceable to a listing.
export const retailCatalog: RetailProduct[] = [
  {
    id: "p1",
    legacyName: "Whole milk 1L",
    name: "Amul Taaza Toned Milk",
    category: "Dairy",
    brand: "Amul",
    unit: "pack",
    packSize: "1 L · Tetra Pak",
    manufacturer: "Gujarat Cooperative Milk Marketing Federation Ltd.",
    countryOfOrigin: "India",
    productType: "Homogenised toned milk",
    description: "Long-life toned milk in a 1 litre carton.",
    ingredients: "Toned milk. Check the current carton for full label details.",
    storage: "Follow the storage directions printed on the current pack.",
    sourceUrl:
      "https://www.jiomart.com/p/groceries/amul-taaza-homogenised-toned-long-life-milk-1-l-tetra-pak/490010311",
    sourceLabel: "JioMart product listing",
    image:
      "https://www.totalfoods.in/media/catalog/product/cache/8b4a49e9f6847b494363463d01b29018/3/1/31rwse1mzwl.jpg",
    imageSourceUrl: "https://totalfoods.in/amul-taza-toned-milk-1lt.html",
  },
  {
    id: "p2",
    legacyName: "Basmati rice 1kg",
    name: "India Gate Super Basmati Rice",
    category: "Staples",
    brand: "India Gate",
    unit: "pack",
    packSize: "1 kg",
    manufacturer: "KRBL Limited",
    countryOfOrigin: "India",
    productType: "Aged basmati rice",
    description:
      "Long-grain basmati rice; retailer listing describes it as aged.",
    ingredients: "Rice",
    storage: "Store airtight in a cool, dry place.",
    sourceUrl:
      "https://www.zepto.com/pn/india-gate-basmati-rice-super/pvid/09e2efe9-b663-46ed-9d94-bc482f5a3ee8",
    sourceLabel: "Zepto product listing",
    image:
      "https://services.kpnfresh.com/media/v1/products/images/ec5a162e-68f4-43aa-bf42-1d6027901cd8/india-gate-super-basmati-rice.webp?c_type=C2",
    imageSourceUrl:
      "https://www.kpnfresh.com/india-gate-super-basmati-rice/p/10001504?outlet_id=OCHNMYL01",
  },
  {
    id: "p3",
    legacyName: "Brown bread",
    name: "Britannia Brown Bread",
    category: "Bakery",
    brand: "Britannia",
    unit: "pack",
    packSize: "400 g",
    manufacturer: "Britannia Industries Limited",
    countryOfOrigin: "India",
    productType: "Sliced brown bread",
    description: "Wheat bread loaf; package and recipe can vary by batch.",
    ingredients:
      "Wheat flour and other ingredients; use the current pack for the complete list.",
    allergens:
      "Contains wheat (gluten). Check the current pack for allergen advice.",
    storage: "Keep sealed in a cool, dry place and follow the pack date.",
    sourceUrl:
      "https://www.zepto.com/pn/britannia-brown-bread/pvid/9df86bf5-25f9-46e2-bc1d-4d2742ca2f2e",
    sourceLabel: "Zepto product listing",
    image:
      "https://www.bbassets.com/media/uploads/p/l/40092241_8-britannia-brown-bread-with-goodness-of-wheat-enriched-with-vitamins.jpg",
    imageSourceUrl:
      "https://www.bigbasket.com/pd/40092241/britannia-brown-bread-with-goodness-of-wheat-enriched-with-vitamins-400-g/",
  },
  {
    id: "p4",
    legacyName: "Sunflower oil 1L",
    name: "Fortune Sunlite Sunflower Oil",
    category: "Staples",
    brand: "Fortune",
    unit: "pack",
    packSize: "1 L bottle",
    manufacturer: "AWL Agri Business Limited (formerly Adani Wilmar Limited)",
    countryOfOrigin: "India",
    productType: "Refined sunflower oil",
    description: "Everyday refined sunflower cooking oil.",
    ingredients:
      "Refined sunflower oil. See the current bottle for full details.",
    storage: "Store in a dry place away from heat and direct sunlight.",
    sourceUrl:
      "https://www.fortunefoods.com/oil/fortune-sunlite-sunflower-oil/",
    sourceLabel: "Fortune Foods product page",
    image:
      "https://www.bbassets.com/media/uploads/p/l/40161771_7-fortune-sunflower-oil.jpg",
    imageSourceUrl:
      "https://www.bigbasket.com/pd/40161771/fortune-sunflower-oil-1-l-bottle/",
  },
  {
    id: "p5",
    legacyName: "Greek yogurt",
    name: "Epigamia Natural Greek Yogurt",
    category: "Dairy",
    brand: "Epigamia",
    unit: "pack",
    packSize: "90 g cup (listing size; pack variants may differ)",
    manufacturer: "Drums Food International Pvt. Ltd.",
    countryOfOrigin: "India",
    productType: "Natural Greek yogurt",
    description: "Plain natural Greek yogurt in a single-serve cup.",
    ingredients:
      "Refer to the current cup label for ingredients and allergen information.",
    allergens: "Milk. Confirm from the current package label.",
    storage: "Keep refrigerated; follow the use-by date on the actual cup.",
    sourceUrl:
      "https://www.zepto.com/pn/epigamia-natural-greek-flavoured-yogurt/pvid/d511102d-e29c-4c7d-86c7-671c9e78ae2b",
    sourceLabel: "Zepto product listing",
    image:
      "https://rukminim1.flixcart.com/image/400/400/jhwazrk0/curd-yogurt/c/j/2/90-greek-natural-cup-epigamia-original-imaf5st72aaytkkm.jpeg?q=90",
    imageSourceUrl:
      "https://www.paisawapas.com/p-epigamia-greek-plain-yogurt-natural90-g-12137084",
  },
  {
    id: "p6",
    legacyName: "Assam tea 250g",
    name: "Tata Tea Gold",
    category: "Beverages",
    brand: "Tata Tea",
    unit: "pack",
    packSize: "250 g pouch",
    manufacturer: "Tata Consumer Products Limited",
    countryOfOrigin: "India",
    productType: "Leaf and granule tea blend",
    description: "Black tea blend sold in a 250 g retail pouch.",
    ingredients: "Tea. Check the current pack for the complete label.",
    storage: "Keep sealed in a cool, dry place.",
    sourceUrl:
      "https://www.jiomart.com/p/groceries/tata-gold-tea-250-g/490001340",
    sourceLabel: "JioMart product listing",
    image:
      "https://www.vridhistores.com/uploads/2023/May/products/16843049731290.jpg",
    imageSourceUrl:
      "https://www.vridhistores.com/tata-tea-gold-leaf-tea-250g-pkt-167",
  },
];

export function enrichSampleCatalog(s: State) {
  let updated = 0;
  for (const entry of retailCatalog) {
    const product = s.products.find((p) => p.id === entry.id);
    if (!product || (product.catalogVersion ?? 0) >= 4) continue;
    const stillSampleProduct =
      product.name === entry.legacyName || product.name === entry.name;
    if (!stillSampleProduct) continue;
    const { legacyName: _legacyName, ...metadata } = entry;
    Object.assign(product, metadata, {
      catalogVersion: 4,
      verifiedAt: "2026-11-22",
    });
    // Sample codes are internal shop codes rather than manufacturer barcodes.
    if (/^89010000000[0-5]$/.test(product.barcode))
      product.barcode = `SB-SAMPLE-${product.id.toUpperCase()}`;
    updated++;
  }
  return { updated };
}
