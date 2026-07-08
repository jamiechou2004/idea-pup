# 🐶 Idea Pup — Mochi

A lovable white puppy desktop companion you can summon anytime to brainstorm.
Mochi naps in the corner of your screen — breathing, blinking, tail wagging —
and expands into a compact brainstorm panel when clicked.

An original character inspired by the *feeling* of classic round white cartoon
puppies: small, loyal, expressive. Floppy ears, dot eyes, curly tail, red collar.

## Features

- **Desktop-pet widget** — draggable anywhere, idle breathing / blinking / tail wag / ear twitches
- **Emotional reactions** — head tilt on hover, squash-and-stretch while thinking, happy hop on results, droopy ears on errors
- **Compact brainstorm panel** — *What are you thinking about?* with four actions:
  Spark Ideas · Make It Cuter · Make It Weirder · Turn Into Plan
- **Three short idea cards** per run, each with **Remix**, **Save** (🦴 tray), and **Expand**
- Powered by the Claude API (`claude-sonnet-4-6`) with strict JSON prompts for card-sized output

## Run locally

```bash
npm install
cp .env.example .env   # add your Anthropic API key
npm run dev
```

> ⚠️ The key is used browser-side via `anthropic-dangerous-direct-browser-access`,
> which is fine for local prototyping but **not for deployment** — anyone could read
> your key. For production, proxy requests through a small server instead.

## Run as a desktop pet

```bash
npm run desktop
```

This opens Mochi in a transparent, frameless, always-on-top desktop window.
Drag the puppy or panel header to move it. Click the puppy to open the
brainstorm panel, use `—` to collapse it, and `×` to quit.

For active development with hot reload:

```bash
npm run desktop:dev
```

## Build the Mac app

```bash
npm run package:mac
```

The app is created at `release/mac-arm64/Mochi Idea Pup.app` on Apple Silicon
Macs. It is unsigned, which is fine for local use.

## Deploy

This repository includes a GitHub Pages workflow. Push to `main`, then enable
GitHub Pages with **GitHub Actions** as the source in the repository settings.

The public Pages build should not include a real Anthropic API key. Use it as a
UI demo unless requests are routed through a backend proxy.

This component also runs as-is inside a [Claude.ai](https://claude.ai) artifact,
where no API key is needed.

## Roadmap

- [ ] Persistent saved ideas
- [ ] Reminders & notes
- [ ] Writing help
- [ ] Daily inspiration / mood-based suggestions

## Design notes

M PLUS Rounded 1c · warm cream + coral palette · hairline borders · 11–13px UI type.
The cuteness lives in the character's motion; the chrome stays quiet.

---

Made by [Jamie Zhou](https://jamiezihanzhou.com) · prototype built with Claude
