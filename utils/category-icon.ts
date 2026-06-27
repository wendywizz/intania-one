import type { IconSymbolName } from '@/components/ui/icon-symbol';

// Keyword → icon rules, checked in order (most specific first). Matches Thai and
// English category / repair-type names. Falls back to a generic wrench.
const RULES: { test: RegExp; icon: IconSymbolName }[] = [
  { test: /ไฟฟ้า|ปลั๊ก|สายไฟ|electric|power/i, icon: 'bolt.fill' },
  { test: /แสงสว่าง|หลอดไฟ|โคมไฟ|light|lamp|bulb/i, icon: 'lightbulb.fill' },
  { test: /ประปา|สุขาภิบาล|ท่อ|น้ำ|water|plumb|pipe|sanitary/i, icon: 'drop.fill' },
  { test: /แอร์|ปรับอากาศ|air|hvac|cooling|ระบายอากาศ/i, icon: 'wind' },
  { test: /เครือข่าย|อินเทอร์เน็ต|network|wi-?fi|internet|lan/i, icon: 'wifi' },
  { test: /ซอ(ร์|ฟ)ฟ?ต?แวร์|โปรแกรม|software|program|applicat/i, icon: 'chevron.left.forwardslash.chevron.right' },
  { test: /ฮาร์ดแวร์|hardware|cpu|เมนบอร์ด|mainboard/i, icon: 'cpu' },
  { test: /เครื่องพิมพ์|ปริ้น|พิมพ์|printer|print/i, icon: 'printer.fill' },
  { test: /จอ(ภาพ)?|monitor|display|screen/i, icon: 'display' },
  { test: /คอมพิวเตอร์|computer|laptop|notebook|พีซี|\bpc\b/i, icon: 'laptop' },
  { test: /งานไม้|เฟอร์นิเจอร์|โต๊ะ|เก้าอี้|ตู้|ไม้|furniture|chair|desk|table|wood|carpent/i, icon: 'chair' },
  { test: /ก่อสร้าง|โครงสร้าง|ผนัง|พื้น|ฝ้า|ประตู|หน้าต่าง|construct|structure|wall|floor|ceiling|door|window/i, icon: 'hammer.fill' },
  { test: /ทาสี|สี\b|paint/i, icon: 'paintroller' },
  { test: /สวน|ภูมิทัศน์|ต้นไม้|garden|landscape|tree|plant/i, icon: 'tree.fill' },
];

const DEFAULT_ICON: IconSymbolName = 'wrench.fill';

/** Pick a category-related icon from a free-text category / repair-type name. */
export function getCategoryIcon(name?: string | null): IconSymbolName {
  if (!name) return DEFAULT_ICON;
  for (const rule of RULES) {
    if (rule.test.test(name)) return rule.icon;
  }
  return DEFAULT_ICON;
}
