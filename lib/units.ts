/**
 * Unit conversion tables.
 *
 * Every unit is described as a linear transform to the category base unit:
 * `base = value * factor + offset`. Temperature is the only category that
 * needs a non-zero offset, which is why a single formula covers all of them.
 */

export type UnitCategoryId =
  | "length"
  | "mass"
  | "temperature"
  | "area"
  | "volume"
  | "speed"
  | "pressure"
  | "energy"
  | "power"
  | "data"
  | "angle";

export interface Unit {
  id: string;
  /** Symbol shown next to the number */
  symbol: string;
  zh: string;
  en: string;
  /** Multiplier to the base unit; ignored when the pair below is given */
  factor?: number;
  offset?: number;
  /** Explicit converters, for scales where the affine form loses precision */
  toBase?: (value: number) => number;
  fromBase?: (value: number) => number;
}

export interface UnitCategory {
  id: UnitCategoryId;
  zh: string;
  en: string;
  base: string;
  units: Unit[];
}

const u = (
  id: string,
  symbol: string,
  zh: string,
  en: string,
  factor = 1,
  offset = 0
): Unit => ({ id, symbol, zh, en, factor, offset });

/** Temperature scales get exact converters: the affine form rounds 100°C to 211.9999°F */
const t = (
  id: string,
  symbol: string,
  zh: string,
  en: string,
  toBase: (value: number) => number,
  fromBase: (value: number) => number
): Unit => ({ id, symbol, zh, en, toBase, fromBase });

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    zh: "长度",
    en: "Length",
    base: "m",
    units: [
      u("nm", "nm", "纳米", "Nanometre", 1e-9),
      u("um", "µm", "微米", "Micrometre", 1e-6),
      u("mm", "mm", "毫米", "Millimetre", 0.001),
      u("cm", "cm", "厘米", "Centimetre", 0.01),
      u("m", "m", "米", "Metre", 1),
      u("km", "km", "千米", "Kilometre", 1000),
      u("in", "in", "英寸", "Inch", 0.0254),
      u("ft", "ft", "英尺", "Foot", 0.3048),
      u("yd", "yd", "码", "Yard", 0.9144),
      u("mi", "mi", "英里", "Mile", 1609.344),
      u("nmi", "nmi", "海里", "Nautical mile", 1852),
      u("li", "里", "市里", "Li", 500),
      u("chi", "尺", "市尺", "Chi", 1 / 3),
      u("cun", "寸", "市寸", "Cun", 1 / 30),
    ],
  },
  {
    id: "mass",
    zh: "重量",
    en: "Mass",
    base: "kg",
    units: [
      u("mg", "mg", "毫克", "Milligram", 1e-6),
      u("g", "g", "克", "Gram", 0.001),
      u("kg", "kg", "千克", "Kilogram", 1),
      u("t", "t", "吨", "Tonne", 1000),
      u("oz", "oz", "盎司", "Ounce", 0.028349523125),
      u("lb", "lb", "磅", "Pound", 0.45359237),
      u("st", "st", "英石", "Stone", 6.35029318),
      u("jin", "斤", "市斤", "Jin", 0.5),
      u("liang", "两", "市两", "Liang", 0.05),
    ],
  },
  {
    id: "temperature",
    zh: "温度",
    en: "Temperature",
    base: "c",
    units: [
      t("c", "°C", "摄氏度", "Celsius", (v) => v, (v) => v),
      t("f", "°F", "华氏度", "Fahrenheit", (v) => ((v - 32) * 5) / 9, (v) => (v * 9) / 5 + 32),
      t("k", "K", "开尔文", "Kelvin", (v) => v - 273.15, (v) => v + 273.15),
      t("r", "°R", "兰氏度", "Rankine", (v) => ((v - 491.67) * 5) / 9, (v) => ((v + 273.15) * 9) / 5),
    ],
  },
  {
    id: "area",
    zh: "面积",
    en: "Area",
    base: "m2",
    units: [
      u("mm2", "mm²", "平方毫米", "Square millimetre", 1e-6),
      u("cm2", "cm²", "平方厘米", "Square centimetre", 1e-4),
      u("m2", "m²", "平方米", "Square metre", 1),
      u("km2", "km²", "平方千米", "Square kilometre", 1e6),
      u("ha", "ha", "公顷", "Hectare", 1e4),
      u("mu", "亩", "亩", "Mu", 2000 / 3),
      u("acre", "ac", "英亩", "Acre", 4046.8564224),
      u("ft2", "ft²", "平方英尺", "Square foot", 0.09290304),
      u("in2", "in²", "平方英寸", "Square inch", 0.00064516),
      u("yd2", "yd²", "平方码", "Square yard", 0.83612736),
    ],
  },
  {
    id: "volume",
    zh: "体积",
    en: "Volume",
    base: "l",
    units: [
      u("ml", "mL", "毫升", "Millilitre", 0.001),
      u("l", "L", "升", "Litre", 1),
      u("cm3", "cm³", "立方厘米", "Cubic centimetre", 0.001),
      u("m3", "m³", "立方米", "Cubic metre", 1000),
      u("tsp", "tsp", "茶匙（美制）", "Teaspoon (US)", 0.00492892159375),
      u("tbsp", "tbsp", "汤匙（美制）", "Tablespoon (US)", 0.01478676478125),
      u("floz", "fl oz", "液量盎司（美制）", "Fluid ounce (US)", 0.0295735295625),
      u("cup", "cup", "杯（美制）", "Cup (US)", 0.2365882365),
      u("pt", "pt", "品脱（美制）", "Pint (US)", 0.473176473),
      u("qt", "qt", "夸脱（美制）", "Quart (US)", 0.946352946),
      u("gal", "gal", "加仑（美制）", "Gallon (US)", 3.785411784),
      u("galuk", "gal (UK)", "加仑（英制）", "Gallon (UK)", 4.54609),
    ],
  },
  {
    id: "speed",
    zh: "速度",
    en: "Speed",
    base: "ms",
    units: [
      u("ms", "m/s", "米每秒", "Metre per second", 1),
      u("kmh", "km/h", "千米每小时", "Kilometre per hour", 1 / 3.6),
      u("mph", "mph", "英里每小时", "Mile per hour", 0.44704),
      u("kn", "kn", "节", "Knot", 0.5144444444444445),
      u("fts", "ft/s", "英尺每秒", "Foot per second", 0.3048),
    ],
  },
  {
    id: "pressure",
    zh: "压力",
    en: "Pressure",
    base: "pa",
    units: [
      u("pa", "Pa", "帕斯卡", "Pascal", 1),
      u("hpa", "hPa", "百帕", "Hectopascal", 100),
      u("kpa", "kPa", "千帕", "Kilopascal", 1000),
      u("mpa", "MPa", "兆帕", "Megapascal", 1e6),
      u("bar", "bar", "巴", "Bar", 1e5),
      u("mbar", "mbar", "毫巴", "Millibar", 100),
      u("psi", "psi", "磅每平方英寸", "Pound per square inch", 6894.757293168),
      u("atm", "atm", "标准大气压", "Atmosphere", 101325),
      u("mmhg", "mmHg", "毫米汞柱", "Millimetre of mercury", 133.322387415),
      u("torr", "Torr", "托", "Torr", 133.32236842105263),
      u("kgfcm2", "kgf/cm²", "千克力每平方厘米", "Kilogram-force per square centimetre", 98066.5),
    ],
  },
  {
    id: "energy",
    zh: "能量",
    en: "Energy",
    base: "j",
    units: [
      u("j", "J", "焦耳", "Joule", 1),
      u("kj", "kJ", "千焦", "Kilojoule", 1000),
      u("cal", "cal", "卡", "Calorie", 4.184),
      u("kcal", "kcal", "千卡", "Kilocalorie", 4184),
      u("wh", "Wh", "瓦时", "Watt-hour", 3600),
      u("kwh", "kWh", "千瓦时", "Kilowatt-hour", 3.6e6),
      u("ev", "eV", "电子伏", "Electronvolt", 1.602176634e-19),
      u("btu", "BTU", "英热单位", "British thermal unit", 1055.05585262),
    ],
  },
  {
    id: "power",
    zh: "功率",
    en: "Power",
    base: "w",
    units: [
      u("w", "W", "瓦", "Watt", 1),
      u("kw", "kW", "千瓦", "Kilowatt", 1000),
      u("mw", "MW", "兆瓦", "Megawatt", 1e6),
      u("hp", "hp", "英制马力", "Horsepower (mechanical)", 745.6998715822702),
      u("ps", "PS", "公制马力", "Horsepower (metric)", 735.49875),
      u("btuh", "BTU/h", "英热单位每小时", "BTU per hour", 0.2930710701722222),
      u("kcalh", "kcal/h", "千卡每小时", "Kilocalorie per hour", 1.163),
    ],
  },
  {
    id: "data",
    zh: "数据存储",
    en: "Data size",
    base: "byte",
    units: [
      u("bit", "bit", "比特", "Bit", 0.125),
      u("kbit", "kbit", "千比特", "Kilobit", 125),
      u("mbit", "Mbit", "兆比特", "Megabit", 125000),
      u("gbit", "Gbit", "吉比特", "Gigabit", 1.25e8),
      u("byte", "B", "字节", "Byte", 1),
      u("kb", "KB", "千字节（十进制）", "Kilobyte", 1000),
      u("mb", "MB", "兆字节（十进制）", "Megabyte", 1e6),
      u("gb", "GB", "吉字节（十进制）", "Gigabyte", 1e9),
      u("tb", "TB", "太字节（十进制）", "Terabyte", 1e12),
      u("pb", "PB", "拍字节（十进制）", "Petabyte", 1e15),
      u("kib", "KiB", "千字节（二进制）", "Kibibyte", 1024),
      u("mib", "MiB", "兆字节（二进制）", "Mebibyte", 1048576),
      u("gib", "GiB", "吉字节（二进制）", "Gibibyte", 1073741824),
      u("tib", "TiB", "太字节（二进制）", "Tebibyte", 1099511627776),
      u("pib", "PiB", "拍字节（二进制）", "Pebibyte", 1125899906842624),
    ],
  },
  {
    id: "angle",
    zh: "角度",
    en: "Angle",
    base: "deg",
    units: [
      u("deg", "°", "度", "Degree", 1),
      u("rad", "rad", "弧度", "Radian", 180 / Math.PI),
      u("grad", "grad", "百分度", "Gradian", 0.9),
      u("turn", "turn", "圈", "Turn", 360),
      u("arcmin", "′", "角分", "Arcminute", 1 / 60),
      u("arcsec", "″", "角秒", "Arcsecond", 1 / 3600),
    ],
  },
];

