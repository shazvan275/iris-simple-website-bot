import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIrisConfig, normalizeMarkdownFiles } from "./config.js";

test("normalizeIrisConfig uses OpenAI defaults when no config is supplied", () => {
  assert.deepEqual(normalizeIrisConfig(), {
    provider: "openai",
    providerLabel: "OpenAI",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    temperature: 0.7,
    maxTokens: 1024,
    name: "Iris",
    introText: "Hi! Am Iris, your AI assistant. How can I help you today?",
    markdownFiles: [],
    tiles: [
      { label: "Ask a question", message: "I have a question about the event." },
      { label: "Event schedule", message: "What’s on the schedule today?" },
      { label: "Get support", message: "I need some support, please." }
    ]
  });
});

test("normalizeIrisConfig applies provider defaults and explicit overrides", () => {
  assert.deepEqual(
    normalizeIrisConfig({
      provider: "Claude",
      apiKey: "sk-ant-1234567890",
      model: "claude-opus-4-1-20250805",
      temperature: 0.2,
      maxTokens: 4096,
      name: "Conference Guide",
      introText: "Ask me about rooms, sessions, or attendee support.",
      markdownFiles: "/docs/schedule.md, /docs/support.md",
      tiles: [
        { label: "Find a room", message: "Where is Hall B?" },
        { label: "Speaker help", message: "I need help with my speaker slot." }
      ]
    }),
    {
      provider: "claude",
      providerLabel: "Claude",
      apiKey: "sk-ant-1234567890",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-opus-4-1-20250805",
      temperature: 0.2,
      maxTokens: 4096,
      name: "Conference Guide",
      introText: "Ask me about rooms, sessions, or attendee support.",
      markdownFiles: ["/docs/schedule.md", "/docs/support.md"],
      tiles: [
        { label: "Find a room", message: "Where is Hall B?" },
        { label: "Speaker help", message: "I need help with my speaker slot." }
      ]
    }
  );
});

test("normalizeIrisConfig supports selfhosted base URL overrides", () => {
  assert.deepEqual(
    normalizeIrisConfig({
      provider: "Selfhosted",
      apiKey: "local-secret",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.1",
      temperature: 1,
      maxTokens: 512
    }),
    {
      provider: "selfhosted",
      providerLabel: "Selfhosted",
      apiKey: "local-secret",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.1",
      temperature: 1,
      maxTokens: 512,
      name: "Iris",
      introText: "Hi! Am Iris, your AI assistant. How can I help you today?",
      markdownFiles: [],
      tiles: [
        { label: "Ask a question", message: "I have a question about the event." },
        { label: "Event schedule", message: "What’s on the schedule today?" },
        { label: "Get support", message: "I need some support, please." }
      ]
    }
  );
});

test("normalizeMarkdownFiles parses comma-separated markdown file URLs", () => {
  assert.deepEqual(
    normalizeMarkdownFiles(" /docs/about.md, /docs/faq.md,/guide.md#install "),
    ["/docs/about.md", "/docs/faq.md", "/guide.md#install"]
  );
});

test("normalizeMarkdownFiles rejects non-markdown entries", () => {
  assert.deepEqual(
    normalizeMarkdownFiles("/docs/about.md, /docs/data.json, /docs/readme.markdown, https://example.com/help.md?cache=1"),
    ["/docs/about.md", "https://example.com/help.md?cache=1"]
  );
});

test("normalizeMarkdownFiles rejects non-public URL schemes and credentialed URLs", () => {
  assert.deepEqual(
    normalizeMarkdownFiles(
      "file:///Users/site/secret.md, blob:https://example.com/readme.md, data:text/plain;base64SGVsbG8=.md, javascript:alert.md, ftp://example.com/readme.md, https://user:pass@example.com/private.md, /public/readme.md"
    ),
    ["/public/readme.md"]
  );
});
