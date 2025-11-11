const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
        "quotes": ["error", "double"],
        "camelcase": "off",
        "require-jsdoc": "off",
        "valid-jsdoc": "off",
        "no-unused-vars": "warn",
        "no-undef": "warn"
    }
  }
];
