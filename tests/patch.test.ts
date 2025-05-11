import { patch } from "../diffcalculia-mcp";
import { promises as fs } from "fs";
import path from "path";

describe("patch", () => {
  const fixturesPath = path.resolve(__dirname, "fixtures");
  const originalFixturePath = path.join(fixturesPath, "original.txt");
  const originalWithWhitespaceFixturePath = path.join(fixturesPath, "original_with_whitespace.txt");
  const changeFixturePath = path.join(fixturesPath, "change.diff");
  const changeIncorrectWhitespaceFixturePath = path.join(fixturesPath, "change_incorrect_whitespace.diff");
  const changeFixableFixturePath = path.join(fixturesPath, "change_fixable.diff");
  const changeNotFixableFixturePath = path.join(fixturesPath, "change_not_fixable.diff");
  const expectFixturePath = path.join(fixturesPath, "expected.txt");
  const expectWithWhitespaceFixturePath = path.join(fixturesPath, "expected_with_whitespace.txt");
  const outFixturePath = path.join(fixturesPath, "out.txt");

  beforeEach(async () => {
    // reset out file with original before each test
    const base = await fs.readFile(originalFixturePath, "utf8");
    await fs.writeFile(outFixturePath, base, "utf8");
  });

  it("applies a well-formed diff", async () => {
    const diff = await fs.readFile(changeFixturePath, "utf8");
    const exp = await fs.readFile(expectFixturePath, "utf8");
    const result = await patch(diff, outFixturePath);
    expect(result).not.toBe(false);
    const out = await fs.readFile(outFixturePath, "utf8");
    expect(out).toBe(exp);
    expect(result).toBe(diff);
  });

  it("applies a diff with incorrect whitespace", async () => {
    const base = await fs.readFile(originalWithWhitespaceFixturePath, "utf8");
    await fs.writeFile(outFixturePath, base, "utf8");
    const diff = await fs.readFile(changeIncorrectWhitespaceFixturePath, "utf8");
    const exp = await fs.readFile(expectWithWhitespaceFixturePath, "utf8");
    const result = await patch(diff, outFixturePath);
    expect(result).not.toBe(false);
    const out = await fs.readFile(outFixturePath, "utf8");
    expect(out).toBe(exp);
    expect(result).toBe(diff);
  });

  it("fixes and applies a diff with hunk header errors", async () => {
    const diff = await fs.readFile(changeFixableFixturePath, "utf8");
    const result = await patch(diff, outFixturePath);
    const exp = await fs.readFile(expectFixturePath, "utf8");
    const out = await fs.readFile(outFixturePath, "utf8");
    expect(out).toBe(exp);
    const changeDiff = await fs.readFile(changeFixturePath, "utf8");
    expect(result).toBe(`Let me fix that for you\n${changeDiff}`);
  });

  it("throws on malformed diff", async () => {
    await expect(patch("not a diff", outFixturePath)).rejects.toThrow('Need minimum 4 lines, got 1');
  });

  it("throws on outdated diff", async () => {
    const diff = await fs.readFile(changeNotFixableFixturePath, "utf8");
    await expect(patch(diff, outFixturePath)).rejects.toThrow('Failed to apply patch');
  });
});
