import fs from "node:fs";
import { Trie } from "./trie.js";

const MIN_SEGMENT_LENGTH = 8;

export function rewriteDictionary(filePath, targetPath) {
  const data = fs.readFileSync(filePath, "utf8");
  const words = data.split(/\r?\n/);
  const newwords = words
    .map((item) => item.trim())
    .filter((item) => item.length > 1)
    .filter((item) => !(item.length === 2 && item.match(/[^0-9a-zA-Z]/i)))
    .filter((item) => !item.match(/[0-9]/i))
    .join("\n");
  fs.writeFileSync(targetPath, newwords);
}
export function loadWordsToTrie(filePath) {
  const trie = new Trie();
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const words = data.split(/\r?\n/);
    words.forEach((word) => {
      if (word) trie.insert(word.toLowerCase());
    });
  } catch (err) {
    console.error("Error reading or processing words file:", err);
    // Depending on requirements, you might want to throw the error
    // or return an empty/default trie
  }
  return trie;
}

export function isLikelyRandomPattern(segment) {
  if (segment.length < MIN_SEGMENT_LENGTH) return false; // Already filtered but good for standalone use

  // Check for UUID pattern (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidPattern.test(segment)) return true;

  // Check if predominantly hexadecimal (e.g., >80% hex chars)
  const hexChars = segment.replace(/[^0-9a-fA-F]/g, "");
  if (hexChars.length / segment.length > 0.8) return true;

  // Check if predominantly numeric (e.g., >80% digits)
  const numericChars = segment.replace(/[^0-9]/g, "");
  if (numericChars.length / segment.length > 0.8 && segment.length > 10)
    return true; // Higher threshold for purely numeric

  // Add more pattern checks here if needed (e.g., Base64-like patterns, high entropy)
  // For now, keeping it simple with common ID patterns.

  return false;
}

export function isMeaningfulWithTrie(segment, trie) {
  if (segment.length < MIN_SEGMENT_LENGTH) return true; // Or false, depending on how you treat short segments

  const lowerSegment = segment.toLowerCase();
  const coverageArray = new Array(lowerSegment.length).fill(0);

  for (let i = 0; i < lowerSegment.length; i++) {
    // trie._findWordsAndUpdateCoverage(lowerSegment, i, coverageArray);
    const wordsFound = trie.findWordsStartingAt(lowerSegment, i);
    for (const word of wordsFound) {
      for (let j = 0; j < word.length; j++) {
        if (i + j < coverageArray.length) {
          // Boundary check
          coverageArray[i + j]++;
        }
      }
    }
  }

  const coveredChars = coverageArray.filter((count) => count > 0).length;
  const coverageRatio = coveredChars / lowerSegment.length;

  // Define a threshold for what's considered "meaningful"
  // This threshold might need tuning.
  // For example, if >50% of characters are part of any dictionary word.
  return coverageRatio > 0.5;
}

export function analyzeUrlSegment(segment, trie) {
  if (segment.length < MIN_SEGMENT_LENGTH) {
    return true; // Assuming segments shorter than 8 are not considered IDs by default
  }
  if (isLikelyRandomPattern(segment)) {
    return false; // Detected as a random pattern (ID)
  }
  return isMeaningfulWithTrie(segment, trie); // Check meaningfulness using Trie
}

export function parseAndAnalyzeUrl(urlString, trie) {
  const result = {
    originalUrl: urlString,
    segments: [],
  };

  try {
    const url = new URL(urlString);
    const pathSegments = url.pathname.split("/").filter((s) => s.length > 0);
    // Can also analyze query parameters if needed: new URLSearchParams(url.search)

    pathSegments.forEach((segment) => {
      const isMeaningful = analyzeUrlSegment(segment, trie);
      result.segments.push({ segment, isMeaningful });
    });
  } catch (error) {
    console.error(`Invalid URL: ${urlString}`, error);
    result.error = "Invalid URL";
  }
  return result;
}

// Example Usage (can be moved to a test file or a main execution block):
/*
if (require.main === module) {
    const wordsFilePath = './words.txt'; // Make sure words.txt exists
    const trie = loadWordsToTrie(wordsFilePath);

    const testUrls = [
        "http://example.com/user/profile/details",
        "http://example.com/api/v1/item/a1b2c3d4e5f6g7h8", // Likely ID
        "http://example.com/product/search/superlongproductname",
        "http://example.com/files/document/7a9f469c-4382-4a7e-913e-0a5ed2e5f9c8/view", // UUID
        "http://example.com/category/electronicsandgadgets/item/123456789012345", // Numeric ID
        "http://example.com/resource/abcdef0123456789abcdef0123456789" // Hex ID
    ];

    testUrls.forEach(testUrl => {
        console.log(parseAndAnalyzeUrl(testUrl, trie));
    });

    // Test individual segments
    console.log("Testing 'superlongproductname':", analyzeUrlSegment('superlongproductname', trie));
    console.log("Testing 'a1b2c3d4e5f6g7h8':", analyzeUrlSegment('a1b2c3d4e5f6g7h8', trie));
    console.log("Testing '7a9f469c-4382-4a7e-913e-0a5ed2e5f9c8':", analyzeUrlSegment('7a9f469c-4382-4a7e-913e-0a5ed2e5f9c8', trie));
}
*/
