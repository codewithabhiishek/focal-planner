export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ configured: Boolean(process.env.GROQ_API_KEY) });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { model, system, user, apiKey } = req.body || {};
    const key = apiKey || process.env.GROQ_API_KEY;

    if (!key) {
      return res.status(400).json({
        error: "No GROQ_API_KEY found in server environment variables.",
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
