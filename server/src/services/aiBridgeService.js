const { aiServiceUrl } = require("../config/env");

async function getAiRecommendation(payload) {
  const response = await fetch(`${aiServiceUrl}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service error: ${text || response.statusText}`);
  }

  return response.json();
}

module.exports = { getAiRecommendation };
