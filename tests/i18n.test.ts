import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CHRONICLE } from "../src/i18n/chronicle.ts";
import { ERRORS, translateKnown } from "../src/i18n/errors.ts";
import { CITIES, FACTIONS, OFFICES, PEOPLE, REGIONS } from "../src/i18n/glossary.ts";
import { LOCALES, localeFromNavigator, type Locale } from "../src/i18n/locale.ts";
import { MESSAGES } from "../src/i18n/messages.ts";
import { renderEntry } from "../src/i18n/render.ts";
import { COMMANDERIES, ROSTER } from "../src/engine/scenario.ts";

const LOCALES_LIST = [...LOCALES];

function sameKeys(tables: Record<Locale, Record<string, string>>, label: string) {
  const zh = Object.keys(tables.zh).sort();
  assert.ok(zh.length > 0, `${label} 中文表是空的`);
  for (const locale of LOCALES_LIST) {
    const keys = Object.keys(tables[locale]).sort();
    assert.deepEqual(keys, zh, `${label} ${locale} 的键与中文不一致`);
    for (const key of keys) {
      assert.ok(tables[locale][key].trim().length > 0, `${label} ${locale} 的 ${key} 是空的`);
    }
  }
}

describe("翻译表", () => {
  it("四种语言的界面键一致，且没有空句", () => {
    sameKeys(MESSAGES, "界面");
  });

  it("四种语言的史书键一致，且没有空句", () => {
    const tables = { zh: {}, en: {}, ja: {}, ko: {} } as Record<Locale, Record<string, string>>;
    for (const [key, row] of Object.entries(CHRONICLE)) {
      for (const locale of LOCALES_LIST) tables[locale][key] = row[locale];
    }
    sameKeys(tables, "史书");
  });

  it("报错目录四种语言都有句子", () => {
    for (const [key, row] of Object.entries(ERRORS)) {
      for (const locale of LOCALES_LIST) {
        assert.ok(row[locale]?.trim(), `${key} 缺少 ${locale}`);
      }
    }
  });

  it("人名地名官职盖住开局名册、城池、州、势力", () => {
    for (const person of ROSTER) assert.ok(PEOPLE[person.id], `人名表没有 ${person.id}`);
    for (const city of COMMANDERIES) {
      assert.ok(CITIES[city.id], `地名表没有 ${city.id}`);
      assert.ok(REGIONS[city.region], `州名表没有 ${city.region}`);
    }
    for (const id of ["wei", "shu", "wu"]) assert.ok(FACTIONS[id]);
    for (const id of ["lord", "advisor", "general", "captain", "citizen", "wanderer"]) assert.ok(OFFICES[id]);
  });

  it("浏览器语言给出默认，记住的选择不在这里改", () => {
    assert.equal(localeFromNavigator("ja-JP"), "ja");
    assert.equal(localeFromNavigator("ko"), "ko");
    assert.equal(localeFromNavigator("zh-TW"), "zh");
    assert.equal(localeFromNavigator("en-US"), "en");
    assert.equal(localeFromNavigator(""), "zh");
  });

  it("同一条交战在四种语言里是同一事实，中文仍能被旧测试认出来", () => {
    const entry = {
      key: "war.battle.win",
      params: {
        commander: "cao-cao",
        mode: "main",
        origin: "xuchang",
        target: "luoyang",
        defender: "liu-bei",
        owner: "wei",
        atkLoss: "400",
        defLoss: "900",
      },
    };
    const lines = LOCALES_LIST.map((locale) => renderEntry(entry, locale));
    assert.equal(new Set(lines).size, 4);
    assert.match(lines[0], /曹操/);
    assert.match(lines[0], /自许昌出征洛阳，/);
    assert.match(lines[0], /易主/);
    assert.match(lines[1], /Cao Cao/);
    assert.match(lines[1], /Luoyang/);
    assert.match(lines[2], /曹操（そうそう）/);
    assert.match(lines[2], /洛陽/);
    assert.match(lines[3], /조조/);
    assert.match(lines[3], /낙양/);
  });

  it("游戏名四种语言都换了，赢得天下仍是普通词", () => {
    assert.equal(MESSAGES.zh["brand.name"], "三国全员在线");
    assert.equal(MESSAGES.en["brand.name"], "Three Kingdoms: All Seats Taken");
    assert.equal(MESSAGES.ja["brand.name"], "三国全員オンライン");
    assert.equal(MESSAGES.ko["brand.name"], "삼국 전원 접속");
    assert.equal(MESSAGES.zh["home.title"], MESSAGES.zh["brand.name"]);
    assert.match(MESSAGES.zh["new.ack"], /赢得天下/);
    assert.match(CHRONICLE["end.unify.memorial"].zh, /三国全员在线/);
    assert.match(CHRONICLE["end.unify.memorial"].en, /All Seats Taken/);
    assert.match(CHRONICLE["end.unify.memorial"].ja, /三国全員オンライン/);
    assert.match(CHRONICLE["end.unify.memorial"].ko, /삼국 전원 접속/);
    assert.match(CHRONICLE["meta.open.experiment"].zh, /三国全员在线/);
    const css = readFileSync("src/app/globals.css", "utf8");
    const line = css.slice(css.indexOf(".title-line {"), css.indexOf(".title-line-sub"));
    assert.match(line, /max-width:\s*100%/);
    assert.match(line, /overflow-wrap:\s*anywhere/);
  });

  it("菜单允许长句折行", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const block = css.slice(css.indexOf(".nes-choice {"), css.indexOf(".nes-choice.is-on"));
    assert.match(block, /white-space:\s*normal/);
    assert.match(block, /overflow-wrap:\s*anywhere/);
    assert.match(block, /height:\s*auto/);
  });

  it("指令与配置里的固定报错都在翻译表里", () => {
    const files = ["src/engine/order.ts", "src/engine/config.ts", "src/server/store.ts"];
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const found = [
        ...text.matchAll(/error:\s*"([^"$]+)"/g),
        ...text.matchAll(/fail\(errors,\s*"([^"$]+)"\)/g),
        ...text.matchAll(/new GameError\("([^"$]+)"\)/g),
      ].map((match) => match[1]);
      for (const message of found) {
        if (!ERRORS[message] && translateKnown(message, "en") === message) missing.push(`${file}: ${message}`);
      }
    }
    assert.deepEqual(missing, []);
  });
});
