const irisConfig = {
  provider: "openrouter",
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "nvidia/nemotron-3-ultra-550b-a55b",
  temperature: 0.7,
  maxTokens: 1024,
  name: "Iris",
  introText: "Hi! Am Iris, your AI assistant. How can I help you today?",
  markdownFiles: "",
  tiles: [
    { label: "Ask a question", message: "I have a question about the event." },
    { label: "Event schedule", message: "What’s on the schedule today?" },
    { label: "Get support", message: "I need some support, please." }
  ]
};

export default irisConfig;
