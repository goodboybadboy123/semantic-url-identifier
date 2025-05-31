import {
  loadWordsToTrie,
  parseAndAnalyzeUrl,
  analyzeUrlSegment,
  isLikelyRandomPattern,
  isMeaningfulWithTrie,
} from "./index.js";

describe("URL Analyzer", () => {
  let trie;

  beforeAll(() => {
    // Load the Trie with words from new-words.txt before running tests
    trie = loadWordsToTrie("./new-words.txt");
  });

  describe("isLikelyRandomPattern", () => {
    test("should identify UUIDs as random", () => {
      expect(
        isLikelyRandomPattern("7a9f469c-4382-4a7e-913e-0a5ed2e5f9c8")
      ).toBe(true);
    });
    test("should identify predominantly hexadecimal strings as random", () => {
      expect(isLikelyRandomPattern("abcdef0123456789abcdef0123456789")).toBe(
        true
      );
    });
    test("should identify predominantly numeric strings (long) as random", () => {
      expect(isLikelyRandomPattern("12345678901234567890")).toBe(true);
    });
    test("should not identify short numeric strings as random by default pattern", () => {
      expect(isLikelyRandomPattern("1234567")).toBe(false); // Shorter than MIN_SEGMENT_LENGTH
    });
    test("should not identify meaningful strings as random", () => {
      expect(isLikelyRandomPattern("meaningfulstringcontent")).toBe(false);
    });
    test("should identify mixed alphanumeric likely ID as random (if hex dominant)", () => {
      expect(isLikelyRandomPattern("a1b2c3d4e5f6789")).toBe(true); // Assuming g,h,i,j,k make it non-hex dominant enough
    }); // This test might need adjustment based on hex dominance threshold
    test("should identify mixed alphanumeric likely ID as random (hex dominant)", () => {
      expect(isLikelyRandomPattern("a1b2c3d4e5f6a7b8c9d0")).toBe(true);
    });
    test("should not identify shorter non-patterned strings as random", () => {
      expect(isLikelyRandomPattern("shortone")).toBe(false);
    });
  });

  describe("isMeaningfulWithTrie", () => {
    test("should identify dictionary words as meaningful", () => {
      // Assuming 'search' and 'profile' are in new-words.txt
      expect(isMeaningfulWithTrie("searchprofile", trie)).toBe(true);
    });
    test("should identify non-dictionary long strings as not meaningful", () => {
      expect(isMeaningfulWithTrie("qwertyuiopasdfghjkl", trie)).toBe(false);
    });
    test("should identify partial dictionary words as meaningful if coverage is high", () => {
      // Assuming 'user' and 'login' are in new-words.txt
      expect(isMeaningfulWithTrie("userloginattempt", trie)).toBe(true);
    });
    test("should identify concatenated dictionary words as meaningful", () => {
      expect(isMeaningfulWithTrie("usersettings", trie)).toBe(true); // Assuming 'user' and 'settings'
    });
  });

  describe("analyzeUrlSegment", () => {
    test("should return true for meaningful segments", () => {
      expect(analyzeUrlSegment("userprofile", trie)).toBe(true);
    });
    test("should return false for random-pattern segments (UUID)", () => {
      expect(
        analyzeUrlSegment("123e4567-e89b-12d3-a456-426614174000", trie)
      ).toBe(false);
    });
    test("should return false for random-pattern segments (hex)", () => {
      expect(analyzeUrlSegment("abcdef1234567890abcdef1234567890", trie)).toBe(
        false
      );
    });
    test("should return false for non-dictionary long segments", () => {
      expect(analyzeUrlSegment("zxcvbnmasdfghjklqwerty", trie)).toBe(false);
    });
    test("should return true for segments shorter than MIN_SEGMENT_LENGTH", () => {
      expect(analyzeUrlSegment("short", trie)).toBe(true);
    });
  });

  describe("parseAndAnalyzeUrl", () => {
    test("should analyze path segments correctly", () => {
      const url = "http://example.com/user/profile/a1b2c3d4e5f6g7h8/view";
      const result = parseAndAnalyzeUrl(url, trie);
      expect(result.analyzedParts).toEqual(
        expect.arrayContaining([
          { part: "path", value: "user", isMeaningful: true },
          { part: "path", value: "profile", isMeaningful: true },
          { part: "path", value: "a1b2c3d4e5f6g7h8", isMeaningful: false }, // Assuming this is treated as an ID
          { part: "path", value: "view", isMeaningful: true },
        ])
      );
    });

    test("should analyze query parameter values", () => {
      const url =
        "http://example.com/search?query=superlongproductname&id=abcdef1234567890";
      const result = parseAndAnalyzeUrl(url, trie);
      expect(result.analyzedParts).toEqual(
        expect.arrayContaining([
          { part: "path", value: "search", isMeaningful: true },
          {
            part: "queryValue",
            key: "query",
            value: "superlongproductname",
            isMeaningful: true,
          },
          {
            part: "queryValue",
            key: "id",
            value: "abcdef1234567890",
            isMeaningful: false,
          },
        ])
      );
    });

    test("should analyze hash fragments", () => {
      const url = "http://example.com/page#sectioninfohash";
      const result = parseAndAnalyzeUrl(url, trie);
      expect(result.analyzedParts).toEqual(
        expect.arrayContaining([
          { part: "path", value: "page", isMeaningful: true },
          { part: "hash", value: "sectioninfohash", isMeaningful: true }, // Assuming 'section' 'info' 'hash' are in dict or combined pass threshold
        ])
      );
    });

    test("should analyze complex URL with path, query, and hash", () => {
      const url =
        "http://example.com/api/v1/resource/a1b2c3d4e5f6g7h8?filter=activeusers#detailssection";
      const result = parseAndAnalyzeUrl(url, trie);
      expect(result.analyzedParts).toEqual(
        expect.arrayContaining([
          { part: "path", value: "api", isMeaningful: true },
          { part: "path", value: "v1", isMeaningful: true }, // Assuming 'v1' is short or in dict
          { part: "path", value: "resource", isMeaningful: true },
          { part: "path", value: "a1b2c3d4e5f6g7h8", isMeaningful: false },
          {
            part: "queryValue",
            key: "filter",
            value: "activeusers",
            isMeaningful: true,
          }, // Assuming 'active' and 'users'
          { part: "hash", value: "detailssection", isMeaningful: true }, // Assuming 'details' and 'section'
        ])
      );
    });

    test("should handle URLs with only domain", () => {
      const url = "http://example.com";
      const result = parseAndAnalyzeUrl(url, trie);
      expect(result.analyzedParts.length).toBe(0);
    });

    test("should handle URLs with domain and trailing slash", () => {
      const url = "http://example.com/";
      const result = parseAndAnalyzeUrl(url, trie);
      expect(result.analyzedParts.length).toBe(0);
    });
  });
});
