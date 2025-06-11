import {
  patch,
  colorizeDiff,
  strongSeparator,
  weakSeparator,
} from "../diffcalculia-mcp"; import { promises as fs } from "fs";
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
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = await patch(diff, outFixturePath);
    expect(consoleSpy).not.toHaveBeenCalled();
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

  it("throws when last line starts on same column as plus characters", async () => {
    const twoDescribesOneTestFixturePath = path.join(fixturesPath, "two_describes_one_test.txt");
    const twoDescribesOneTestExpectedFixturePath = path.join(fixturesPath, "two_describes_one_test_expected.txt");
    const changeIncorrectLeadingWhitespaceFixturePath = path.join(fixturesPath, "change_incorrect_leading_whitespace.diff");
    const base = await fs.readFile(twoDescribesOneTestFixturePath, "utf8");
    await fs.writeFile(outFixturePath, base, "utf8");
    const diff = await fs.readFile(changeIncorrectLeadingWhitespaceFixturePath, "utf8");
    const exp = await fs.readFile(twoDescribesOneTestExpectedFixturePath, "utf8");
    await expect(patch(diff, outFixturePath)).rejects.toThrow('Unknown line 11 "});"');
  });

  describe('when verbose is true', () => {
    it("applies a well-formed diff", async () => {
      const diff = await fs.readFile(changeFixturePath, "utf8");
      const exp = await fs.readFile(expectFixturePath, "utf8");
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patch(diff, outFixturePath, true);

      // Verify the combined log contains all expected information
      expect(consoleSpy).toHaveBeenCalledTimes(8);
      const filePathExpect = expect.stringMatching(/tests\/fixtures\/out.txt$/);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "\n\npatch filePath=",
        filePathExpect
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        strongSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        3,
        "\npatch"
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        4,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        5,
        colorizeDiff(diff)
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        6,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        7,
        strongSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        8,
        "success"
      );

      expect(result).not.toBe(false);
      const out = await fs.readFile(outFixturePath, "utf8");
      expect(out).toBe(exp);
      consoleSpy.mockRestore();
    });

    it("fixes and applies a diff with hunk header errors", async () => {
      const diff = await fs.readFile(changeFixableFixturePath, "utf8");
      const exp = await fs.readFile(expectFixturePath, "utf8");
      const consoleSpy = jest.spyOn(console, 'log')
      .mockImplementation(() => {}); // Empty mock

      const result = await patch(diff, outFixturePath, true);

      // Verify the combined log contains all expected information
      expect(consoleSpy).toHaveBeenCalledTimes(12);
      const filePathExpect = expect.stringMatching(/tests\/fixtures\/out.txt$/);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "\n\npatch filePath=",
        filePathExpect
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        strongSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        3,
        "\npatch"
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        4,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        5,
        colorizeDiff(diff)
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        6,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        7,
        "\noutput"
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        8,
        weakSeparator
      );
      const changeDiff = await fs.readFile(changeFixturePath, "utf8");
      expect(consoleSpy).toHaveBeenNthCalledWith(
        9,
        colorizeDiff("Let me fix that for you\n"+changeDiff)
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        10,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        11,
        strongSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        12,
        "success"
      );

      expect(result).not.toBe(false);
      const out = await fs.readFile(outFixturePath, "utf8");
      expect(out).toBe(exp);
      consoleSpy.mockRestore();
    });

    it("throws when last line starts on same column as plus characters", async () => {
      const twoDescribesOneTestFixturePath = path.join(fixturesPath, "two_describes_one_test.txt");
      const twoDescribesOneTestExpectedFixturePath = path.join(fixturesPath, "two_describes_one_test_expected.txt");
      const changeIncorrectLeadingWhitespaceFixturePath = path.join(fixturesPath, "change_incorrect_leading_whitespace.diff");
      const changeFixedIncorrectLeadingWhitespaceFixturePath = path.join(fixturesPath, "change_fixed_incorrect_leading_whitespace.diff");
      const base = await fs.readFile(twoDescribesOneTestFixturePath, "utf8");
      await fs.writeFile(outFixturePath, base, "utf8");
      const diff = await fs.readFile(changeIncorrectLeadingWhitespaceFixturePath, "utf8");
      const exp = await fs.readFile(twoDescribesOneTestExpectedFixturePath, "utf8");
      const consoleSpy = jest.spyOn(console, 'log')
      .mockImplementation(() => {}); // Empty mock
      await expect(patch(diff, outFixturePath, true)).rejects.toThrow('Unknown line 11 "});"');
      const filePathExpect = outFixturePath;
      expect(consoleSpy).toHaveBeenCalledTimes(16);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "\n\npatch filePath=",
        filePathExpect
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        strongSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        3,
        "\npatch"
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        4,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        5,
        colorizeDiff(diff)
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        6,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        7,
        "\noutput"
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        8,
        weakSeparator
      );
      const changeDiff = await fs.readFile(changeFixedIncorrectLeadingWhitespaceFixturePath, "utf8");
      expect(consoleSpy).toHaveBeenNthCalledWith(
        9,
        colorizeDiff("Let me fix that for you\n"+changeDiff)
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        10,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        11,
        "\nresult"
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        12,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        13,
        "message=",
        "Unknown line 11 \"});\""
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        14,
        weakSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        15,
        strongSeparator
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        16,
        "fail"
      );
    });
  });
});
