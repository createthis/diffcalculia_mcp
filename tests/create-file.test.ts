import { promises as fs } from "fs";
import * as fs1 from "fs";
import path from "path";
import { createFile } from "../diffcalculia-mcp";

describe("createFile", () => {
  const TEST_FILE = path.join(__dirname, "test-file.txt");

  beforeEach(async () => {
    try { await fs.unlink(TEST_FILE); } catch {}
  });

  it("creates new file with content", async () => {
    const content = "test content";
    expect(fs1.existsSync(TEST_FILE)).toBe(false);
    await createFile(TEST_FILE, content);
    expect(await fs.readFile(TEST_FILE, "utf8")).toBe(content);
  });

  it("rejects if file exists", async () => {
    await fs.writeFile(TEST_FILE, "existing");
    await expect(createFile(TEST_FILE, "new content")).rejects.toThrow(/EEXIST: file already exists/);
  });

  it("rejects if directory needed", async () => {
    const nestedPath = path.join(__dirname, "nested", "dir", "test-file.txt");
    const content = "nested content";
    await expect(createFile(nestedPath, content)).rejects.toThrow(/ENOENT: no such file or directory/);
  });
});
