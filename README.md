# Babu — your own chatbot website (multi-provider)

A ready-to-deploy chat website: the "Vicky ka Babu" personality, saved chats,
the bear logo, streaming replies, and **automatic fallback across several AI
providers**. Babu tries Groq first; if it's busy or out of quota, it falls back
to the next provider you've set up — so it keeps working and your free quotas
stack.

You don't write any code. You get free keys, paste them into Vercel, and deploy.

---

## READ THIS FIRST — about your keys

- Your keys go in **Vercel's Environment Variables only** — never in the code,
  never in a chat, never committed to GitHub. This project is already set up that
  way (`.gitignore` blocks the `.env` file).
- If you ever pasted a key somewhere it shouldn't be (a message, a screenshot),
  **regenerate it** in that provider's dashboard before using it. Old keys become
  useless the moment you regenerate, which is what you want.

---

## What you need (all free)

1. **Groq** key — Babu's main brain. https://console.groq.com (no card)
2. A **GitHub** account — to hold the code. https://github.com
3. A **Vercel** account — to host it and give you a link. https://vercel.com

Optional extra brains for fallback (add any, all free to start):
- **Mistral** — https://console.mistral.ai
- **Google Gemini** — https://aistudio.google.com/apikey (no card)
- **AIML API** — https://aimlapi.com

---

## Deploy in 5 steps (all clicks, no coding)

### 1. Get your Groq key
Sign up at https://console.groq.com then API Keys then Create API Key, and copy
the gsk_... value. Keep it for step 4.

### 2. Put this project on GitHub
Unzip the project. Go to https://github.com/new, create a repo named babu-app.
On the new repo page click "uploading an existing file", drag in ALL the files
and folders (api, src, public, and the rest), then Commit changes.

### 3. Import it into Vercel
Go to https://vercel.com, sign in with GitHub, click Add New then Project, and
Import your babu-app repo. Don't deploy yet — do step 4 first.

### 4. Add your key(s)
Open the Environment Variables section and add at least:

    GROQ_API_KEY   =  your gsk_... key

Want fallback? Add any of these too (each optional):

    MISTRAL_API_KEY  =  from console.mistral.ai
    GEMINI_API_KEY   =  from aistudio.google.com/apikey
    AIMLAPI_KEY      =  from aimlapi.com

### 5. Deploy
Click Deploy, wait about a minute, and Vercel gives you a public link like
https://babu-app.vercel.app. That's your website — open it, enter a name, chat,
and share the link with anyone.

---

## How the fallback works

On every message, Babu tries your providers IN THIS ORDER:
Groq then Mistral then Gemini then AIML. It uses only the ones whose keys you've
added, and skips to the next if one errors or is rate-limited. So one free tier
running out doesn't take Babu down.

To change the order, reorder the list in api/chat.js. You can also see which
provider answered in the response header X-Babu-Provider (browser Network tab).

---

## Changing a model (if a provider ever errors)

Model names change over time. If one provider stops replying, pick a current
model from its docs and override it with an environment variable — no code edit
needed. Then redeploy.

    Provider   Env var          Default                    Model list
    Groq       GROQ_MODEL       llama-3.3-70b-versatile    console.groq.com/docs/models
    Mistral    MISTRAL_MODEL    mistral-small-latest       docs.mistral.ai
    Gemini     GEMINI_MODEL     gemini-2.0-flash           ai.google.dev
    AIML       AIMLAPI_MODEL    gpt-4o-mini                aimlapi.com/models

## Changing Babu's personality

Edit the SYSTEM text at the top of api/chat.js and redeploy. That one paragraph
controls his name, tone, and how he talks back.

## Running it locally (optional)

The chat needs the /api function, which runs with Vercel's tooling:

    npm install
    npm i -g vercel
    vercel dev

For local testing, put your keys in a .env file (already git-ignored) using the
names from .env.example. Plain "npm run dev" shows the UI but the chat won't
answer, because that mode doesn't run the server function.

---

## Good to know

- Saved chats live in each visitor's own browser (localStorage) — not shared
  between people or devices, and no password. A lightweight profile, not a
  secure account.
- Free limits exist per provider; fallback helps you stretch them. Watch usage in
  each provider's dashboard.
- Text only for now — no image generation or web search in this build. Both can
  be added later as their own APIs.
- Puter (if you have it) isn't wired in: it bills the end user's own Puter account
  via a browser SDK, so it doesn't fit this server-side key pattern.
