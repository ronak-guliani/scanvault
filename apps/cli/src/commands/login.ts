import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import type { Command } from "commander";
import { ApiClient } from "../lib/api-client.js";
import { withErrorHandling } from "../lib/command.js";
import { getConfig, setCredentials } from "../lib/config.js";
import { printOutput } from "../lib/output.js";

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

async function openInBrowser(url: string): Promise<void> {
  const platform = process.platform;
  const command: string = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args: string[] = platform === "win32" ? ["/c", "start", "", url] : [url];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Browser open command exited with code ${code ?? -1}`));
    });
  });
}

async function waitForAuthCode(port: number, expectedState: string, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for OAuth callback"));
    }, timeoutMs);

    const server = createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Missing callback URL");
        return;
      }

      const callbackUrl = new URL(req.url, `http://localhost:${port}`);
      if (callbackUrl.pathname !== "/callback") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const code = callbackUrl.searchParams.get("code");
      const state = callbackUrl.searchParams.get("state");
      if (!code) {
        res.statusCode = 400;
        res.end("Authorization code missing");
        clearTimeout(timeout);
        server.close();
        reject(new Error("OAuth callback did not include code"));
        return;
      }

      if (state !== expectedState) {
        res.statusCode = 400;
        res.end("OAuth state mismatch");
        clearTimeout(timeout);
        server.close();
        reject(new Error("OAuth state mismatch"));
        return;
      }

      res.statusCode = 200;
      res.end("Vault CLI login successful. You can close this tab.");
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    server.listen(port, "127.0.0.1");
  });
}

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Login with OAuth browser flow or direct token")
    .option("--token <token>", "Access token to store")
    .option("--redirect-port <port>", "Local callback port", "9876")
    .option("--json", "Output JSON")
    .action(
      withErrorHandling(async (options: { token?: string; redirectPort?: string; json?: boolean }) => {
        if (options.token) {
          await setCredentials({
            accessToken: options.token,
            updatedAt: new Date().toISOString()
          });
          printOutput({ loggedIn: true, mode: "token" }, { json: options.json });
          return;
        }

        const port = Number(options.redirectPort ?? "9876");
        if (!Number.isInteger(port) || port <= 0) {
          throw new Error("redirect-port must be a valid integer");
        }

        const config = await getConfig();
        const client = new ApiClient(config.apiBaseUrl);
        const state = toBase64Url(randomBytes(16));
        const pkce = createPkcePair();
        const redirectUri = `http://localhost:${port}/callback`;

        const loginUrl = await client.getAuthLoginUrl({
          redirectUri,
          state,
          codeChallenge: pkce.challenge
        });

        try {
          await openInBrowser(loginUrl);
        } catch {
          printOutput(`Open this URL in your browser:\n${loginUrl}`);
        }

        const code = await waitForAuthCode(port, state, 5 * 60 * 1000);
        const token = await client.exchangeAuthCode({
          code,
          redirectUri,
          codeVerifier: pkce.verifier
        });

        const expiresAt =
          typeof token.expiresIn === "number" ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : undefined;
        await setCredentials({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt,
          updatedAt: new Date().toISOString()
        });

        printOutput({ loggedIn: true, mode: "oauth", expiresAt }, { json: options.json });
      })
    );
}
