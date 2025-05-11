import { promises as fs } from "fs";
import path from "path";
import { readFileWithLines } from "../mcp-file-server";

describe("readFileWithLines", () => {
  const FIXTURES = path.resolve(__dirname, "fixtures");
  const SAMPLE_FILE = path.join(FIXTURES, "sample.txt");
  const EMPTY_FILE = path.join(FIXTURES, "empty.txt");

  beforeAll(async () => {
    // Create test files
    await fs.mkdir(FIXTURES, { recursive: true });
    await fs.writeFile(SAMPLE_FILE, "line1\nline2\nline3\nline4\nline5", "utf8");
    await fs.writeFile(EMPTY_FILE, "", "utf8");
  });

  it("reads entire file with correct line numbers", async () => {
    const result = await readFileWithLines(SAMPLE_FILE);
    expect(result).toBe(
      "1|line1\n2|line2\n3|line3\n4|line4\n5|line5"
    );
  });

  it("handles empty files", async () => {
    const result = await readFileWithLines(EMPTY_FILE);
    expect(result).toBe("");
  });

  it("selects line range correctly", async () => {
    const result = await readFileWithLines(SAMPLE_FILE, 3, 1, 1);
    expect(result).toBe(
      "2|line2\n3|line3\n4|line4"
    );
  });

  it("handles edge cases for line ranges", async () => {
    // Request more lines than available before
    expect(await readFileWithLines(SAMPLE_FILE, 1, 10, 0)).toBe("1|line1");
    
    // Request more lines than available after
    expect(await readFileWithLines(SAMPLE_FILE, 5, 0, 10)).toBe("5|line5");
  });

  it("formats line numbers with correct padding", async () => {
    // Create a file with >10 lines to test padding
    const bigFile = path.join(FIXTURES, "big.txt");
    await fs.writeFile(bigFile, Array(15).fill(0).map((_,i) => `line${i+1}`).join("\n"));
    const result = await readFileWithLines(bigFile);
    expect(result.split("\n")[0]).toBe(" 1|line1");
    expect(result.split("\n")[9]).toBe("10|line10");
  });

  it("throws for non-existent files", async () => {
    await expect(readFileWithLines("/nonexistent/file"))
      .rejects
      .toThrow();
  });
});
