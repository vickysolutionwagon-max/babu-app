import React, { useState, useRef, useEffect } from "react";

/* ---- saved chats live in the browser's localStorage (works on your own site) ---- */
const store = {
  get(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
};
const slug = (n) =>
  n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "user";
const chatsKey = (name) => `babu-chats-${slug(name)}`;
const uid = () => Math.random().toString(36).slice(2, 10);
const LOGO = "data:image/png;base64,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";

/* ============================== APP ============================== */
export default function App() {
  const [booted, setBooted] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loginName, setLoginName] = useState("");
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebar, setSidebar] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const dirty = useRef(false);

  useEffect(() => {
    const name = store.get("babu-profile");
    if (name) {
      setProfile(name);
      const list = store.get(chatsKey(name)) || [];
      setChats(list);
      setActiveId(list[0]?.id ?? null);
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted || !profile || !dirty.current) return;
    store.set(chatsKey(profile), chats);
  }, [chats, profile, booted]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeId, chats, loading]);

  const activeChat = chats.find((c) => c.id === activeId) || null;

  function login() {
    const name = loginName.trim();
    if (!name) return;
    store.set("babu-profile", name);
    const list = store.get(chatsKey(name)) || [];
    setProfile(name);
    setChats(list);
    setActiveId(list[0]?.id ?? null);
    setLoginName("");
  }
  function logout() {
    setProfile(null);
    setChats([]);
    setActiveId(null);
    setSidebar(false);
  }

  function newChat() {
    dirty.current = true;
    const c = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
    setChats((cs) => [c, ...cs]);
    setActiveId(c.id);
    setSidebar(false);
    setError(null);
  }
  function selectChat(id) {
    setActiveId(id);
    setSidebar(false);
    setError(null);
  }
  function deleteChat(id, e) {
    e.stopPropagation();
    dirty.current = true;
    setChats((cs) => {
      const left = cs.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(left[0]?.id ?? null);
      return left;
    });
  }

  function updateChat(id, messages) {
    setChats((cs) =>
      cs.map((c) =>
        c.id === id
          ? {
              ...c,
              messages,
              updatedAt: Date.now(),
              title:
                c.title === "New chat" && messages[0]
                  ? messages[0].content.slice(0, 34)
                  : c.title,
            }
          : c
      )
    );
  }

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    dirty.current = true;
    setError(null);
    setInput("");

    let chatId = activeId;
    let baseMsgs = activeChat ? activeChat.messages : [];
    if (!activeChat) {
      chatId = uid();
      setChats((cs) => [
        { id: chatId, title: "New chat", messages: [], updatedAt: Date.now() },
        ...cs,
      ]);
      setActiveId(chatId);
      baseMsgs = [];
    }

    const nextMsgs = [...baseMsgs, { role: "user", content }];
    updateChat(chatId, nextMsgs);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Babu couldn't reply. Check the server setup.";
        try {
          const j = await res.json();
          if (j.error) msg = j.error + (j.detail ? " — " + j.detail : "");
        } catch {}
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            const delta = evt.text;
            if (delta) {
              acc += delta;
              updateChat(chatId, [
                ...nextMsgs,
                { role: "assistant", content: acc },
              ]);
            }
          } catch {}
        }
      }

      if (!acc.trim())
        updateChat(chatId, [
          ...nextMsgs,
          { role: "assistant", content: "…(no response)" },
        ]);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!booted)
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <Aurora />
        <div style={{ ...S.center, color: "#fff", opacity: 0.85 }}>Loading…</div>
      </div>
    );

  if (!profile)
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <Aurora />
        <div style={S.loginCard} className="pop-in">
          <img src={LOGO} alt="Babu" style={S.bigMarkImg} />
          <h1 style={S.loginTitle}>Babu</h1>
          <p style={S.loginSub}>
            Enter a name to save your chats and pick up where you left off.
          </p>
          <input
            style={S.loginInput}
            placeholder="Your name"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            autoFocus
          />
          <button style={S.loginBtn} onClick={login} disabled={!loginName.trim()}>
            Continue
          </button>
          <p style={S.loginNote}>Saved on this device • no password needed</p>
        </div>
      </div>
    );

  const empty = !activeChat || activeChat.messages.length === 0;
  const lastMsg = activeChat?.messages[activeChat.messages.length - 1];
  const showTyping = loading && (!lastMsg || lastMsg.role === "user");
  const suggestions = [
    "Tu kaun hai?",
    "Roast me a little 🔥",
    "Ek shaayari sunaa",
    "Explain black holes simply",
  ];

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <Aurora />
      {sidebar && <div style={S.scrim} onClick={() => setSidebar(false)} />}

      <div style={S.shell} className="pop-in">
        <aside style={{ ...S.side, transform: sidebar ? "translateX(0)" : "" }} className="side">
          <div style={S.sideHead}>
            <span style={S.sideTitle}>Chats</span>
            <button style={S.newBtn} onClick={newChat}>+ New</button>
          </div>
          <div style={S.chatList}>
            {chats.length === 0 && <div style={S.sideEmpty}>No saved chats yet.</div>}
            {chats.map((c) => (
              <div
                key={c.id}
                onClick={() => selectChat(c.id)}
                style={{ ...S.chatItem, ...(c.id === activeId ? S.chatItemActive : {}) }}
                className="chat-item"
              >
                <span style={S.chatItemText}>{c.title || "New chat"}</span>
                <button style={S.del} onClick={(e) => deleteChat(c.id, e)} aria-label="Delete">×</button>
              </div>
            ))}
          </div>
          <div style={S.sideFoot}>
            <div style={S.who}>
              <div style={S.whoAvatar}>{profile[0]?.toUpperCase()}</div>
              <span style={S.whoName}>{profile}</span>
            </div>
            <button style={S.logout} onClick={logout}>Log out</button>
          </div>
        </aside>

        <div style={S.main}>
          <header style={S.header}>
            <button className="menu-btn" onClick={() => setSidebar((v) => !v)} aria-label="Menu">
              <span style={S.menuLine} /><span style={S.menuLine} /><span style={S.menuLine} />
            </button>
            <img src={LOGO} alt="Babu" style={S.avatarImg} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={S.name}>Babu</div>
              <div style={S.status}><span style={S.statusDot} /> Vicky ka Babu</div>
            </div>
          </header>

          <main ref={scrollRef} style={S.messages}>
            {empty && (
              <div style={S.welcome} className="fade-in">
                <img src={LOGO} alt="Babu" style={S.bigMarkImg} />
                <h2 style={S.wTitle}>Hello, I'm Babu 😎</h2>
                <p style={S.wSub}>Vicky ka Babu, at your service. Kuch bhi poocho, {profile}.</p>
                <div style={S.chips}>
                  {suggestions.map((s) => (
                    <button key={s} style={S.chip} className="chip" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {activeChat?.messages.map((m, i) => (
              <div
                key={i}
                style={{ ...S.row, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
                className="msg-in"
              >
                <div style={{ ...S.bubble, ...(m.role === "user" ? S.userB : S.botB) }}>
                  {m.content}
                </div>
              </div>
            ))}

            {showTyping && (
              <div style={{ ...S.row, justifyContent: "flex-start" }} className="msg-in">
                <div style={{ ...S.bubble, ...S.botB }}>
                  <span className="typing"><span></span><span></span><span></span></span>
                </div>
              </div>
            )}

            {error && <div style={S.error}>{error}</div>}
          </main>

          <footer style={S.composer}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Babu…"
              style={S.textarea}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ ...S.send, opacity: loading || !input.trim() ? 0.4 : 1 }}
              className="send"
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 12l16-8-6 8 6 8-16-8z" fill="currentColor" strokeLinejoin="round" />
              </svg>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Aurora() {
  return (
    <div style={S.aurora} aria-hidden>
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
    </div>
  );
}

/* ============================== STYLES ============================== */
const INK = "#171327";
const V1 = "#7c5cff";
const V2 = "#a78bfa";
const TEAL = "#22d3aa";

const S = {
  page: { position: "relative", minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e0b1e", padding: 16, boxSizing: "border-box", overflow: "hidden", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" },
  aurora: { position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 },
  center: { position: "relative", zIndex: 2 },
  scrim: { position: "absolute", inset: 0, background: "rgba(10,8,24,0.5)", zIndex: 5 },
  shell: { position: "relative", zIndex: 2, width: "100%", maxWidth: 900, height: "min(780px, 92vh)", display: "flex", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)", borderRadius: 26, border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 40px 90px -30px rgba(10,8,40,0.7)", overflow: "hidden" },
  side: { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", background: "rgba(248,247,255,0.9)", borderRight: "1px solid rgba(23,19,39,0.07)" },
  sideHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 10px" },
  sideTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#8b83a8" },
  newBtn: { border: "none", background: `linear-gradient(135deg,${V1},${V2})`, color: "#fff", fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 10, cursor: "pointer" },
  chatList: { flex: 1, overflowY: "auto", padding: "4px 8px", display: "flex", flexDirection: "column", gap: 4 },
  sideEmpty: { color: "#a49dbb", fontSize: 13, padding: "10px 12px" },
  chatItem: { display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderRadius: 12, cursor: "pointer", color: "#4b4463", fontSize: 14 },
  chatItemActive: { background: "rgba(124,92,255,0.12)", color: INK, fontWeight: 600 },
  chatItemText: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  del: { border: "none", background: "transparent", color: "#b3abca", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" },
  sideFoot: { padding: 12, borderTop: "1px solid rgba(23,19,39,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  who: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  whoAvatar: { width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${TEAL},#39c)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
  whoName: { fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  logout: { border: "1px solid rgba(23,19,39,0.12)", background: "transparent", color: "#6b6488", fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 9, cursor: "pointer", flexShrink: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(23,19,39,0.06)", background: "rgba(255,255,255,0.55)" },
  menuBtn: { display: "none", flexDirection: "column", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 4 },
  menuLine: { width: 20, height: 2, borderRadius: 2, background: "#6b6488", display: "block" },
  avatarImg: { width: 40, height: 40, borderRadius: 12, objectFit: "cover", display: "block", boxShadow: "0 8px 20px -6px rgba(217,120,124,0.55)" },
  name: { fontWeight: 700, color: INK, fontSize: 16, letterSpacing: -0.2 },
  status: { fontSize: 11.5, color: "#8b83a8", display: "flex", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: "50%", background: TEAL, boxShadow: `0 0 0 3px rgba(34,211,170,0.2)` },
  messages: { flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  welcome: { margin: "auto", textAlign: "center", maxWidth: 400 },
  bigMarkImg: { width: 72, height: 72, borderRadius: 20, objectFit: "cover", display: "block", margin: "0 auto 16px", boxShadow: "0 16px 34px -10px rgba(217,120,124,0.6)" },
  wTitle: { margin: 0, color: INK, fontSize: 23, letterSpacing: -0.4 },
  wSub: { margin: "6px 0 20px", color: "#8b83a8", fontSize: 14.5 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: { border: "1px solid rgba(124,92,255,0.25)", background: "rgba(124,92,255,0.06)", color: "#6a4fe0", fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 999, cursor: "pointer" },
  row: { display: "flex", width: "100%" },
  bubble: { maxWidth: "76%", padding: "11px 15px", borderRadius: 18, fontSize: 14.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  userB: { background: `linear-gradient(135deg,${V1},${V2})`, color: "#fff", borderBottomRightRadius: 6, boxShadow: "0 10px 22px -10px rgba(124,92,255,0.6)" },
  botB: { background: "#fff", color: INK, border: "1px solid rgba(23,19,39,0.07)", borderBottomLeftRadius: 6, boxShadow: "0 6px 16px -10px rgba(23,19,39,0.25)" },
  error: { alignSelf: "center", color: "#d14343", fontSize: 13, background: "rgba(209,67,67,0.08)", padding: "8px 14px", borderRadius: 10, textAlign: "center", maxWidth: "90%" },
  composer: { display: "flex", alignItems: "flex-end", gap: 10, padding: 14, borderTop: "1px solid rgba(23,19,39,0.06)", background: "rgba(255,255,255,0.6)" },
  textarea: { flex: 1, resize: "none", maxHeight: 120, border: "1px solid rgba(23,19,39,0.12)", borderRadius: 14, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", color: INK, outline: "none", background: "#fff", lineHeight: 1.4 },
  send: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, border: "none", background: `linear-gradient(135deg,${V1},${V2})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px -8px rgba(124,92,255,0.7)", cursor: "pointer", transition: "transform .12s, opacity .15s" },
  loginCard: { position: "relative", zIndex: 2, width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderRadius: 24, padding: "36px 28px", textAlign: "center", boxShadow: "0 40px 90px -30px rgba(10,8,40,0.7)", border: "1px solid rgba(255,255,255,0.5)" },
  loginTitle: { margin: "0 0 4px", fontSize: 26, color: INK, letterSpacing: -0.5 },
  loginSub: { margin: "0 0 22px", fontSize: 14, color: "#8b83a8", lineHeight: 1.5 },
  loginInput: { width: "100%", boxSizing: "border-box", border: "1px solid rgba(23,19,39,0.14)", borderRadius: 14, padding: "13px 15px", fontSize: 15, fontFamily: "inherit", outline: "none", color: INK, marginBottom: 12 },
  loginBtn: { width: "100%", border: "none", borderRadius: 14, padding: "13px", fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg,${V1},${V2})`, cursor: "pointer", boxShadow: "0 12px 26px -8px rgba(124,92,255,0.7)" },
  loginNote: { margin: "16px 0 0", fontSize: 12, color: "#a49dbb" },
};

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  *::-webkit-scrollbar { width: 8px; }
  *::-webkit-scrollbar-thumb { background: rgba(124,92,255,0.25); border-radius: 8px; }
  textarea:focus, input:focus { border-color: ${V1} !important; box-shadow: 0 0 0 3px rgba(124,92,255,0.14); }
  .send:hover:not(:disabled) { transform: translateY(-1px) scale(1.04); }
  .chip:hover { background: rgba(124,92,255,0.14); }
  .chat-item:hover { background: rgba(124,92,255,0.08); }
  .menu-btn { display: none; flex-direction: column; gap: 4px; background: transparent; border: none; cursor: pointer; padding: 4px; }
  .blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.55; }
  .b1 { width: 480px; height: 480px; background: ${V1}; top: -120px; left: -80px; animation: float1 16s ease-in-out infinite; }
  .b2 { width: 420px; height: 420px; background: ${TEAL}; bottom: -140px; right: -60px; animation: float2 19s ease-in-out infinite; }
  .b3 { width: 360px; height: 360px; background: #ff6bcb; top: 40%; left: 55%; animation: float3 22s ease-in-out infinite; }
  @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,40px)} }
  @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,-30px)} }
  @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,30px) scale(1.1)} }
  .typing { display:inline-flex; gap:4px; align-items:center; height:12px; }
  .typing span { width:7px; height:7px; border-radius:50%; background:${V1}; opacity:.5; animation:bounce 1.2s infinite ease-in-out; }
  .typing span:nth-child(2){ animation-delay:.15s; }
  .typing span:nth-child(3){ animation-delay:.3s; }
  @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
  .msg-in { animation: slideUp .32s cubic-bezier(.22,1,.36,1); }
  @keyframes slideUp { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
  .fade-in { animation: fade .5s ease; }
  @keyframes fade { from{opacity:0} to{opacity:1} }
  .pop-in { animation: pop .4s cubic-bezier(.22,1,.36,1); }
  @keyframes pop { from{opacity:0; transform:scale(.98)} to{opacity:1; transform:scale(1)} }
  @media (max-width: 720px) {
    .side { position: absolute; z-index: 6; height: 100%; transform: translateX(-105%); transition: transform .28s cubic-bezier(.22,1,.36,1); box-shadow: 12px 0 40px -10px rgba(10,8,40,0.4); }
    .menu-btn { display: flex; }
  }
  @media (prefers-reduced-motion: reduce) {
    .blob, .typing span, .msg-in, .fade-in, .pop-in { animation: none !important; }
  }
`;
