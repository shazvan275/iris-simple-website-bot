import { isMarkdownUrl } from "./rag.js";

export const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "selfhosted", label: "Selfhosted" }
];

const PROVIDER_DEFAULTS = {
  claude: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514"
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini"
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini"
  },
  selfhosted: {
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1"
  }
};

const DEFAULT_TILES = [
  { label: "Ask a question", message: "I have a question about the event." },
  { label: "Event schedule", message: "What’s on the schedule today?" },
  { label: "Get support", message: "I need some support, please." }
];

function normalizeProvider(provider) {
  const normalized = String(provider || "openai").trim().toLowerCase();
  return PROVIDER_DEFAULTS[normalized] ? normalized : "openai";
}

function stringOrDefault(value, fallback) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizeMarkdownFiles(value) {
  const entries = Array.isArray(value) ? value : [value];

  return entries
    .flatMap((entry) => (typeof entry === "string" ? entry.split(",") : []))
    .map((entry) => entry.trim())
    .filter(isMarkdownUrl);
}

function normalizeTiles(tiles) {
  if (!Array.isArray(tiles)) return DEFAULT_TILES;

  return tiles
    .map((tile) => ({
      label: typeof tile?.label === "string" ? tile.label.trim() : "",
      message: typeof tile?.message === "string" ? tile.message.trim() : ""
    }))
    .filter((tile) => tile.label && tile.message);
}

export function normalizeIrisConfig(config = {}) {
  const provider = normalizeProvider(config.provider);
  const providerOption = PROVIDER_OPTIONS.find((option) => option.value === provider);
  const defaults = PROVIDER_DEFAULTS[provider];

  return {
    provider,
    providerLabel: providerOption.label,
    apiKey: config.apiKey || "",
    baseUrl: config.baseUrl || defaults.baseUrl,
    model: config.model || defaults.model,
    temperature: numberOrDefault(config.temperature, 0.7),
    maxTokens: numberOrDefault(config.maxTokens, 1024),
    name: stringOrDefault(config.name, "Iris"),
    introText: stringOrDefault(
      config.introText,
      "Hi! Am Iris, your AI assistant. How can I help you today?"
    ),
    markdownFiles: normalizeMarkdownFiles(config.markdownFiles),
    tiles: normalizeTiles(config.tiles)
  };
}
