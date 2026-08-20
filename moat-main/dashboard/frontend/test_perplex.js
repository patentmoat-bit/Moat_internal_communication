require("dotenv").config({ path: ".env.local" });
const apiKey = process.env.PERPLEXITY_API_KEY;
async function run() {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: "hello" }],
    }),
  });
  console.log(await response.text());
}
run();
