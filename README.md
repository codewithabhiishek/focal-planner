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

### 1. 🎯 Dynamic Priority Engine & Next Best Action
- Real-time algorithmic ranking that deterministically calculates task priority scores (0–100).
- Transparent **"Why this score?"** breakdown inspecting exact points for goal alignment, urgency, impact, and time-budget fit.

### 2. ⚡ Natural Language Task Capture
- Instant heuristic deadline extractor (e.g., *"reply to recruiter before 5 pm"* auto-detects 5:00 PM today).
- Unified composer with quick-pick estimate durations and datetime picker.

### 3. 🧠 Hybrid AI & Deterministic Heuristics
- **Built-in Offline Heuristics**: Works 100% offline out-of-the-box with zero configuration.
- **Secure Backend Groq LLM Proxy**: Connects through a secure backend route (`/api/groq`). Store `GROQ_API_KEY` safely in `.env` so your secret key is never exposed on the frontend or in browser network bundles. Supports Llama 3.3 70B, Llama 3.1 8B, and more.

### 4. ⏱️ Adaptive Time-Budget Window
- Filter the recommendation live based on how much time you have right now (**5m**, **15m**, **30m**, **1h+**, or **any**).

### 5. 🛡️ Anti-Avoidance & AI Task Breakdown
- Automatically flags tasks that have been repeatedly postponed or neglected.
- Offers non-judgmental assistance to break overwhelming tasks into bite-sized, actionable subtasks.

### 6. 🎨 Ivory & Indigo Design System
- Calibrated typography powered by **Plus Jakarta Sans** and **JetBrains Mono**.
- **Flawless Light & Dark Modes** with WCAG AA compliant semantic contrast tokens.
- **Ambient Constellation Background**: Subtle canvas heuristic network with soft center-masking so UI cards stay crystal clear.

### 7. 🗃️ Unified Task Inbox
- Standardized, zero-shift structural grid across all states (**Do Now**, **Soon**, **Later**, **Delegate**, **Drop**, and **Blocked**).
- Smooth hover reveals without layout jumpiness.

---

## 📐 Scoring Formula

The core ranking math is 100% transparent and deterministic:

$$\text{Priority Score} = \text{Goal Fit} + \text{Impact} + \text{Urgency} + \text{Time Window Fit} - \text{Penalties}$$

| Component | Weight Range | Details |
| :--- | :---: | :--- |
| **Goal Fit** | `0 → +28` | Semantic relevance to your active and primary goals |
| **Impact** | `0 → +24` | Expected value and leverage of completing the task |
| **Urgency** | `0 → +34` | Proximity to deadline and overdue decay |
| **Time Fit** | `0 → +14` | Matches your selected time-budget window |
| **Penalties** | `−…` | Postponement fatigue, blocked states, and stale items |

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) with `@tailwindcss/vite` |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with custom inline `@theme` tokens |
| **Animations** | [Framer Motion 11](https://www.framer.com/motion/) + HTML5 Canvas API |
| **Typography** | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| **AI Integration** | [Groq API](https://groq.com/) (Llama 3.3 70B Versatile, Llama 3.1 8B Instant) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |
| **Storage** | Browser `localStorage` (Zero tracking, 100% private and client-side) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm, pnpm, or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/codewithabhiishek/focal-planner.git
   cd focal-planner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Typecheck:**
   ```bash
   npm run typecheck
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
