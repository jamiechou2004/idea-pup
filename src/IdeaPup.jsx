import { useState, useRef, useEffect } from "react";

/* ─────────────────────────────────────────────
   MOCHI · IDEA PUP — a white puppy desktop companion
   Collapsed puppy → compact brainstorm panel.
   Original character: round white pup, floppy ears,
   dot eyes, red collar, curly wagging tail.
────────────────────────────────────────────── */

const THINK_LINES = ["sniffing around…", "chasing the thought…", "digging for ideas…", "ears up, working…"];

async function askClaude(prompt) {
  // Inside a Claude.ai artifact, no key is needed. For local dev (Vite),
  // set VITE_ANTHROPIC_API_KEY in .env — never commit it. Browser-side keys
  // are for local prototyping only; use a server proxy in production.
  const apiKey = typeof import.meta !== "undefined" ? import.meta.env?.VITE_ANTHROPIC_API_KEY : undefined;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function askMochi(prompt) {
  if (typeof window !== "undefined" && window.mochiDesktop?.askCodex) {
    return window.mochiDesktop.askCodex(prompt);
  }
  return askClaude(prompt);
}

const RULES = `You are Mochi, a sharp little brainstorming puppy. Be concise and concrete. No emoji inside JSON values. Respond ONLY with valid JSON — no markdown fences, no preamble.`;

const prompts = {
  spark: (q) => `${RULES}
User's rough thought: "${q}"
Give 3 distinct, useful directions (one practical, one delightful, one unexpected).
JSON: {"cards":[{"title":"...","line":"..."},{"title":"...","line":"..."},{"title":"...","line":"..."}]}
Rules: title ≤ 5 words. line = one specific sentence ≤ 18 words.`,
  cuter: (q) => `${RULES}
User's rough thought: "${q}"
Give 3 versions that make it as cute, warm, and charming as possible — still viable.
JSON: {"cards":[{"title":"...","line":"..."},{"title":"...","line":"..."},{"title":"...","line":"..."}]}
Rules: title ≤ 5 words. line ≤ 18 words.`,
  weirder: (q) => `${RULES}
User's rough thought: "${q}"
Give 3 genuinely weird, high-novelty versions that still (barely) make sense.
JSON: {"cards":[{"title":"...","line":"..."},{"title":"...","line":"..."},{"title":"...","line":"..."}]}
Rules: title ≤ 5 words. line ≤ 18 words.`,
  plan: (q) => `${RULES}
User's rough thought: "${q}"
Turn it into a 3-phase starter plan: Now, Next, Later.
JSON: {"cards":[{"title":"Now","line":"..."},{"title":"Next","line":"..."},{"title":"Later","line":"..."}]}
Rules: each line = one actionable sentence ≤ 16 words.`,
  remix: (q, card) => `${RULES}
Topic: "${q}"
Current card — title: "${card.title}", line: "${card.line}"
Give ONE different take: same topic, clearly new angle, similar spirit.
JSON: {"title":"...","line":"..."}
Rules: title ≤ 5 words. line ≤ 18 words.`,
  expand: (q, card) => `${RULES}
Topic: "${q}"
Card — title: "${card.title}", line: "${card.line}"
Expand it with concrete detail.
JSON: {"details":["...","...","..."]}
Rules: exactly 3 bullets, each ≤ 12 words, specific and actionable.`,
};

let uid = 0;

/* ── Puppy (original SVG character) ─────────── */
function Puppy({ size = 68, blink, mood, hover }) {
  // mood: idle | think | happy | sad
  const happy = mood === "happy";
  const think = mood === "think";
  const sad = mood === "sad";
  const eyeY = think ? 30.5 : 33;
  return (
    <svg
      viewBox="0 0 84 70"
      width={size}
      height={(size * 70) / 84}
      className={`pup ${think ? "pup-think" : ""} ${happy ? "pup-happy" : ""} ${hover ? "pup-hover" : ""}`}
      aria-hidden="true"
    >
      {/* tail — curly, wags from base */}
      <g className={`tail ${happy || hover ? "wag-fast" : "wag"}`}>
        <path d="M 66 40 Q 78 36 76 27 Q 75 22 70 24" fill="none" stroke="#E8E2D8" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M 66 40 Q 78 36 76 27 Q 75 22 70 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* floppy ears (hang down the sides — puppy, not bunny) */}
      <path className={`ear ear-l ${sad ? "ear-droop" : ""}`} d="M 20 18 Q 10 20 9 34 Q 8.5 43 15 44 Q 21 44.5 23 36 Q 25 27 26 20 Z" fill="#FFFFFF" stroke="#E4DED4" strokeWidth="2" strokeLinejoin="round" />
      <path className={`ear ear-r ${sad ? "ear-droop" : ""}`} d="M 64 18 Q 74 20 75 34 Q 75.5 43 69 44 Q 63 44.5 61 36 Q 59 27 58 20 Z" fill="#FFFFFF" stroke="#E4DED4" strokeWidth="2" strokeLinejoin="round" />
      <path d="M 14 30 Q 13 38 17 40" stroke="#F3DBD2" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
      <path d="M 70 30 Q 71 38 67 40" stroke="#F3DBD2" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />

      {/* round body/head — one soft blob */}
      <ellipse cx="42" cy="36" rx="25" ry="23" fill="#FFFFFF" stroke="#E4DED4" strokeWidth="2" />

      {/* collar */}
      <path d="M 22 51 Q 42 59 62 51 L 61 55 Q 42 63 23 55 Z" fill="#E8635A" />
      <circle cx="42" cy="58.5" r="2.6" fill="#F6C453" stroke="#D9A83E" strokeWidth="1" />

      {/* paws */}
      <ellipse className="paw paw-l" cx="33" cy="62" rx="6" ry="4" fill="#FFFFFF" stroke="#E4DED4" strokeWidth="1.8" />
      <ellipse className="paw paw-r" cx="51" cy="62" rx="6" ry="4" fill="#FFFFFF" stroke="#E4DED4" strokeWidth="1.8" />
      <path d="M 31 60.5 L 31 63.5 M 35 60.5 L 35 63.5" stroke="#EDE6DC" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 49 60.5 L 49 63.5 M 53 60.5 L 53 63.5" stroke="#EDE6DC" strokeWidth="1.2" strokeLinecap="round" />

      {/* face */}
      {happy ? (
        <>
          <path d="M 30 33 Q 33 29.5 36 33" stroke="#33302E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 48 33 Q 51 29.5 54 33" stroke="#33302E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="33" cy={eyeY} rx="2.5" ry={blink ? 0.4 : 2.5} fill="#33302E" style={{ transition: "ry .08s" }} />
          <ellipse cx="51" cy={eyeY} rx="2.5" ry={blink ? 0.4 : 2.5} fill="#33302E" style={{ transition: "ry .08s" }} />
          {!blink && <circle cx="33.9" cy={eyeY - 0.8} r="0.7" fill="#FFF" />}
          {!blink && <circle cx="51.9" cy={eyeY - 0.8} r="0.7" fill="#FFF" />}
        </>
      )}
      {/* nose + mouth */}
      <ellipse cx="42" cy="39.5" rx="3" ry="2.3" fill="#33302E" />
      {sad ? (
        <path d="M 38.5 46 Q 42 43.8 45.5 46" stroke="#33302E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 42 41.8 L 42 44 M 42 44 Q 39.5 46.5 37.5 44.6 M 42 44 Q 44.5 46.5 46.5 44.6" stroke="#33302E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
      {/* tongue when happy */}
      {happy && <path d="M 40 46 Q 42 49.5 44 46 Q 43 45 41 45 Z" fill="#F49B94" />}
      {/* blush */}
      <ellipse cx="27" cy="41" rx="3.2" ry="1.8" fill="#F7C9BC" opacity={hover || happy ? 0.9 : 0.5} style={{ transition: "opacity .2s" }} />
      <ellipse cx="57" cy="41" rx="3.2" ry="1.8" fill="#F7C9BC" opacity={hover || happy ? 0.9 : 0.5} style={{ transition: "opacity .2s" }} />
      {/* head-top fluff */}
      <path d="M 38 14 Q 40 10.5 42 14 Q 44 10.5 46 14" stroke="#E4DED4" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ── Idea card ───────────────────────────────── */
function Card({ card, topic, index, onUpdate, onSave, saved }) {
  const [busy, setBusy] = useState(null); // 'remix' | 'expand' | null
  const [err, setErr] = useState(false);

  const remix = async () => {
    if (busy) return;
    setBusy("remix");
    setErr(false);
    try {
      const next = await askMochi(prompts.remix(topic, card));
      onUpdate(card.id, { ...card, title: next.title, line: next.line, details: null, open: false });
    } catch { setErr(true); }
    setBusy(null);
  };

  const expand = async () => {
    if (busy) return;
    if (card.details) { onUpdate(card.id, { ...card, open: !card.open }); return; }
    setBusy("expand");
    setErr(false);
    try {
      const next = await askMochi(prompts.expand(topic, card));
      onUpdate(card.id, { ...card, details: next.details, open: true });
    } catch { setErr(true); }
    setBusy(null);
  };

  return (
    <div className="card" style={{ animationDelay: `${index * 85}ms` }}>
      <div className={`card-inner ${busy ? "busy" : ""}`}>
        <div className="card-title">{card.title}</div>
        <div className="card-line">{card.line}</div>
        <div className={`details ${card.open ? "open" : ""}`}>
          <ul className="detail-list">
            {(card.details || []).map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      </div>
      <div className="card-actions">
        <button className="ghost" disabled={!!busy} onClick={remix}>↻ Remix</button>
        <button className={`ghost ${saved ? "saved-on" : ""}`} onClick={() => onSave(card)}>{saved ? "♥ Saved" : "♡ Save"}</button>
        <button className="ghost" disabled={!!busy} onClick={expand}>
          {card.details ? (card.open ? "− Collapse" : "＋ Expand") : "＋ Expand"}
        </button>
        {busy && <span className="micro busy-note">{busy === "remix" ? "remixing…" : "fetching…"}</span>}
        {err && <span className="micro err-note">try again</span>}
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────── */
export default function IdeaPup() {
  const PET_W = 92, PET_H = 82;
  const desktopPet = typeof window !== "undefined" && (
    window.location.search.includes("desktop=1") || Boolean(window.mochiDesktop)
  );
  const [pos, setPos] = useState({ x: null, y: null });
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [blink, setBlink] = useState(false);
  const [mood, setMood] = useState("idle");
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [view, setView] = useState("ask"); // ask | saved
  const [phase, setPhase] = useState("input"); // input | thinking | results
  const [thinkLine, setThinkLine] = useState(THINK_LINES[0]);
  const [error, setError] = useState(false);
  const [badge, setBadge] = useState(false);
  const dragRef = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    if (desktopPet) {
      setPos({ x: 14, y: 18 });
      return;
    }
    setPos({ x: window.innerWidth - PET_W - 26, y: window.innerHeight - PET_H - 26 });
  }, [desktopPet]);

  useEffect(() => {
    if (!desktopPet) return;
    window.mochiDesktop?.setExpanded(open);
  }, [desktopPet, open]);

  /* blink loop */
  useEffect(() => {
    let t;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2300 + Math.random() * 2800);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  /* thinking copy rotation */
  useEffect(() => {
    if (phase !== "thinking") return;
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % THINK_LINES.length; setThinkLine(THINK_LINES[i]); }, 1300);
    return () => clearInterval(t);
  }, [phase]);

  /* drag */
  const startDrag = async (e) => {
    e.preventDefault();
    if (desktopPet && window.mochiDesktop) {
      const bounds = await window.mochiDesktop.getWindowBounds();
      dragRef.current = {
        desktop: true,
        dx: e.screenX - bounds.x,
        dy: e.screenY - bounds.y,
        sx: e.screenX,
        sy: e.screenY,
        moved: false,
      };
      const move = (ev) => {
        const d = dragRef.current;
        if (!d) return;
        if (!d.moved && Math.hypot(ev.screenX - d.sx, ev.screenY - d.sy) > 5) d.moved = true;
        if (d.moved) window.mochiDesktop.moveWindow(ev.screenX - d.dx, ev.screenY - d.dy);
      };
      const up = () => {
        const wasDrag = dragRef.current?.moved;
        dragRef.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (!wasDrag && !open) { setOpen(true); setBadge(false); }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      return;
    }

    dragRef.current = { dx: e.clientX - posRef.current.x, dy: e.clientY - posRef.current.y, sx: e.clientX, sy: e.clientY, moved: false };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 5) d.moved = true;
      if (d.moved) {
        setPos({
          x: Math.min(Math.max(8, ev.clientX - d.dx), window.innerWidth - PET_W - 8),
          y: Math.min(Math.max(8, ev.clientY - d.dy), window.innerHeight - PET_H - 8),
        });
      }
    };
    const up = () => {
      const wasDrag = dragRef.current?.moved;
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!wasDrag && !open) { setOpen(true); setBadge(false); }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const run = async (kind) => {
    const q = input.trim();
    if (!q || phase === "thinking") return;
    setTopic(q);
    setPhase("thinking");
    setMood("think");
    setError(false);
    setView("ask");
    const wait = new Promise((r) => setTimeout(r, 1100));
    try {
      const [res] = await Promise.all([askMochi(prompts[kind](q)), wait]);
      setCards((res.cards || []).slice(0, 3).map((c) => ({ ...c, id: ++uid, details: null, open: false })));
      setPhase("results");
      setMood("happy");
      setBadge(true);
      setTimeout(() => setMood("idle"), 1700);
    } catch {
      await wait;
      setError(true);
      setPhase("input");
      setMood("sad");
      setTimeout(() => setMood("idle"), 2000);
    }
  };

  const updateCard = (id, next) => setCards((cs) => cs.map((c) => (c.id === id ? next : c)));
  const toggleSave = (card) => {
    setSavedCards((s) => {
      const exists = s.some((c) => c.id === card.id);
      if (exists) return s.filter((c) => c.id !== card.id);
      setMood("happy");
      setTimeout(() => setMood("idle"), 1200);
      return [...s, { ...card }];
    });
  };
  const isSaved = (id) => savedCards.some((c) => c.id === id);

  if (pos.x === null) return <div className={`deck ${desktopPet ? "desktop-mode" : ""}`}><style>{css}</style></div>;

  const onRight = pos.x > window.innerWidth / 2;
  const onBottom = pos.y > window.innerHeight / 2;
  const panelStyle = desktopPet ? {
    position: "fixed",
    width: 336,
    left: 14,
    top: PET_H + 28,
    transformOrigin: "left top",
  } : {
    position: "fixed",
    width: 336,
    ...(onRight ? { right: window.innerWidth - pos.x - PET_W } : { left: pos.x }),
    ...(onBottom ? { bottom: window.innerHeight - pos.y - 4 } : { top: pos.y + PET_H + 4 }),
    transformOrigin: `${onRight ? "right" : "left"} ${onBottom ? "bottom" : "top"}`,
  };

  return (
    <div className={`deck ${desktopPet ? "desktop-mode" : ""}`}>
      <style>{css}</style>
      <div className="deck-hint"><b>Mochi</b> naps in the corner — drag him anywhere, click to brainstorm.</div>

      {/* collapsed puppy */}
      {!open && (
        <div
          className="pup-dock"
          style={{ left: pos.x, top: pos.y, width: PET_W, height: PET_H }}
          onPointerDown={startDrag}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          role="button"
          aria-label="Open Mochi, the idea pup"
        >
          <div className="pup-breathe">
            <Puppy size={PET_W - 14} blink={blink} mood={mood} hover={hover} />
          </div>
          {badge && <span className="dock-badge" />}
          <div className={`ask-chip ${hover ? "show" : ""}`}>Woof? ✦</div>
        </div>
      )}

      {/* panel */}
      {open && (
        <div className="panel" style={panelStyle}>
          <div className="panel-head" onPointerDown={startDrag}>
            <div className="head-pup">
              <Puppy size={38} blink={blink} mood={phase === "thinking" ? "think" : mood} hover={false} />
              {phase === "thinking" && <span className="tdots"><i /><i /><i /></span>}
            </div>
            <div className="head-text">
              <div className="head-name">Mochi <span className="head-role">idea pup</span></div>
              <div className="head-status">
                {phase === "thinking" ? thinkLine : view === "saved" ? "your saved bones" : phase === "results" ? "found these for you!" : "what are you thinking about?"}
              </div>
            </div>
            <button className={`icon-btn ${view === "saved" ? "on" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setView(view === "saved" ? "ask" : "saved")} aria-label="Saved ideas">
              🦴{savedCards.length > 0 && <span className="count">{savedCards.length}</span>}
            </button>
            <button className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(false)} aria-label="Minimize">—</button>
            {desktopPet && (
              <button className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => window.mochiDesktop?.quit()} aria-label="Quit">×</button>
            )}
          </div>

          {view === "ask" ? (
            <div className="panel-body">
              <textarea
                className="ask-input"
                rows={2}
                value={input}
                placeholder="What are you thinking about?"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run("spark"); } }}
                disabled={phase === "thinking"}
              />
              <div className="action-grid">
                <button className="act primary" disabled={!input.trim() || phase === "thinking"} onClick={() => run("spark")}>✦ Spark Ideas</button>
                <button className="act" disabled={!input.trim() || phase === "thinking"} onClick={() => run("cuter")}>✿ Make It Cuter</button>
                <button className="act" disabled={!input.trim() || phase === "thinking"} onClick={() => run("weirder")}>◍ Make It Weirder</button>
                <button className="act" disabled={!input.trim() || phase === "thinking"} onClick={() => run("plan")}>→ Turn Into Plan</button>
              </div>

              {error && <div className="panel-error">Mochi lost the scent — try once more.</div>}

              {phase === "thinking" && (
                <div className="thinking-zone">
                  <div className="tbubbles"><span /><span /><span /></div>
                </div>
              )}

              {phase === "results" && cards.length > 0 && (
                <div className="cards">
                  <div className="spark-pop">✦</div>
                  {cards.map((c, i) => (
                    <Card key={c.id} card={c} topic={topic} index={i} onUpdate={updateCard} onSave={toggleSave} saved={isSaved(c.id)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="panel-body">
              {savedCards.length === 0 ? (
                <div className="empty-saved">No bones buried yet — save an idea and it'll wait here.</div>
              ) : (
                <div className="cards">
                  {savedCards.map((c, i) => (
                    <div className="card saved-card" key={c.id} style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="card-title">{c.title}</div>
                      <div className="card-line">{c.line}</div>
                      <div className="card-actions">
                        <button className="ghost" onClick={() => setSavedCards((s) => s.filter((x) => x.id !== c.id))}>✕ Remove</button>
                      </div>
                    </div>
                  ))}
                  <div className="saved-note">saved for this session</div>
                </div>
              )}
            </div>
          )}

          <div className="panel-foot">
            <span className="foot-dot" /> soon · reminders · notes · writing help · daily inspiration
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ──────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap');

html, body, #root {
  margin: 0;
  min-height: 100%;
  background: transparent;
}

body { overflow: hidden; }

.deck {
  --ink: #33302E;
  --soft: #8B857C;
  --line: #EBE6DE;
  --accent: #E8635A;
  --accent-soft: #FCEEEC;
  --cream: #FAF8F4;
  min-height: 100vh;
  font-family: 'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', ui-rounded, system-ui, sans-serif;
  color: var(--ink);
  background:
    radial-gradient(800px 440px at 88% 4%, #FBF3EC 0%, transparent 55%),
    radial-gradient(700px 400px at 4% 96%, #F2F5EF 0%, transparent 50%),
    var(--cream);
  position: relative; overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
.deck * { box-sizing: border-box; }
.deck button { font-family: inherit; cursor: pointer; }
.deck button:disabled { cursor: default; }

.deck.desktop-mode {
  background: transparent;
  min-height: 100vh;
  overflow: visible;
}

.deck.desktop-mode .deck-hint { display: none; }

.deck-hint {
  position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
  font-size: 12px; color: var(--soft); font-weight: 500;
  background: rgba(255,255,255,.75); border: 1px solid var(--line);
  padding: 6px 14px; border-radius: 999px; backdrop-filter: blur(6px);
}
.deck-hint b { color: var(--ink); font-weight: 800; }

/* ── collapsed puppy ── */
.pup-dock {
  position: fixed; display: flex; align-items: flex-end; justify-content: center;
  touch-action: none; user-select: none; cursor: grab; z-index: 40;
}
.pup-dock:active { cursor: grabbing; }
.pup-breathe { animation: breathe 3.4s ease-in-out infinite; transform-origin: 50% 95%; }
@keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03, .975); } }

.pup { filter: drop-shadow(0 4px 9px rgba(120,100,80,.2)); transition: transform .22s cubic-bezier(.34,1.5,.5,1); overflow: visible; }
.pup.pup-hover { transform: rotate(-5deg) scale(1.06); }        /* head tilt */
.pup.pup-think { animation: squash .6s ease-in-out infinite; transform-origin: 50% 95%; }
@keyframes squash { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.09,.88); } }
.pup.pup-happy { animation: hop .48s cubic-bezier(.34,1.6,.5,1) 2; transform-origin: 50% 95%; }
@keyframes hop { 0%,100% { transform: translateY(0) scale(1); } 40% { transform: translateY(-8px) scale(.95,1.07); } 72% { transform: translateY(0) scale(1.07,.9); } }

.tail { transform-origin: 66px 40px; }
.tail.wag { animation: wag 1.6s ease-in-out infinite; }
.tail.wag-fast { animation: wag .38s ease-in-out infinite; }
@keyframes wag { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(14deg); } }

.ear { transform-origin: 50% 0%; animation: earTwitch 6s ease-in-out infinite; }
.ear-r { animation-delay: 3.2s; }
@keyframes earTwitch { 0%,92%,100% { transform: rotate(0); } 94% { transform: rotate(-5deg); } 97% { transform: rotate(3deg); } }
.ear-droop { transform: rotate(6deg) translateY(2px); animation: none; }
.pup-hover .ear-l { animation: earFlap .5s ease-in-out; }
.pup-hover .ear-r { animation: earFlap .5s ease-in-out .07s; }
@keyframes earFlap { 0%,100% { transform: rotate(0); } 45% { transform: rotate(-10deg); } }

.paw { transform-origin: 50% 100%; }
.pup-hover .paw-l { animation: pawTap .55s ease-in-out infinite; }
@keyframes pawTap { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }

.dock-badge {
  position: absolute; top: 6px; right: 10px; width: 9px; height: 9px;
  border-radius: 50%; background: var(--accent); border: 2px solid #FFF;
  animation: pop .3s cubic-bezier(.34,1.6,.5,1);
}
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }

.ask-chip {
  position: absolute; bottom: -10px; left: 50%; transform: translate(-50%, 5px);
  background: var(--ink); color: #FFF; font-size: 11px; font-weight: 700;
  padding: 4px 11px; border-radius: 999px; opacity: 0; pointer-events: none;
  transition: opacity .18s, transform .18s;
  box-shadow: 0 3px 8px rgba(51,48,46,.28);
}
.ask-chip.show { opacity: 1; transform: translate(-50%, 0); }

/* ── panel ── */
.panel {
  z-index: 50; background: #FFFFFF;
  border: 1px solid var(--line); border-radius: 16px;
  box-shadow: 0 2px 6px rgba(90,75,55,.06), 0 14px 32px rgba(90,75,55,.15);
  animation: panelIn .28s cubic-bezier(.3,1.3,.5,1); overflow: hidden;
}
@keyframes panelIn { from { opacity: 0; transform: scale(.86) translateY(6px); } to { opacity: 1; transform: none; } }

.panel-head {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 10px 8px; border-bottom: 1px solid var(--line);
  cursor: grab; user-select: none; touch-action: none;
  background: linear-gradient(180deg, #FDFCFA, #FFFFFF);
}
.panel-head:active { cursor: grabbing; }
.head-pup { position: relative; display: flex; }
.tdots { position: absolute; top: -8px; right: -11px; display: flex; gap: 2px; }
.tdots i { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); animation: rise 1.1s ease-in-out infinite; }
.tdots i:nth-child(2) { animation-delay: .18s; width: 5px; height: 5px; }
.tdots i:nth-child(3) { animation-delay: .36s; width: 6px; height: 6px; }
@keyframes rise { 0%,100% { transform: translateY(0); opacity: .4; } 50% { transform: translateY(-4px); opacity: 1; } }

.head-text { flex: 1; min-width: 0; }
.head-name { font-size: 13px; font-weight: 800; }
.head-role { font-size: 10px; font-weight: 700; color: var(--accent); background: var(--accent-soft); border-radius: 5px; padding: 1px 6px; margin-left: 4px; vertical-align: 1px; }
.head-status { font-size: 11px; color: var(--soft); font-weight: 500; }

.icon-btn {
  position: relative; min-width: 26px; height: 26px; border-radius: 8px;
  border: 1px solid var(--line); background: #FFF; color: var(--soft);
  font-size: 12px; line-height: 1; padding: 0 5px;
  transition: background .15s, color .15s;
}
.icon-btn:hover { background: var(--accent-soft); color: var(--ink); }
.icon-btn.on { background: var(--accent-soft); border-color: #F2C7C2; }
.count {
  position: absolute; top: -5px; right: -5px; min-width: 14px; height: 14px;
  background: var(--accent); color: #FFF; font-size: 9px; font-weight: 800;
  border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; padding: 0 3px;
}

.panel-body { padding: 11px; max-height: 62vh; overflow-y: auto; }

.ask-input {
  width: 100%; resize: none;
  border: 1px solid var(--line); border-radius: 10px;
  padding: 8px 11px; font: 500 13px/1.55 'M PLUS Rounded 1c', sans-serif; color: var(--ink);
  outline: none; background: #FDFCFA;
  transition: border-color .15s, box-shadow .15s;
}
.ask-input::placeholder { color: #BFB8AC; }
.ask-input:focus { border-color: #EFB3AC; box-shadow: 0 0 0 3px var(--accent-soft); background: #FFF; }

.action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.act {
  padding: 7px 6px; border-radius: 9px;
  border: 1px solid var(--line); background: #FFF;
  font-size: 12px; font-weight: 700; color: var(--ink);
  transition: transform .12s, border-color .15s, background .15s, box-shadow .12s;
  white-space: nowrap;
}
.act:not(:disabled):hover { border-color: #EFB3AC; background: var(--accent-soft); transform: translateY(-1px); box-shadow: 0 2px 5px rgba(200,90,80,.12); }
.act:not(:disabled):active { transform: scale(.96); }
.act:disabled { opacity: .45; }
.act.primary { background: var(--accent); border-color: var(--accent); color: #FFF; }
.act.primary:not(:disabled):hover { background: #DD554C; border-color: #DD554C; }

.panel-error {
  margin-top: 10px; font-size: 12px; font-weight: 700; color: #BF4A41;
  background: #FDF0EE; border: 1px solid #F4D3CF; border-radius: 9px; padding: 7px 10px;
}

.thinking-zone { padding: 20px 0 10px; display: flex; justify-content: center; }
.tbubbles { display: flex; gap: 6px; }
.tbubbles span { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #F6C453); animation: rise 1s ease-in-out infinite; }
.tbubbles span:nth-child(2) { animation-delay: .16s; }
.tbubbles span:nth-child(3) { animation-delay: .32s; }

/* ── cards ── */
.cards { margin-top: 11px; position: relative; display: flex; flex-direction: column; gap: 8px; }
.spark-pop { position: absolute; top: -8px; right: 4px; color: var(--accent); font-size: 14px; animation: sparkOnce .9s ease-out forwards; pointer-events: none; }
@keyframes sparkOnce { 0% { opacity: 0; transform: scale(.3) rotate(-30deg); } 35% { opacity: 1; transform: scale(1.3); } 100% { opacity: 0; transform: scale(.7) translateY(-8px); } }

.card {
  border: 1px solid var(--line); border-radius: 12px; background: #FDFCFA;
  padding: 10px 11px 7px;
  animation: cardIn .38s cubic-bezier(.3,1.35,.5,1) backwards;
  transition: border-color .15s, box-shadow .15s;
}
.card:hover { border-color: #EDD9D0; box-shadow: 0 3px 10px rgba(140,100,70,.09); }
@keyframes cardIn { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }

.card-inner { transition: filter .3s, opacity .3s, transform .3s; }
.card-inner.busy { filter: blur(3px); opacity: .4; transform: scale(.985); }
.card-title { font-size: 13.5px; font-weight: 800; line-height: 1.35; }
.card-line { font-size: 12.5px; color: #6B6459; line-height: 1.55; margin-top: 2px; font-weight: 500; }

.details { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .4s cubic-bezier(.3,1.2,.5,1); }
.details.open { grid-template-rows: 1fr; }
.details > .detail-list { overflow: hidden; margin: 0; }
.detail-list { padding: 6px 0 2px 16px; font-size: 12px; color: #6B6459; font-weight: 500; line-height: 1.75; }
.detail-list li::marker { color: var(--accent); }

.card-actions { display: flex; align-items: center; gap: 3px; margin-top: 6px; }
.ghost {
  border: none; background: transparent; color: var(--soft);
  font-size: 11px; font-weight: 700; padding: 4px 7px; border-radius: 7px;
  transition: background .15s, color .15s, transform .1s;
}
.ghost:not(:disabled):hover { background: var(--accent-soft); color: var(--ink); }
.ghost:not(:disabled):active { transform: scale(.93); }
.ghost:disabled { opacity: .5; }
.ghost.saved-on { color: var(--accent); }
.micro { font-size: 10.5px; font-weight: 700; margin-left: auto; }
.busy-note { color: var(--accent); }
.err-note { color: #BF4A41; }

.empty-saved { padding: 22px 8px; text-align: center; font-size: 12.5px; color: var(--soft); font-weight: 500; }
.saved-note { text-align: center; font-size: 10.5px; color: #B7AFA3; font-weight: 600; margin-top: 2px; }
.saved-card { animation: cardIn .3s cubic-bezier(.3,1.35,.5,1) backwards; }

.panel-foot {
  padding: 6px 12px; border-top: 1px solid var(--line);
  font-size: 10.5px; font-weight: 600; color: #B7AFA3;
  display: flex; align-items: center; gap: 6px; background: #FDFCFA;
}
.foot-dot { width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #F6C453); }

@media (prefers-reduced-motion: reduce) {
  .deck *, .deck *::before, .deck *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .1s !important; }
}
`;
