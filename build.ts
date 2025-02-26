import { exit } from "node:process";
import { log, error } from "node:console";
import { $, chalk, within } from "zx";

(async () => {
  log(chalk.bgGreenBright("Building..."));

  log(chalk.bgGreenBright("Making sure submodules are up to date..."));
  await $`git submodule update --init --recursive`;

  log(chalk.bgGreenBright("Building tree-sitter-bicep..."));
  await within(async () => {
    $.cwd = "tree-sitter-bicep";
    await $`npm install`;
    await $`npx tree-sitter generate`;
    await $`npx tree-sitter build --wasm`;
    log(chalk.bgGreenBright("Built tree-sitter-bicep!"));
    await $`cp ../node_modules/web-tree-sitter/tree-sitter.wasm tree-sitter-bicep.wasm ..`;
    await $`git checkout -- .`;
  });
})()
  .catch((e) => {
    error(chalk.bgRedBright("Build failed!"));
    error(e);
    exit(1);
  })
  .then(() => {
    log(chalk.bgGreenBright("Build succeeded!"));
  });
