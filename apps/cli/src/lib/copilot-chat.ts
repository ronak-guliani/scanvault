import { spawn } from "node:child_process";

interface CopilotChatOptions {
  system?: string;
  model?: string;
  temperature?: number;
}

async function getGitHubToken(): Promise<string | null> {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0) {
    return process.env.GITHUB_TOKEN.trim();
  }

  const child = spawn("gh", ["auth", "token"], { stdio: ["ignore", "pipe", "ignore"], shell: false });
  const chunks: Buffer[] = [];
  child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const exitCode = await new Promise<number>((resolve) => {
    child.on("error", () => resolve(127));
    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) return null;
  const token = Buffer.concat(chunks).toString("utf8").trim();
  return token.length > 0 ? token : null;
}

export async function runCopilotChat(prompt: string, options: CopilotChatOptions = {}): Promise<string> {
  const token = await getGitHubToken();
  if (!token) {
    throw new Error("Copilot requires GitHub auth. Run: gh auth login");
  }

  const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0.2,
      messages: [
        ...(options.system ? [{ role: "system", content: options.system }] : []),
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Copilot request failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Copilot returned empty response");
  return content;
}
