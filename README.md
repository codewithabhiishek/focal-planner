<div align="center">

# 🎯 Focal Planner

**One question. One answer: *What should I do right now?***

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11.x-black?logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="./HOW_FOCAL_WORKS.md"><b>Deep Dive & Math Guide (MD)</b></a> •
  <a href="#-key-features">Features</a> •
  <a href="#-scoring-formula">Scoring Formula</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a>
</p>

</div>

---

## 💡 Overview

Most task managers are passive bucket lists that grow infinitely and cause decision paralysis. 

**Focal Planner** is an opinionated, intelligent single-task focus engine. You dump everything on your mind—Focal parses natural language deadlines, cross-references your overarching goals, factors in your available time budget, and continuously points at the **one single next action** that delivers maximum impact.

---

## ✨ Key Features

### 1. 🎯 2-Layer Deterministic Scoring Engine
- **Layer A: Strategic Value (Intrinsic, Max 55 pts)**:
  - **Goal Alignment (+35 pts)**: Semantic fit multiplied by primary ($1.0\times$) or secondary ($0.85\times$) boost.
  - **Estimated Impact (+20 pts)**: Payoff relative to effort.
  - **Goal Trajectory Pressure (+12 pts)**: Automatically detects when a long-term goal is lagging behind schedule (`expectedProgress > actualProgress`) and boosts related tasks.
- **Layer B: Execution Context (Dynamic, Max 45 pts)**:
  - **Deadline Urgency (+30 pts)**: Non-linear proximity to hard deadlines.
  - **Time Budget Window Fit (+15 pts)**: Dynamic fit for your active time block (`5m`, `15m`, `30m`, `60m`, `any`).
  - **Energy Context Fit (±5 pts)**: Optional match between user energy (`low`, `normal`, `high`) and task requirement.
  - **Unprocessed Capture Grace (+5 pts)**: Brief temporary boost only while newly captured tasks await classification.

### 2. 🔍 Single Source of Truth "Why this?" Explainability
- Expandable inspection panel on the Focus Card showing an itemized, point-by-point breakdown derived directly from the exact scoring calculation.
- Explains why the task is chosen (e.g., *Primary goal alignment +28*, *Goal behind schedule +10*, *Fits 30m window +12*).

### 3. 🧩 Concrete Next Actions & Non-Destructive Time Budgeting
- Differentiates `GOAL` → `PROJECT` → `TASK` → `NEXT ACTION`.
- When a large task ($60\text{m}$) does not fit the current focus window ($15\text{m}$), Focal derives an immediate, actionable $\le 15\text{m}$ next action so strategic value is never buried.

### 4. 🛡️ Candidate Filtering & Friction Resolution
- **Non-Executable Candidate Filtering**: Blocked and snoozed tasks are excluded from winning the Focus Card without corrupting their scores with magic numbers.
- **All-Blocked State**: Surfaces an unblock action banner when all top tasks are blocked, rather than showing a random low-priority task as "Do Now".
- **Friction Resolution**: If a task is postponed $3+$ times, Focal triggers empathetic resolution: *This is too big*, *I'm blocked*, *I don't have enough time*, *It isn't actually important*, or *Remind me later*.

### 5. 🧠 AI Confidence Blending & Offline Determinism
- **Built-in Heuristic Engine**: Runs 100% offline with zero network latency.
- **AI Confidence Blending**: Parses AI confidence ($0..1$); classifications with low confidence ($< 0.6$) safely blend with deterministic heuristic baselines.
- **Secure Groq LLM Proxy**: Connects via backend proxy (`/api/groq`) with `.env` API keys.

### 6. 🎨 Ivory & Indigo Design System
- Calibrated typography powered by **Plus Jakarta Sans** and **JetBrains Mono**.
- **Flawless Light & Dark Modes** with WCAG AA compliant semantic contrast tokens.
- **Ambient Constellation Background**: Subtle canvas heuristic network with soft center-masking so UI cards stay crystal clear.

---

## 📐 Scoring Formula

$$\text{Final Priority} = \text{clamp}\Big(\text{Strategic Value (Layer A)} + \text{Execution Context (Layer B)} - \text{Temporary Postpone Penalty}, \; 0, \; 100\Big)$$

```text
┌──────────────────────────────────────────────────────────────┐
│  Layer A: STRATEGIC VALUE (Intrinsic, Max 55 pts):           │
│  • Goal Relevance & Primary Boost :  max 35 pts              │
│  • Estimated Impact               :  max 20 pts              │
│  • Goal Trajectory Pressure       :  max 12 pts (when lagging)│
│                                                              │
│  Layer B: EXECUTION CONTEXT (Dynamic, Max 45 pts):           │
│  • Urgency & Deadline Proximity   :  max 30 pts              │
│  • Time Budget Window Fit         :  max 15 pts              │
│  • Energy / Context Fit           :  ±5 pts (neutral: 0)     │
│  • Unprocessed Raw Capture Grace  :  max  5 pts (temp only)  │
│                                                              │
│  Friction / Postpone:                                        │
│  • Postpone Penalty               : −7 pts per skip (max −21)│
│                                                              │
│  Candidate Filtering (Non-Executable Exclusion):             │
│  • Blocked tasks: Filtered out from #1 Focus candidate pool  │
└──────────────────────────────────────────────────────────────┘
```

For full mathematical proofs, weight breakdowns, and decision thresholds, see [**`HOW_FOCAL_WORKS.md`**](./HOW_FOCAL_WORKS.md).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) with `@tailwindcss/vite` |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with custom inline `@theme` tokens |
| **Animations** | [Framer Motion 11](https://www.framer.com/motion/) + HTML5 Canvas API |
| **Typography** | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| **AI Integration** | [Groq API](https://groq.com/) (OpenAI-compatible models) + Local Heuristics |
| **Date Utilities** | [date-fns](https://date-fns.org/) |
| **Storage** | Browser `localStorage` (Zero tracking, 100% private and client-side) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm, pnpm, or yarn

### Installation & Scripts

1. **Clone the repository:**
   ```bash
   git clone https://github.com/codewithabhiishek/focal-planner.git
   cd focal-planner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the local dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Run the automated unit test suite:**
   ```bash
   npm test
   ```

5. **Typecheck and Build:**
   ```bash
   npm run typecheck
   npm run build
   ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :---: | :--- |
| <kbd>/</kbd> | Focus the task composer bar |
| <kbd>c</kbd> | Complete the current #1 recommended task |
| <kbd>g</kbd> | Open Setup & Settings (goals, AI key, signals) |
| <kbd>Esc</kbd> | Close active modal / overlay |
| <kbd>Enter</kbd> | Add task from composer |

---

## 🔒 Privacy & Local-First

- **Zero Cloud Lock-in**: All goals, tasks, and settings persist strictly in your browser's `localStorage`.
- **No telemetry or analytics**: Your data never leaves your device unless you choose to provide your own Groq API key for AI task reading.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/codewithabhiishek">Abhishek</a></sub>
</div>
