// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    "plugin:vue/vue3-essential",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["vue", "@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
  },
};
