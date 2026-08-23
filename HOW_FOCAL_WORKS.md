# Focal — Complete Project Guide & Mathematical Architecture

> **One Question · One Answer**  
> Dump your tasks. Focal weighs them against your goals and deadlines, then points at the single thing worth doing right now.

---

## Table of Contents
1. [Core Philosophy & Problem Statement](#1-core-philosophy--problem-statement)
2. [How It Works in Practice](#2-how-it-works-in-practice)
3. [The Complete Mathematical Scoring Formula](#3-the-complete-mathematical-scoring-formula)
4. [Component-by-Component Weight Breakdown](#4-component-by-component-weight-breakdown)
5. [Decision Buckets & Thresholds](#5-decision-buckets--thresholds)
6. [Anti-Avoidance & Friction Resolution](#6-anti-avoidance--friction-resolution)
7. [AI Role vs. Deterministic Arithmetic](#7-ai-role-vs-deterministic-arithmetic)
8. [Architecture & Data Privacy](#8-architecture--data-privacy)

---

## 1. Core Philosophy & Problem Statement

### The Problem: Decision Paralysis
Most to-do apps act like bottomless lists. When a user has 15 mixed tasks—studying for IELTS, learning German, finishing workshop projects, and doing house chores—all items compete for visual attention. 

Looking at a crowded checklist causes cognitive overload. The user wastes willpower deciding *what* to do instead of actually doing the work.

### The Focal Solution
Focal replaces the 20-item checklist with **a single recommendation card**:
- You set your **North Star Goals** (e.g., *Primary: Score Band 8 in IELTS*, *Secondary: Learn German B1*).
- You add tasks freely without manually organizing them.
- Focal runs a mathematical ranking model and presents **one primary action** at a time.

---

## 2. How It Works in Practice

```
┌─────────────────┐      ┌─────────────────────────┐      ┌─────────────────────┐
│ 1. Set Goals    │  →   │ 2. Add Tasks            │  →   │ 3. One Answer       │
│ (IELTS, German) │      │ (Chores, study, work)   │      │ (Next Best Action)  │
└─────────────────┘      └─────────────────────────┘      └─────────────────────┘
```

1. **Set Goals**: The user defines their primary target and optional secondary goals with target dates.
2. **Add Tasks**: Natural language task entry (e.g. `"submit draft before 5 pm"`, `"practice listening test 2"`, `"fold laundry"`).
3. **Focus Card**: Focal computes real-time scores $(0 - 100)$ and displays the highest-scoring unblocked task.
4. **Time Budget**: When the user only has 15 minutes, toggling `15m` recalculates the ranking and surfaces high-value quick wins while hiding long 1-hour commitments.
5. **Completion Flow**: Clicking **Complete** triggers confetti, logs the win, and surfaces the next optimal task.

---

## 3. The Complete Mathematical Scoring Formula

Every task in Focal receives a deterministic priority score between $0$ and $100$:

$$\text{Priority Score} = \text{clamp}\Big(\text{Strategic Value (Layer A)} + \text{Execution Context (Layer B)} - \text{Temporary Postpone Penalty}, \; 0, \; 100\Big)$$

```text
┌──────────────────────────────────────────────────────────────┐
│  Layer A: STRATEGIC VALUE (Intrinsic, Max 55 pts):           │
│  • Goal Relevance & Primary Boost :  max 35 pts              │
│  • Estimated Impact               :  max 20 pts              │
│  • Goal Trajectory Pressure       :  max 12 pts (when lagging)
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

---

## 4. Component-by-Component Weight Breakdown

### 1. Goal Fit (Max 35 points)
Measures how directly the task moves the needle on the user's active goals:

$$\text{Goal Score} = \text{relevance} \times \text{boost} \times 35$$

- $\text{relevance} \in [0, 1]$: Degree of topical and contextual alignment.
- $\text{boost}$:
  - **$1.0$** if aligned with the user's **Primary Goal** (highest leverage).
  - **$0.85$** if aligned with a **Secondary Goal**.
  - **$0.0$** if unrelated to any defined goal (or when no goals exist).
- *Pure & Decoupled*: Never multiplied by decay or postponement counters.

---

### 2. Estimated Impact (Max 20 points)
Measures the payoff of completing this task relative to its effort:

$$\text{Impact Score} = \text{impact} \times 20$$

- $\text{impact} \in [0, 1]$: Estimated leverage (e.g. submitting an application has high impact $\approx 0.9$, while organizing desktop folders has low impact $\approx 0.2$).

---

### 3. Urgency & Deadline Proximity (Max 30 points)
Calculated using non-linear time proximity to the hard deadline:

$$\text{Time Remaining} = \text{deadline} - \text{current\_time}$$

| Time Remaining $(h)$ | Urgency Points | Status |
| :--- | :---: | :--- |
| **Overdue** ($t \le 0$) | **$+30$ pts** | Overdue alert triggered |
| **$< 2$ hours** | **$+27$ pts** | Imminent deadline |
| **$< 12$ hours** | **$+22$ pts** | Due today |
| **$< 24$ hours** | **$+18$ pts** | Due within 1 day |
| **$< 48$ hours** | **$+13$ pts** | Due within 2 days |
| **$< 7$ days** ($168\text{ h}$) | **$+8$ pts** | Due this week |
| **$\ge 7$ days** | **$+3$ pts** | Long-term target |
| **No Deadline** | **$\text{urgencyHint} \times 9$** | Keyword signal (e.g. "asap") |

---

### 4. Time Budget Window Fit (Max 15 points)
Adjusts dynamically when the user selects a time budget (`5m`, `15m`, `30m`, `60m`, `any`):

- **Budget = `any`**:
  - Grants a neutral $+10\text{ pts}$, `fitsWindow: true`.
- **Task Estimate $\le$ Selected Budget**:
  - If estimate fills $\ge 30\%$ of the budget: **$+15\text{ pts}$** (optimal time fill).
  - If estimate is smaller: **$+10\text{ pts}$**.
- **Task Estimate $>$ Selected Budget**:
  - Receives **$0\text{ pts}$** time bonus and **`fitsWindow: false`**.
  - Excluded from the current small window's candidate pool without applying destructive negative scores to the task's intrinsic strategic value.

---

### 5. Reduced Recency Bias & Unprocessed Boost (Max 5 points)
Newly added tasks receive a brief $+5\text{ pt}$ unprocessed grace period while awaiting AI classification. Once classified, the boost drops to $0$, ensuring older high-value tasks are never outranked by newer low-value chores purely because they are new.

---

### 6. Candidate Filtering & Blocked Tasks
Blocked tasks (`task.blocked === true`) are treated as **non-executable candidates**:
- Filtered out from `#1 Focus Card` selection.
- Preserved in task list and history with blocker notes.
- When all tasks in the queue are blocked, Focal displays an explicit **Unblock** prompt rather than surfacing a false, low-value "Do Now" task.

---

## 5. Decision Buckets & Thresholds

| Category | Score Range | Color Token | Meaning |
| :--- | :---: | :---: | :--- |
| **`DO NOW`** | **$65 - 100$** | Cobalt Blue | High goal relevance, high impact, or imminent deadline. |
| **`SOON`** | **$45 - 64$** | Sky Blue | Important tasks to tackle once the top priority is clear. |
| **`LATER`** | **$0 - 44$** | Faint Slate | Routine chores, backlog items, or unweighted notes. |
| **`DELEGATE`** | Manual / Triggered | Violet | Tasks better suited for another person or automated tool. |
| **`DROP`** | Manual / Triggered | Rose | Low-value distractions removed from the active queue. |

---

## 6. Anti-Avoidance & Friction Resolution

If a task is postponed $3+$ times, Focal surfaces an empathetic friction-resolution modal asking:
- **"What's stopping you?"**
  - *Option 1: The task is too big* $\rightarrow$ AI breaks the task into 3 bite-sized subtasks ($5\text{m}, 10\text{m}, 15\text{m}$).
  - *Option 2: It's blocked on someone* $\rightarrow$ Marks task as blocked with dependency notes.
  - *Option 3: Not actually important* $\rightarrow$ Offers to drop or delegate without guilt.

---

## 7. AI Role vs. Deterministic Arithmetic

Focal follows strict architectural separation:

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│  AI Language Model (Groq LLM)        │     │  Deterministic Math Engine           │
│  • Reads natural language & context  │  →  │  • Calculates exact numerical scores │
│  • Extracts deadlines from text      │     │  • Sorts & ranks the entire queue    │
│  • Estimates goal relevance (0..1)   │     │  • Applies hard deadline penalties   │
│  • Composes human explanations       │     │  • Governs the #1 Next Best Action   │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

- **No Hallucinated Rankings**: The AI never directly sets the score or chooses the order. It only provides semantic estimates.
- **Offline Heuristics**: If the AI key is absent or offline, Focal uses a fast, rule-based regex and keyword scoring engine that runs $100\%$ client-side with zero latency.

---

## 8. Architecture & Data Privacy

1. **Local-First & Private**:
   - All tasks, goals, settings, and scores are stored in browser `localStorage` (`focal.state.v1`).
   - No tracking, no user accounts, and no database storage.
2. **Secure Backend Proxy (`/api/groq`)**:
   - API keys are stored in server-side `.env` variables and never exposed to the client or browser network payload.
3. **PWA & Mobile Push Ready**:
   - Installable on iOS (`Add to Home Screen`) and Android.
   - Built-in Service Worker (`public/sw.js`) for notifications on priority shifts and overdue alerts.
