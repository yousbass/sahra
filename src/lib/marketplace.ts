// Static marketplace catalog. Items are browsable from the homepage today;
// ordering opens with the season. When real ordering ships, this moves to
// Firestore — keep the shape stable.

export type MarketCategory = 'food' | 'gear' | 'firewood';

export interface MarketItem {
  id: string;
  category: MarketCategory;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  /** Price in BD */
  price: number;
  unitEn: string;
  unitAr: string;
  image: string;
  /** Present only on items published by approved marketplace sellers */
  sellerEn?: string;
  sellerAr?: string;
}

const img = (file: string) => `${import.meta.env.BASE_URL}images/marketplace/${file}`;

export const MARKET_ITEMS: MarketItem[] = [
  // ---- Camp food ----
  {
    id: 'karak-set',
    category: 'food',
    nameEn: 'Karak & Gahwa Set',
    nameAr: 'طقم كرك وقهوة',
    descEn: 'A hot flask of karak with an Arabic dallah of gahwa and cups — enough for the whole jalsa.',
    descAr: 'ترمس كرك حار مع دلة قهوة عربية وفناجين — يكفي الجلسة كلها.',
    price: 4.5,
    unitEn: 'per set',
    unitAr: 'للطقم',
    image: img('karak-set.jpg'),
  },
  {
    id: 'mashawi-box',
    category: 'food',
    nameEn: 'Mashawi BBQ Box',
    nameAr: 'بوكس مشاوي جاهز للشوي',
    descEn: 'Marinated kebab, tikka and vegetable skewers, prepped and ready for your charcoal.',
    descAr: 'لحم ودجاج متبل مع خضار على أسياخ، جاهز للفحم مباشرة.',
    price: 18,
    unitEn: 'per box',
    unitAr: 'للبوكس',
    image: img('mashawi-box.jpg'),
  },
  {
    id: 'breakfast-box',
    category: 'food',
    nameEn: 'Barr Breakfast Box',
    nameAr: 'بوكس ريوق البر',
    descEn: 'Khubz, eggs, cheese, honey and foul — a full camp breakfast for the morning after.',
    descAr: 'خبز وبيض وجبن وعسل وفول — ريوق كامل لصباح البر.',
    price: 8,
    unitEn: 'per box',
    unitAr: 'للبوكس',
    image: img('breakfast-box.jpg'),
  },
  {
    id: 'machboos-pot',
    category: 'food',
    nameEn: 'Machboos Pot for the Group',
    nameAr: 'قدر مجبوس للربع',
    descEn: 'A full pot of chicken machboos that serves eight — made for the camp gathering.',
    descAr: 'قدر مجبوس دجاج يكفي ثمانية أشخاص — مسوّى لجمعة المخيم.',
    price: 22,
    unitEn: 'per pot',
    unitAr: 'للقدر',
    image: img('machboos-pot.jpg'),
  },

  // ---- Firewood ----
  {
    id: 'firewood-bundle',
    category: 'firewood',
    nameEn: 'Samr Firewood Bundle',
    nameAr: 'ربطة حطب سمر',
    descEn: 'Dry local samr hardwood — steady embers that hold through the night.',
    descAr: 'حطب سمر محلي جاف — جمر ثابت يدوم طول الليلة.',
    price: 6,
    unitEn: 'per bundle',
    unitAr: 'للربطة',
    image: img('firewood-bundle.jpg'),
  },
  {
    id: 'charcoal-bag',
    category: 'firewood',
    nameEn: 'Natural Charcoal 5kg',
    nameAr: 'كيس فحم طبيعي ٥ كيلو',
    descEn: 'Large-cut natural lump charcoal — quick to light, low smoke, made for mashawi.',
    descAr: 'فحم طبيعي قطع كبيرة — إشعال سريع ودخان أقل، مخصوص للمشاوي.',
    price: 3.5,
    unitEn: 'per bag',
    unitAr: 'للكيس',
    image: img('charcoal-bag.jpg'),
  },
  {
    id: 'fire-starter',
    category: 'firewood',
    nameEn: 'Fire Starter Kit',
    nameAr: 'عدة إشعال النار',
    descEn: 'Kindling, natural firelighters and long matches — the fire going in minutes.',
    descAr: 'حطب تشعيل وولاعات طبيعية وكبريت طويل — نارك مشتعلة بدقائق.',
    price: 2,
    unitEn: 'per kit',
    unitAr: 'للعدة',
    image: img('fire-starter.jpg'),
  },

  // ---- Camping gear ----
  {
    id: 'tent-heater',
    category: 'gear',
    nameEn: 'Winter Tent Heater',
    nameAr: 'دفاية خيمة',
    descEn: 'A portable gas heater that keeps the tent warm on cold winter nights.',
    descAr: 'دفاية غاز محمولة تدفّي الخيمة في ليالي الشتاء الباردة.',
    price: 12,
    unitEn: 'rental / night',
    unitAr: 'إيجار / ليلة',
    image: img('tent-heater.jpg'),
  },
  {
    id: 'majlis-set',
    category: 'gear',
    nameEn: 'Ground Majlis Set',
    nameAr: 'طقم مجلس أرضي',
    descEn: 'Carpets and embroidered floor cushions to lay out a proper jalsa.',
    descAr: 'زوالي وطراريح مطرزة تفرش جلستك على أصولها.',
    price: 15,
    unitEn: 'rental / night',
    unitAr: 'إيجار / ليلة',
    image: img('majlis-set.jpg'),
  },
  {
    id: 'string-lights',
    category: 'gear',
    nameEn: 'String Lights 10m',
    nameAr: 'حبل إضاءة ١٠ متر',
    descEn: 'Warm festoon lights to hang around the tent and the jalsa.',
    descAr: 'إضاءة دافئة تعلّقها حول الخيمة والجلسة.',
    price: 4,
    unitEn: 'per roll',
    unitAr: 'للحبل',
    image: img('string-lights.jpg'),
  },
  {
    id: 'kettle-grill',
    category: 'gear',
    nameEn: 'Cast-Iron Kettle & Grill Rack',
    nameAr: 'غوري حديد مع شبك شواء',
    descEn: 'A heavy tea kettle and a grill rack made for the coals.',
    descAr: 'غوري شاي ثقيل مع شبك شواء مخصوص للجمر.',
    price: 7,
    unitEn: 'per set',
    unitAr: 'للطقم',
    image: img('kettle-grill.jpg'),
  },
];

export const marketItemsByCategory = (category: MarketCategory): MarketItem[] =>
  MARKET_ITEMS.filter((i) => i.category === category);
