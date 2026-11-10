import { test } from "node:test";
import assert from "node:assert/strict";

// Computed URL: tsc (no allowImportingTsExtensions) accepts it, node loads the .ts file.
const { resolveMember, resolveProject, resolveLabel, parseTaskKey, isValidDate }: typeof import("./resolve") = await import(
  new URL("./resolve.ts", import.meta.url).href
);

const members = [
  { id: "m1", name: "Alex Kim", handle: "alex", initials: "AK" },
  { id: "m2", name: "Tomás García", handle: "tomas", initials: "TG" },
  { id: "m3", name: "Sam Park", handle: "spark", initials: "SP" },
  { id: "m4", name: "Samira Khan", handle: "samira", initials: "SK" },
];

test("member: exact name, handle, case and accents", () => {
  assert.equal(resolveMember("Alex Kim", members, "m1").ok && "m1", "m1");
  const r = resolveMember("  TOMAS ", members, "m1");
  assert.ok(r.ok && r.item.id === "m2");
  assert.ok(resolveMember("tomas garcia", members, "m1").ok); // accents ignored
});

test("member: first name, initials, me", () => {
  const sam = resolveMember("sam", members, "m1");
  assert.ok(sam.ok && sam.item.id === "m3"); // exact first name wins over Samira
  assert.ok(resolveMember("TG", members, "m1").ok);
  const me = resolveMember("me", members, "m4");
  assert.ok(me.ok && me.item.id === "m4");
});

test("member: ambiguous and missing", () => {
  const two = [{ ...members[0], handle: "akim" }, { id: "m5", name: "Alex Jones", handle: "ajones", initials: "AJ" }];
  const amb = resolveMember("alex", two, "m1");
  assert.ok(!amb.ok && amb.candidates.length === 2 && /matches 2/.test(amb.error));
  const miss = resolveMember("Sam", members.filter((m) => m.id !== "m3" && m.id !== "m4"), "m1");
  assert.ok(!miss.ok);
  assert.equal(miss.error, 'no workspace member matches "sam"');
  assert.deepEqual(miss.candidates, ["Alex Kim", "Tomás García"]);
});

test("project: key, name, partial name, missing", () => {
  const ps = [
    { id: "p1", key: "WEB", name: "Website relaunch" },
    { id: "p2", key: "ONB", name: "Onboarding" },
  ];
  for (const q of ["web", "WEB", "Website relaunch", "website"]) {
    const r = resolveProject(q, ps);
    assert.ok(r.ok && r.item.key === "WEB", q);
  }
  const miss = resolveProject("mobile beta", ps);
  assert.ok(!miss.ok && miss.error === 'no project matches "mobile beta"');
});

test("label, task key, date", () => {
  assert.ok(resolveLabel("bug", [{ name: "Bug" }, { name: "Design" }]).ok);
  assert.deepEqual(parseTaskKey(" web-12 "), { project: "WEB", number: 12 });
  assert.equal(parseTaskKey("12"), null);
  assert.ok(isValidDate("2026-11-13"));
  assert.ok(!isValidDate("2026-02-30"));
  assert.ok(!isValidDate("11/13/2026"));
});
