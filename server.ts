import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialization for Gemini API client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please configure it in your environment or Settings.");
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "artpersona-studio", timestamp: new Date().toISOString() });
});

// Prompt generation testbed via Gemini with dynamic model parameters & resilient fallback
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, persona, styles, thinkMode, modelTier, maxOutputTokens, temperature, topP } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const ai = getGenAI();

    // Map model selector tier to candidate sequences
    // flash_38: Flash 3.8 (Default Workhorse, Recommended)
    // flash_36: Flash 3.6 (High-Agility Flash)
    // flash_35_lite: Flash 3.5 Lite (Cost-Effective Model)
    // pro_31: Pro 3.1 (Heavy Thinking Tasks)
    const tier = typeof modelTier === "string" ? modelTier.toLowerCase() : "flash_38";
    const isHeavyThinking = tier === "pro_31" || tier === "pro" || thinkMode === true;

    let candidateModels: string[];
    let defaultTemp = 0.85;
    let defaultTopP = 0.95;
    let defaultTokenBudget = 2048;

    if (tier === "pro_31" || tier === "pro" || isHeavyThinking) {
      candidateModels = ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-2.5-flash"];
      defaultTemp = 0.75;
      defaultTopP = 0.95;
      defaultTokenBudget = 4096;
    } else if (tier === "flash_35_lite" || tier === "lite") {
      // Flash 3.5 Lite: cost-effective model, high-throughput, low latency
      candidateModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash"];
      defaultTemp = 0.70;
      defaultTopP = 0.90;
      defaultTokenBudget = 1024;
    } else if (tier === "flash_36") {
      // Flash 3.6: agile prompt generation
      candidateModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-2.5-flash"];
      defaultTemp = 0.80;
      defaultTopP = 0.95;
      defaultTokenBudget = 2048;
    } else {
      // Default: Flash 3.8 (Default Workhorse)
      candidateModels = ["gemini-3.8-flash", "gemini-2.5-flash"];
      defaultTemp = 0.85;
      defaultTopP = 0.95;
      defaultTokenBudget = 2048;
    }

    // Dynamic API Configuration parameters
    const effectiveTemp =
      typeof temperature === "number" && !isNaN(temperature) && temperature >= 0 && temperature <= 2
        ? temperature
        : defaultTemp;

    const effectiveTopP =
      typeof topP === "number" && !isNaN(topP) && topP >= 0.1 && topP <= 1
        ? topP
        : defaultTopP;

    const outputTokenBudget =
      typeof maxOutputTokens === "number" && maxOutputTokens >= 256 && maxOutputTokens <= 8192
        ? maxOutputTokens
        : defaultTokenBudget;

    // Construct system instructions
    let systemInstruction = persona?.trim() || 
      "You are an expert AI visual artist and prompt engineer. Transform the user's idea and visual styles into an expansive, descriptive, cinematic text-to-image prompt.";

    if (isHeavyThinking) {
      systemInstruction = `[REASONING PROTOCOL ENABLED] Deeply analyze artistic composition, historical camera/film emulsions, raking chiaroscuro or ambient light interactions, textural tactile layers, and psychological posture nuances before composing the final prompt structure.\n\n${systemInstruction}`;
    }

    const styleAddition = Array.isArray(styles) && styles.length > 0 ? `\nApplied Aesthetic Styles:\n${styles.join(", ")}` : "";
    const userMessage = `${prompt.trim()}${styleAddition}`;

    let lastError: any = null;
    let successfulModel = "";
    let generatedText = "";
    let fallbackNotice = "";

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const modelToTry = candidateModels[mIdx];
      // Try up to 2 attempts per model with backoff if 503/429
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: [
              {
                role: "user",
                parts: [{ text: userMessage }],
              },
            ],
            config: {
              systemInstruction: systemInstruction,
              temperature: effectiveTemp,
              topP: effectiveTopP,
              maxOutputTokens: outputTokenBudget,
            },
          });

          generatedText = response.text || "";
          successfulModel = modelToTry;
          if (mIdx > 0) {
            fallbackNotice = `Primary model (${candidateModels[0]}) experienced temporary high demand. Seamlessly fulfilled via ${modelToTry}.`;
          }
          break; // Success!
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code || (err?.message?.includes("503") ? 503 : 0);
          const isHighDemand = status === 503 || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE");
          
          if (isHighDemand && attempt < 2) {
            // Wait 750ms before quick retry on momentary spike
            await new Promise((resolve) => setTimeout(resolve, 750));
            continue;
          }
          // If high demand persisted or model not found, try next candidate model
          break;
        }
      }

      if (generatedText) {
        break;
      }
    }

    if (!generatedText) {
      const errMsg = lastError?.message || "All models are currently experiencing temporary high demand. Please retry in a few seconds.";
      res.status(503).json({ error: errMsg });
      return;
    }

    let modelNameDisplay = "Flash 3.8 (Default Workhorse)";
    if (successfulModel.includes("pro") || successfulModel.includes("3.1-pro")) {
      modelNameDisplay = "Pro 3.1 (Heavy Thinking)";
    } else if (successfulModel.includes("lite") || successfulModel.includes("3.5-flash-lite") || successfulModel.includes("3.1-flash-lite")) {
      modelNameDisplay = "Flash 3.5 Lite (Cost-Effective)";
    } else if (successfulModel.includes("3.6")) {
      modelNameDisplay = "Flash 3.6 (High-Agility)";
    } else if (successfulModel.includes("3.8")) {
      modelNameDisplay = "Flash 3.8 (Default Workhorse)";
    } else {
      modelNameDisplay = `${successfulModel} (Backup Engine)`;
    }

    res.json({
      result: generatedText,
      modelUsed: successfulModel,
      modelNameDisplay,
      fallbackNotice,
      appliedConfig: {
        temperature: effectiveTemp,
        topP: effectiveTopP,
        maxOutputTokens: outputTokenBudget,
        thinkMode: isHeavyThinking,
      },
    });
  } catch (error: any) {
    console.error("Prompt generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate prompt" });
  }
});

// Explicitly trap any unmatched /api routes so they NEVER fall through to Vite HTML SPA fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
});

// Global JSON error handler (e.g. invalid JSON payloads)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Global server error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArtPersona Studio server running on http://0.0.0.0:${PORT}`);
  });
}

start();
