const SURNAMES = [
  "赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈",
  "褚", "卫", "蒋", "沈", "韩", "杨", "朱", "秦", "尤", "许",
  "何", "吕", "施", "张", "孔", "曹", "严", "华", "金", "魏",
  "陶", "姜", "戚", "谢", "邹", "喻", "柏", "水", "窦", "章",
  "云", "苏", "潘", "葛", "奚", "范", "彭", "郎", "鲁", "韦",
  "昌", "马", "苗", "凤", "花", "方", "俞", "任", "袁", "柳",
  "唐", "罗", "薛", "贺", "倪", "汤", "滕", "殷", "罗", "毕",
  "郝", "邬", "安", "常", "乐", "于", "时", "傅", "皮", "卞",
  "齐", "康", "伍", "余", "元", "卜", "顾", "孟", "平", "黄",
  "和", "穆", "萧", "尹", "姚", "邵", "湛", "汪", "祁", "毛",
];

const GIVEN = [
  "安", "承", "文", "远", "敬", "清", "和", "明", "德", "昭",
  "伯", "景", "怀", "志", "宁", "允", "若", "思", "谦", "慎",
  "容", "止", "令", "仪", "望", "衡", "直", "方", "正", "厚",
];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cryptoRng(): () => number {
  return () => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** 系统生成的三字名。调用方不能指定用字。 */
export function citizenName(rng: () => number): string {
  const surname = SURNAMES[Math.floor(rng() * SURNAMES.length)]!;
  const a = GIVEN[Math.floor(rng() * GIVEN.length)]!;
  let b = GIVEN[Math.floor(rng() * GIVEN.length)]!;
  if (a === b) b = GIVEN[(GIVEN.indexOf(a) + 7) % GIVEN.length]!;
  return surname + a + b;
}
