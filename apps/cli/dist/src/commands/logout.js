import { withErrorHandling } from "../lib/command.js";
import { clearCredentials } from "../lib/config.js";
import { printOutput } from "../lib/output.js";
export function registerLogoutCommand(program) {
    program
        .command("logout")
        .description("Clear saved credentials")
        .action(withErrorHandling(async () => {
        await clearCredentials();
        printOutput("Logged out.");
    }));
}
//# sourceMappingURL=logout.js.map