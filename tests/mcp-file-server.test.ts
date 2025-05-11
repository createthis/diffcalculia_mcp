// tests/mcp-file-server.test.ts
import { patch } from "../mcp-file-server";
import { promises as fs } from "fs";
import path from "path";

describe("patch", () => {
  const FIX = path.resolve(__dirname, "fixtures");
  const ORIG = path.join(FIX, "original.txt");
  const DIFF = path.join(FIX, "change.diff");
  const EXPECT = path.join(FIX, "expected.txt");
  const OUT = path.join(FIX, "out.txt");

  beforeEach(async () => {
    // reset out file with original before each test
    const base = await fs.readFile(path.join(FIX, "original.txt"), "utf8");
    await fs.writeFile(OUT, base, "utf8");
  });

  it("applies a well-formed diff", async () => {
    const diff = await fs.readFile(DIFF, "utf8");
    const out = await patch(diff, OUT);
    const exp = await fs.readFile(EXPECT, "utf8");
    expect(out).toBe(exp);
    expect(await fs.readFile(OUT, "utf8")).toBe(exp);
  });

  it("throws on malformed diff", async () => {
    await expect(patch("not a diff", OUT)).rejects.toThrow();
  });
});
