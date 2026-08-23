import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "groq-backend-api",
        configureServer(server) {
          server.middlewares.use("/api/groq", async (req, res) => {
            if (req.method === "POST") {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", async () => {
                try {
                  const { model, system, user, apiKey } = JSON.parse(body || "{}");
                  const key = apiKey || env.GROQ_API_KEY || process.env.GROQ_API_KEY;

                  if (!key) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        error: "No GROQ_API_KEY found in server environment variables (.env).",
                      })
                    );
                    return;
                  }

                  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${key}`,
                    },
                    body: JSON.stringify({
                      model: model || "openai/gpt-oss-120b",
                      temperature: 0.2,
                      response_format: { type: "json_object" },
                      messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                      ],
                    }),
                  });

                  const data = await groqRes.json();
                  res.statusCode = groqRes.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else if (req.method === "GET") {
              const hasKey = Boolean(env.GROQ_API_KEY || process.env.GROQ_API_KEY);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ configured: hasKey }));
            } else {
              res.statusCode = 405;
              res.end();
            }
          });
        },
      },
    ],
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      hmr: {
        port: 3000,
      },
    },
  };
});
