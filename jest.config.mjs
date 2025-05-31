import config from "jest-config";

export default {
  moduleFileExtensions: ["cjs", "ts", ...config.defaults.moduleFileExtensions],
  clearMocks: false,
  transform: {
    "^.+\\.(ts|cjs|js|mjs|mts)$": [
      "@swc/jest",
      {
        sourceMaps: "inline",
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!lmdb)"],
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapper: {
    "^lodash-es$": "lodash",
  },
  collectCoverage: false,
};
