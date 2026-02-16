import type { Command } from "commander";
import { decodeJwtPayload, getAccessToken } from "../lib/auth.js";
import { withErrorHandling } from "../lib/command.js";
import { printOutput } from "../lib/output.js";

export function registerWhoamiCommand(program: Command): void {
  program
    .command("whoami")
    .description("Show current authenticated user")
    .option("--json", "Output JSON")
    .action(
      withErrorHandling(async (options: { json?: boolean }) => {
        const token = await getAccessToken();
        const payload = decodeJwtPayload(token);
        printOutput(
          {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            exp: payload.exp
          },
          { json: options.json }
        );
      })
    );
}
