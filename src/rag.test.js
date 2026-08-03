import test from "node:test";
import assert from "node:assert/strict";
import {
  MARKDOWN_UNAVAILABLE_REPLY,
  buildMarkdownOnlyMessages,
  chunkMarkdownDocuments,
  createMarkdownRagReply,
  createProviderRequest,
  isMarkdownUrl,
  loadMarkdownDocuments,
  retrieveMarkdownChunks
} from "./rag.js";

test("MARKDOWN_UNAVAILABLE_REPLY is friendly and does not mention markdown files", () => {
  assert.equal(
    MARKDOWN_UNAVAILABLE_REPLY,
    "I don't have that information available right now."
  );
});

test("isMarkdownUrl only accepts URL pathnames ending in .md", () => {
  assert.equal(isMarkdownUrl("/docs/about.md"), true);
  assert.equal(isMarkdownUrl("https://example.com/help.md?cache=1"), true);
  assert.equal(isMarkdownUrl("/docs/about.MD#top"), true);
  assert.equal(isMarkdownUrl("docs/relative.md"), true);
  assert.equal(isMarkdownUrl("//cdn.example.com/help.md"), true);
  assert.equal(isMarkdownUrl("/docs/about.markdown"), false);
  assert.equal(isMarkdownUrl("/api/content.json"), false);
  assert.equal(isMarkdownUrl("file:///Users/site/secret.md"), false);
  assert.equal(isMarkdownUrl("blob:https://example.com/readme.md"), false);
  assert.equal(isMarkdownUrl("data:text/markdown,hello.md"), false);
  assert.equal(isMarkdownUrl("javascript:alert.md"), false);
  assert.equal(isMarkdownUrl("ftp://example.com/readme.md"), false);
  assert.equal(isMarkdownUrl("https://user:pass@example.com/private.md"), false);
  assert.equal(isMarkdownUrl(""), false);
});

test("loadMarkdownDocuments fetches only markdown URLs and skips failed files", async () => {
  const requested = [];
  const fetcher = async (url) => {
    requested.push(url);
    if (url === "/docs/missing.md") {
      return { ok: false, text: async () => "" };
    }

    return {
      ok: true,
      text: async () => `# Loaded\nContent from ${url}.`
    };
  };

  const documents = await loadMarkdownDocuments(
    ["/docs/about.md", "/docs/data.json", "/docs/missing.md"],
    fetcher
  );

  assert.deepEqual(requested, ["/docs/about.md", "/docs/missing.md"]);
  assert.deepEqual(documents, [
    { url: "/docs/about.md", text: "# Loaded\nContent from /docs/about.md." }
  ]);
});

test("loadMarkdownDocuments caps file count and skips oversize files", async () => {
  const requested = [];
  const markdownFiles = Array.from({ length: 12 }, (_, index) => `/docs/${index}.md`);
  const fetcher = async (url) => {
    requested.push(url);
    return {
      ok: true,
      headers: {
        get: (name) => (name.toLowerCase() === "content-length" && url === "/docs/1.md" ? "90000" : null)
      },
      text: async () => (url === "/docs/2.md" ? "x".repeat(90_000) : `# ${url}\nSmall content.`)
    };
  };

  const documents = await loadMarkdownDocuments(markdownFiles, fetcher);

  assert.equal(requested.length, 10);
  assert.equal(documents.some((document) => document.url === "/docs/1.md"), false);
  assert.equal(documents.some((document) => document.url === "/docs/2.md"), false);
  assert.equal(documents.every((document) => document.text.length < 80_000), true);
});

test("retrieveMarkdownChunks returns chunks relevant to the question", () => {
  const chunks = chunkMarkdownDocuments([
    {
      url: "/docs/site.md",
      text: [
        "# Pricing",
        "The Basic plan costs $9 per month and includes chat support.",
        "",
        "# Hours",
        "The support desk is open from 9 AM to 5 PM."
      ].join("\n")
    }
  ]);

  const matches = retrieveMarkdownChunks("How much does the Basic plan cost?", chunks, 1);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].url, "/docs/site.md");
  assert.match(matches[0].text, /Basic plan costs \$9/);
});

test("retrieveMarkdownChunks matches plain queries to hyphenated markdown terms", () => {
  const chunks = chunkMarkdownDocuments([
    {
      url: "/docs/event.md",
      text: "# Attendee Help\nWi-Fi details are available at the registration counter."
    }
  ]);

  const matches = retrieveMarkdownChunks("tell me about wifi", chunks, 1);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].url, "/docs/event.md");
  assert.match(matches[0].text, /Wi-Fi details/);
});

test("retrieveMarkdownChunks returns no chunks when the question has no markdown match", () => {
  const chunks = chunkMarkdownDocuments([
    {
      url: "/docs/site.md",
      text: "# Hours\nThe support desk is open from 9 AM to 5 PM."
    }
  ]);

  assert.deepEqual(retrieveMarkdownChunks("What is the refund policy?", chunks, 3), []);
});

