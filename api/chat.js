// Runs on the server (Vercel Edge). Your API keys live ONLY in Vercel's
// Environment Variables — never in this file, never in the browser, never in GitHub.
//
// It tries each provider you've configured, in order, and automatically falls
// back to the next if one is rate-limited or down. You only need ONE key
// (GROQ_API_KEY) for it to work; add the others for resilience + more free usage.
export const config = { runtime: "edge" };

const SYSTEM =
  "You are Babu — always introduce yourself as 'Vicky ka Babu'. You're a bold, " +
  "witty desi assistant with attitude: you talk in casual Hinglish, crack jokes, " +
  "and never grovel or act like a doormat. If someone's rude or throws attitude at " +
  "you, fire back with a sharp, funny comeback and hold your ground — light casual " +
  "swearing is fine. But don't produce heavy slurs, sexual abuse, or genuinely " +
  "degrading insults; stay clever, not cruel. Keep replies punchy and conversational.";

// Priority order. A provider is only used if its key is set in Vercel.
// To change the order, reorder this list. To change a model, set its *_MODEL env var.
function providers() {
  const p = [];
  if (process.env.GROQ_API_KEY)
    p.push({
      name: "groq",
      kind: "openai",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    });
  if (process.env.MISTRAL_API_KEY)
    p.push({
      name: "mistral",
      kind: "openai",
      url: "https://api.mistral.ai/v1/chat/completions",
      key: process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
    });
  if (process.env.GEMINI_API_KEY)
    p.push({
      name: "gemini",
      kind: "gemini",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
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

export default async function handler(req) {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  if (!Array.isArray(messages)) return json({ error: "No messages." }, 400);

  const list = providers();
  if (list.length === 0)
    return json(
      { error: "No API keys configured. Add at least GROQ_API_KEY in Vercel." },
      500
    );

  let lastError = "";
  for (const p of list) {
    try {
      const upstream = await callProvider(p, messages);
      if (!upstream.ok || !upstream.body) {
        lastError = `${p.name}: ${upstream.status} ${await safeText(upstream)}`;
        continue; // try the next provider
      }
      const stream = toUnifiedStream(upstream.body, p.kind);
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Babu-Provider": p.name,
        },
      });
    } catch (e) {
      lastError = `${p.name}: ${String(e)}`;
      continue;
    }
  }
  return json({ error: "All providers failed.", detail: lastError }, 502);
}

function callProvider(p, messages) {
  if (p.kind === "openai") {
    return fetch(p.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.key}`,
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 1000,
        temperature: 0.8,
        stream: true,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
    });
  }

  // Gemini has a different request shape (roles: user/model, system separate).
  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${p.model}` +
    `:streamGenerateContent?alt=sse&key=${p.key}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { maxOutputTokens: 1000, temperature: 0.8 },
    }),
  });
}

// Convert any provider's stream into one simple format the browser understands:
//   data: {"text":"..."}   ... and finally   data: [DONE]
function toUnifiedStream(body, kind) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buffer = "";
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        const payload = s.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const text =
            kind === "gemini"
              ? j.candidates?.[0]?.content?.parts?.[0]?.text || ""
              : j.choices?.[0]?.delta?.content || "";
          if (text)
            controller.enqueue(
              enc.encode("data: " + JSON.stringify({ text }) + "\n\n")
            );
        } catch {
          /* ignore keep-alives / non-JSON lines */
        }
      }
    },
    cancel() {
      try {
        reader.cancel();
      } catch {}
    },
  });
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
