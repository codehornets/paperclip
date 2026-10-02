import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const PRODUCT_AGENT_SLUGS = [
  "product-engineering-lead",
  "product-builder",
  "qa-reliability-reviewer",
];

export function resolveWorkspaceConfig({ repoRoot, override = {} }) {
  const paperclipWorkspace = isAbsolute(override.paperclipWorkspace ?? "")
    ? resolve(override.paperclipWorkspace)
    : resolve(repoRoot, override.paperclipWorkspace ?? ".");
  const sellhandWorkspace = isAbsolute(override.sellhandWorkspace ?? "")
    ? resolve(override.sellhandWorkspace)
    : resolve(repoRoot, override.sellhandWorkspace ?? "../sellhand");
  const packageWorkspace = resolve(repoRoot, "company-packages/sellhand");
  return {
    apiBaseUrl: override.apiBaseUrl ?? "http://127.0.0.1:3210",
    paperclipWorkspace,
    sellhandWorkspace,
    expectedSellhandRemote: override.expectedSellhandRemote ?? "https://github.com/codehornets/sellhand.git",
    allowDirtySellhandReadOnly: override.allowDirtySellhandReadOnly ?? true,
    activeAgentCwdStrategy: override.activeAgentCwdStrategy ?? "sellhand-worktree-for-builder",
    cwdByAgent: {
      "sellhand-ceo": packageWorkspace,
      "growth-revenue-lead": packageWorkspace,
      "restaurant-intelligence-agent": packageWorkspace,
      ...Object.fromEntries(PRODUCT_AGENT_SLUGS.map((slug) => [slug, sellhandWorkspace])),
    },
  };
}

export async function loadWorkspaceConfig({ repoRoot, overridePath }) {
  let override = {};
  try {
    override = JSON.parse(await readFile(overridePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return resolveWorkspaceConfig({ repoRoot, override });
}