/** Categories the general unit converter offers; data and angle have their own tools */
export const CONVERTER_CATEGORIES: UnitCategoryId[] = [
  "length",
  "mass",
  "temperature",
  "area",
  "volume",
  "speed",
  "pressure",
  "energy",
  "power",
];

const CATEGORY_MAP = new Map(UNIT_CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: UnitCategoryId): UnitCategory {
  const category = CATEGORY_MAP.get(id);
  if (!category) throw new Error(`unknown unit category: ${id}`);
  return category;
}

export function getUnit(categoryId: UnitCategoryId, unitId: string): Unit {
  const unit = getCategory(categoryId).units.find((item) => item.id === unitId);
  if (!unit) throw new Error(`unknown unit: ${unitId}`);
  return unit;
}

function toBase(unit: Unit, value: number): number {
  if (unit.toBase) return unit.toBase(value);
  return value * (unit.factor ?? 1) + (unit.offset ?? 0);
}

function fromBase(unit: Unit, value: number): number {
  if (unit.fromBase) return unit.fromBase(value);
  return (value - (unit.offset ?? 0)) / (unit.factor ?? 1);
}

/** Convert a value between two units of the same category */
export function convert(
  categoryId: UnitCategoryId,
  value: number,
  fromId: string,
  toId: string
): number {
  if (!Number.isFinite(value)) return NaN;
  const from = getUnit(categoryId, fromId);
  const to = getUnit(categoryId, toId);
  const base = toBase(from, value);
  return fromBase(to, base);
}

