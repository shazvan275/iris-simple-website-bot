# iris

Floating Iris assistant component for React apps.

## Install

```bash
npm install iris
```

For local development from this workspace:

```bash
npm install ../iris
```

## Usage

```jsx
import { IrisAssistant } from "iris";
import "iris/style.css";

export function App() {
  return <IrisAssistant />;
}
```

## Configuration

Create a config file in your app and pass it into the assistant when you mount it:

```js
// iris.config.js
const irisConfig = {
  provider: "openai", // "claude", "openai", "openrouter", or "selfhosted"
  apiKey: "",
  baseUrl: "/api/iris/v1",
  model: "gpt-4.1-mini",
  temperature: 0.7,
  maxTokens: 1024,
  name: "Iris",
  introText: "Hi! Am Iris, your AI assistant. How can I help you today?",
  markdownFiles: "", // leave empty for normal provider chat
  tiles: [
    { label: "Ask a question", message: "I have a question about the event." },
    { label: "Event schedule", message: "What’s on the schedule today?" },
    { label: "Get support", message: "I need some support, please." }
  ]
};

export default irisConfig;
```

```jsx
import { IrisAssistant } from "iris";
import "iris/style.css";
import irisConfig from "./iris.config.js";

export function App() {
  return <IrisAssistant config={irisConfig} />;
}
```

Iris reads this config at initialization. It does not render a settings panel or store credentials in localStorage.

Because Iris runs in the browser, any `apiKey` bundled into client code is visible to site visitors. For production third-party providers, use a same-origin backend/proxy or a self-hosted OpenAI-compatible endpoint instead of exposing a provider secret in `VITE_` environment variables.

For OpenRouter, set `provider: "openrouter"`, use `baseUrl: "https://openrouter.ai/api/v1"`, and pass the key through `VITE_IRIS_API_KEY` only for local demos.

## Production proxy

For production, keep the provider key on your server and point Iris at a same-origin OpenAI-compatible endpoint:

```js
const irisConfig = {
  provider: "openai",
  apiKey: "",
  baseUrl: "/api/iris/v1",
  model: "gpt-4.1-mini"
};
```

Your backend should receive `/api/iris/v1/chat/completions`, add the provider `Authorization` header from a server-only environment variable, and forward the request to the provider. Do not blindly expose a raw proxy: validate the request, enforce allowed models, cap `max_tokens`, add rate limits, and log abuse-safe metadata only.

## Markdown RAG

Set `markdownFiles` to a comma-separated list of public `.md` URLs served by your website. Iris ignores entries that are not markdown files.

When `markdownFiles` is empty, Iris skips markdown retrieval and sends the user message directly to the configured provider.

For each question, Iris fetches the configured markdown files, retrieves relevant sections, and asks the configured model to answer only from that markdown context. Only relative URLs and `http:` or `https:` URLs are accepted. Iris caps the number and size of loaded markdown files to keep browser and provider requests bounded.

The model response must include an exact evidence quote from the retrieved markdown. If no relevant markdown is found, or the model returns an unsupported answer, Iris responds that the information is not available in the markdown files.

The package expects React 18 or newer from the consuming app.
