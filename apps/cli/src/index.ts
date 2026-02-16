import { Command } from "commander";
import { registerCategoriesCommand } from "./commands/categories.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerExportCommand } from "./commands/export.js";
import { registerExtractCommand } from "./commands/extract.js";
import { registerGetCommand } from "./commands/get.js";
import { registerListCommand } from "./commands/list.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerLogoutCommand } from "./commands/logout.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerUploadCommand } from "./commands/upload.js";
import { registerWhoamiCommand } from "./commands/whoami.js";
import { assertVaultDirPermissions } from "./lib/config.js";

export async function run(argv: string[]): Promise<void> {
  await assertVaultDirPermissions();

  const program = new Command();
  program
    .name("vault")
    .description("ScanVault CLI")
    .version("0.1.0");

  registerLoginCommand(program);
  registerLogoutCommand(program);
  registerWhoamiCommand(program);
  registerUploadCommand(program);
  registerListCommand(program);
  registerGetCommand(program);
  registerSearchCommand(program);
  registerExtractCommand(program);
  registerExportCommand(program);
  registerCategoriesCommand(program);
  registerConfigCommand(program);

  await program.parseAsync(argv);
}
