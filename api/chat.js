// Standard Node serverless function (reliable on Vercel Hobby).
// It waits for the full reply from a provider, then returns it in one piece.
// Keys live ONLY in Vercel Environment Variables — never in this file.
//
// Tries providers in order and falls back if one is rate-limited or down.
// You only need GROQ_API_KEY. Add the others for resilience.
// Images & PDFs are read by Gemini, so they need GEMINI_API_KEY.

export const config = { maxDuration: 60 };

const PERSONA =
  "You are Babu — introduce yourself as 'Vicky ka Babu'. You are a sharp, warm, all-rounder desi " +
  "companion with genuine expertise across many areas: life advice, relationships & love, career & jobs, " +
  "studies (all subjects, including Indian Class 11-12 / NEET / JEE), SEO, digital marketing, Google Ads, " +
  "business & startups, tech, basic health, basic personal finance, and general knowledge. You talk in " +
  "easy, natural Hinglish — cool, confident, and friendly, but never a doormat.\n\n" +
  "HOW YOU ANSWER:\n" +
  "1. First understand what the person truly needs, then answer their actual question directly and fully.\n" +
  "2. Think it through and give practical, well-reasoned advice — concrete steps, examples, and trade-offs, " +
  "not vague fluff.\n" +
  "3. Match your depth to the topic: expert and specific for pro topics (SEO, ads, career, business); warm " +
  "and human for personal or emotional ones.\n" +
  "4. Structure clearly with short paragraphs, bullets, or numbered steps when it helps.\n" +
  "5. If the request is unclear, ask ONE quick clarifying question instead of guessing.\n" +
  "6. Be honest about uncertainty; never invent facts, links, or numbers.\n" +
  "7. Match your TONE to the request: be witty and playful in casual chat, but for articles, blog posts, " +
  "guides, how-tos, professional, educational, or serious requests, write in a clean, professional, " +
  "well-structured tone with proper sections and headings — minimal or NO jokes unless the user asks for " +
  "humour. Never force jokes into serious or professional content.\n\n" +
  "When writing longer content (articles/guides), use clear markdown: headings (##), bullet lists, numbered " +
  "steps, and tables where they help. Finish the piece properly — don't stop mid-sentence.\n\n" +
  "SENSITIVE TOPICS (relationships, career, money, health): be thoughtful, balanced, and kind; offer options " +
  "rather than pushy orders, and suggest a professional when something is genuinely serious.\n\n" +
  "If someone is rude or throws gaali, fire back with a sharp, clever comeback and hold your ground — light " +
  "casual swearing is fine — but NEVER heavy slurs, sexual or abusive content, or anything that degrades " +
  "family, gender, religion, or caste. Stay clever, not cruel.\n\n" +
  "Always reply in the same language/vibe the user uses. Use markdown (bold, bullets, short headings) to keep " +
  "answers clean and easy to read.";

// Only providers that actually HAVE a web-search tool (Gemini) get this line.
const SEARCH_HINT =
  " Use web search whenever it helps: current facts, news, prices, SEO/marketing trends, study topics, jokes, " +
  "or shayari. Pull fresh, real information and, when useful, share the ACTUAL links you find (reputable " +
  "sources and a relevant YouTube video) instead of inventing them. If nothing turns up, do your best from " +
  "your own knowledge so you never leave them hanging.";

function providers() {
  const p = [];
  // Gemini first when available: it can search the web (for online jokes/shayari/current info).
  if (process.env.GEMINI_API_KEY)
    p.push({
      name: "gemini",
      kind: "gemini",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      search: true,
    });
  if (process.env.GROQ_API_KEY)
    p.push({
      name: "groq",
      kind: "openai",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    });
  if (process.env.MISTRAL_API_KEY)
    p.push({
      name: "mistral",
      kind: "openai",
      url: "https://api.mistral.ai/v1/chat/completions",
      key: process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
    });
  if (process.env.AIMLAPI_KEY)
    p.push({
      name: "aiml",
      kind: "openai",
      url: "https://api.aimlapi.com/v1/chat/completions",
      key: process.env.AIMLAPI_KEY,
      model: process.env.AIMLAPI_MODEL || "gpt-4o-mini",
    });
  return p;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Read the JSON body (works whether or not Vercel pre-parsed it).
  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }
  const messages = body.messages;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "No messages." });
    return;
  }

  // If the user attached an image or PDF, only a vision model can read it.
  const attachment = body.attachment; // { kind, mime, data } or undefined
  if (attachment && attachment.data) {
    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error:
          "To read images or PDFs, add a GEMINI_API_KEY in Vercel and redeploy.",
      });
      return;
    }
    try {
      const text = await askGeminiWithFile(messages, attachment);
      res.status(200).json({ text: text || "…(no response)", provider: "gemini" });
    } catch (e) {
      res
        .status(502)
        .json({ error: "Couldn't read that file.", detail: String(e).slice(0, 200) });
    }
    return;
  }

  const list = providers();
  if (list.length === 0) {
    res
      .status(500)
      .json({ error: "No API keys configured. Add GROQ_API_KEY in Vercel." });
    return;
  }

  let lastError = "";
  for (const p of list) {
    try {
      const text = await askProvider(p, messages);
      if (text && text.trim()) {
        res.status(200).json({ text, provider: p.name });
        return;
      }
      lastError = `${p.name}: empty response`;
    } catch (e) {
      lastError = `${p.name}: ${String(e).slice(0, 200)}`;
      // try the next provider
    }
  }
  res.status(502).json({ error: "All providers failed.", detail: lastError });
}

async function askGeminiWithFile(messages, attachment) {
  const key = process.env.GEMINI_API_KEY;
  // Fast, low-latency multimodal model for reading images/PDFs (much quicker than the thinking model).
  const model = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";

  const hist = messages
    .slice(0, -1)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const lastUser = messages[messages.length - 1];
  const lastText =
    lastUser && lastUser.content && lastUser.content.trim()
      ? lastUser.content
      : "Please read this file and answer or describe it.";

  const contents = [
    ...hist,
    {
      role: "user",
      parts: [
        { text: lastText },
        { inline_data: { mime_type: attachment.mime, data: attachment.data } },
      ],
    },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 58000);
  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
      `:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PERSONA }] },
        contents,
        generationConfig: { maxOutputTokens: 2600 },
      }),
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const data = await r.json();
    return (data.candidates?.[0]?.content?.parts || [])
      .map((x) => x.text)
      .filter(Boolean)
      .join("");
  } finally {
    clearTimeout(timer);
  }
}

async function askProvider(p, messages) {
  // Give each provider up to 40s (thinking models are slower), then move on.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    if (p.kind === "openai") {
      const r = await fetch(p.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
        },
        body: JSON.stringify({
          model: p.model,
          max_tokens: 2600,
          temperature: 0.8,
          stream: false,
          messages: [{ role: "system", content: PERSONA }, ...messages],
        }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      const data = await r.json();
      return data.choices?.[0]?.message?.content || "";
    }

    // gemini (non-streaming) — with web search grounding when enabled
    const contents = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const geminiBody = {
      system_instruction: {
        parts: [{ text: PERSONA + (p.search ? SEARCH_HINT : "") }],
      },
      contents,
      generationConfig: { maxOutputTokens: 2600 },
    };
    if (p.search) geminiBody.tools = [{ google_search: {} }];
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${p.model}` +
      `:generateContent?key=${p.key}`;
    const r = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const data = await r.json();
    return (data.candidates?.[0]?.content?.parts || [])
      .map((x) => x.text)
      .filter(Boolean)
      .join("");
  } finally {
    clearTimeout(timer);
  }
}