/** The input value expressed in every unit of the category */
export function convertAll(
  categoryId: UnitCategoryId,
  value: number,
  fromId: string
): { unit: Unit; value: number }[] {
  const category = getCategory(categoryId);
  return category.units.map((unit) => ({
    unit,
    value: convert(categoryId, value, fromId, unit.id),
  }));
}

/**
 * Snap a sine or cosine back onto the values it can actually hit. Binary
 * floating point spoils the exact ones: `Math.cos(Math.PI / 2)` is 6.1e-17,
 * not 0, and `Math.sin(Math.PI)` is 1.2e-16 — printing those reads as a bug.
 * Everything in between is left untouched.
 */
export function snapTrig(value: number): number {
  if (Math.abs(value) < 1e-12) return 0;
  if (Math.abs(value - 1) < 1e-12) return 1;
  if (Math.abs(value + 1) < 1e-12) return -1;
  return value;
}

/**
 * Sine, cosine and tangent of an angle in degrees. Tangent is derived from the
 * snapped pair rather than `Math.tan`, which is off by ~1e16 near 90° instead
 * of being undefined there; `NaN` marks a right angle.
 */
export function trigOf(degrees: number): { sin: number; cos: number; tan: number } {
  const radians = (degrees * Math.PI) / 180;
  const sin = snapTrig(Math.sin(radians));
  const cos = snapTrig(Math.cos(radians));
  return { sin, cos, tan: cos === 0 ? NaN : sin / cos };
}

/**
 * Format a converted number: trim the float noise that any factor table
 * produces, and fall back to exponential notation at the extremes so the cell
 * does not turn into a wall of digits.
 */
export function formatNumber(value: number, digits = 8): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e12 || abs < 1e-6) {
    return value.toExponential(4).replace(/\.?0+e/, "e");
  }
  return String(Number(value.toPrecision(digits)));
}

/** Thousands separators for the big result line only */
export function formatReadable(value: number, digits = 6, locale: string = "en"): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e15 || (value !== 0 && Math.abs(value) < 1e-6)) {
    return formatNumber(value, digits);
  }
  const rounded = Number(value.toPrecision(digits));
  return rounded.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 12,
  });
}