test("buildMarkdownOnlyMessages restricts answers to provided markdown context", () => {
  const messages = buildMarkdownOnlyMessages("What does Basic cost?", [
    {
      id: "/docs/pricing.md#0",
      url: "/docs/pricing.md",
      text: "# Pricing\nThe Basic plan costs $9 per month."
    }
  ]);

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Answer using only the markdown context/);
  assert.match(messages[0].content, new RegExp(MARKDOWN_UNAVAILABLE_REPLY));
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /\[Source: \/docs\/pricing\.md\]/);
  assert.match(messages[1].content, /The Basic plan costs \$9 per month/);
  assert.match(messages[1].content, /User question:\nWhat does Basic cost\?/);
});

test("createProviderRequest builds OpenAI-compatible chat completion requests", () => {
  const messages = buildMarkdownOnlyMessages("What does Basic cost?", []);
  const request = createProviderRequest(
    {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1/",
      model: "gpt-test",
      temperature: 0.2,
      maxTokens: 256
    },
    messages
  );

  assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer sk-test");
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, "gpt-test");
  assert.deepEqual(body.messages, messages);
  assert.equal(body.temperature, 0.2);
  assert.equal(body.max_tokens, 256);
  assert.equal(request.extractReply({ choices: [{ message: { content: "It costs $9." } }] }), "It costs $9.");
});

test("createProviderRequest builds Claude messages requests", () => {
  const messages = buildMarkdownOnlyMessages("What does Basic cost?", [
    {
      id: "/docs/pricing.md#0",
      url: "/docs/pricing.md",
      text: "# Pricing\nThe Basic plan costs $9 per month."
    }
  ]);
  const request = createProviderRequest(
    {
      provider: "claude",
      apiKey: "sk-ant-test",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-test",
      temperature: 0.1,
      maxTokens: 300
    },
    messages
  );

  assert.equal(request.url, "https://api.anthropic.com/v1/messages");
  assert.equal(request.options.headers["x-api-key"], "sk-ant-test");
  assert.equal(request.options.headers["anthropic-version"], "2023-06-01");
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, "claude-test");
  assert.match(body.system, /Answer using only the markdown context/);
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].role, "user");
  assert.equal(request.extractReply({ content: [{ type: "text", text: "It costs $9." }] }), "It costs $9.");
});

test("createMarkdownRagReply returns fallback without provider call when no chunks match", async () => {
  let providerCalled = false;
  const reply = await createMarkdownRagReply(
    "What is the refund policy?",
    {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-test",
      temperature: 0.2,
      maxTokens: 256
    },
    [
      {
        id: "/docs/hours.md#0",
        url: "/docs/hours.md",
        text: "# Hours\nThe support desk is open from 9 AM to 5 PM."
      }
    ],
    async () => {
      providerCalled = true;
      return { ok: true, json: async () => ({}) };
    }
  );

  assert.equal(reply, MARKDOWN_UNAVAILABLE_REPLY);
  assert.equal(providerCalled, false);
});

test("createMarkdownRagReply calls provider directly when no markdown files are configured", async () => {
  let requestBody;
  const reply = await createMarkdownRagReply(
    "What is on the schedule today?",
    {
      provider: "openrouter",
      apiKey: "sk-or-test",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      temperature: 0.7,
      maxTokens: 1024,
      name: "Iris",
      markdownFiles: []
    },
    [],
    async (url, options) => {
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      assert.equal(options.headers.Authorization, "Bearer sk-or-test");
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "The event schedule starts at 9 AM." } }]
        })
      };
    }
  );

  assert.equal(reply, "The event schedule starts at 9 AM.");
  assert.equal(requestBody.model, "nvidia/nemotron-3-ultra-550b-a55b");
  assert.deepEqual(requestBody.messages, [
    {
      role: "system",
      content: "You are Iris, a helpful website chatbot. Answer clearly and concisely."
    },
    { role: "user", content: "What is on the schedule today?" }
  ]);
});

test("createMarkdownRagReply sends matching markdown context to the provider", async () => {
  let requestBody;
  const reply = await createMarkdownRagReply(
    "How much does Basic cost?",
    {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-test",
      temperature: 0.2,
      maxTokens: 256
    },
    [
      {
        id: "/docs/pricing.md#0",
        url: "/docs/pricing.md",
        text: "# Pricing\nThe Basic plan costs $9 per month."
      }
    ],
    async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/chat/completions");
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Basic costs $9 per month.",
                  evidence: "The Basic plan costs $9 per month."
                })
              }
            }
          ]
        })
      };
    }
  );

  assert.equal(reply, "Basic costs $9 per month.");
  assert.match(requestBody.messages[1].content, /The Basic plan costs \$9 per month/);
});

test("createMarkdownRagReply rejects provider answers without markdown evidence", async () => {
  const reply = await createMarkdownRagReply(
    "How much does Basic cost?",
    {
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-test",
      temperature: 0.2,
      maxTokens: 256
    },
    [
      {
        id: "/docs/pricing.md#0",
        url: "/docs/pricing.md",
        text: "# Pricing\nThe Basic plan costs $9 per month."
      }
    ],
    async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "Premium is free forever.",
                evidence: "Premium is free forever."
              })
            }
          }
        ]
      })
    })
  );

  assert.equal(reply, MARKDOWN_UNAVAILABLE_REPLY);
});
