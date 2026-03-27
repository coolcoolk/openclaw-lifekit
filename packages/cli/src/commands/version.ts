import { resolve } from "path";

export function versionCommand() {
  const pkg = require(resolve(import.meta.dir, "../../package.json"));
  console.log(`lifekit v${pkg.version}`);
}
