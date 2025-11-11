import { defineConfig } from "tsdown";
import pkg from "./package.json";
export default defineConfig({
  entry: ["./src/index.ts"],
  alias: {
    "@": "./src",
  },
  noExternal: pkg.dependencies ? Object.keys(pkg.dependencies) : [],
  define: {
    __dirname: JSON.stringify(process.cwd()),
  },
});
