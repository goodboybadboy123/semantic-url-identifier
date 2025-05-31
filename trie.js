export class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  /**
   * Finds all dictionary words in the given segment starting from the specified index.
   * @param {string} segment - The string segment to search within.
   * @param {number} startIndex - The starting index in the segment.
   * @returns {string[]} An array of words found.
   */
  findWordsStartingAt(segment, startIndex) {
    const foundWords = [];
    let node = this.root;
    let currentWord = "";

    for (let i = startIndex; i < segment.length; i++) {
      const char = segment[i];
      if (!node.children[char]) {
        break; // No further words can be formed
      }
      node = node.children[char];
      currentWord += char;
      if (node.isEndOfWord) {
        foundWords.push(currentWord);
      }
    }
    return foundWords;
  }
}
