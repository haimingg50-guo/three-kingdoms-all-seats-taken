import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tianxia-"));
process.env.DATABASE_PATH = path.join(dir, "t.sqlite");
delete process.env.DATABASE_URL;
delete process.env.TIANXIA_REFEREE_TOKEN;

type Store = typeof import("../src/server/store.ts");
let store: Store;

before(async () => {
  store = await import("../src/server/store.ts");
  await store.ready();
});

after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("存档", () => {
  it("一人一席，死者不能被顶替，事件只追加", async () => {
    const demo = await store.viewWorld("demo", "actor-a");
    assert.equal(demo.name, "第一号实验局");
    const first = await store.claim("demo", "actor-a", { roleId: "cao-cao" });
    assert.equal(first.name, "曹操");
    await assert.rejects(() => store.claim("demo", "actor-b", { roleId: "cao-cao" }), /此席已有人/);
    await assert.rejects(() => store.claim("demo", "actor-a", { roleId: "liu-bei" }), /一人一席/);

    const sandbox = await store.createInstance({
      actorHash: "actor-a",
      name: "推演",
      profile: "tabletop_demo",
      kind: "sandbox",
    });
    await store.claim(sandbox.id, "actor-a", { roleId: "cao-cao" });
    await store.submitOrder(sandbox.id, "actor-a", {
      votes: [],
      domestic: [{ kind: "search" }],
    });
    const afterSearch = await store.exportBundle(sandbox.id, "actor-a");
    assert.ok(afterSearch.chronicle.length > 1);
    assert.equal(afterSearch.roles.some((r) => r.name === "吕布"), true);
    const text = fs.readFileSync(path.join(process.cwd(), "src/server/store.ts"), "utf8");
    const db = fs.readFileSync(path.join(process.cwd(), "src/server/db.ts"), "utf8");
    assert.equal(/delete\s+from\s+events/i.test(text + db), false);
  });

  it("沙盘可以换席，实验局不行", async () => {
    const sandbox = await store.findOwnSandbox("actor-a");
    assert.ok(sandbox);
    await store.claim(sandbox!, "actor-a", { release: true });
    const switched = await store.claim(sandbox!, "actor-a", { roleId: "liu-bei" });
    assert.equal(switched.name, "刘备");
    await assert.rejects(() => store.claim("demo", "actor-a", { release: true }), /不能换席/);
  });
});
