# Flashcard App

A lightweight, cross-platform desktop flashcard application built with Tauri and Rust. Designed for studying LeetCode problems using spaced repetition, with full support for code blocks, hierarchical folders, and activity tracking.

---

## Features

- **Spaced Repetition (SM-2)** — Cards are scheduled automatically based on how well you recall them. Intervals grow over time so you only review what you are about to forget.
- **Hierarchical Folders** — Organize cards into nested folders (e.g. `LeetCode > Arrays & Hashing`). Create, rename, and delete folders at any depth.
- **Card Editor** — Write cards with markdown-style code blocks using triple backticks. Live preview shows formatted output before saving.
- **Review Due** — SRS queue showing only cards due today. Keyboard shortcuts: `Space` to flip, `1-4` to rate.
- **Review All** — Read through every card in a folder freely without affecting the SRS schedule. Use arrow keys to navigate.
- **Card Browser** — View, search, edit, and delete cards within any folder.
- **Activity Heatmap** — GitHub-style calendar showing your review activity over the past year.
- **Streak Counter** — Tracks consecutive days reviewed. Updates automatically each session.
- **Due Count Badges** — Each folder shows `due / total` card counts so you know where to focus.
- **Resizable Sidebar** — Drag the sidebar edge to any width between 180px and 480px.
- **Local-first** — All data stored in a local SQLite database. No account, no internet connection required.

---

## Prerequisites

Before you can run or build this project you need the following installed.

**Rust**
```
https://rustup.rs
```
Run the installer and accept the defaults. Restart your terminal after installation.

**Node.js (LTS)**
```
https://nodejs.org
```

**Windows only — MSVC Build Tools**
```
https://visualstudio.microsoft.com/visual-cpp-build-tools/
```
Install the "Desktop development with C++" workload.

**Tauri CLI (optional)**

`@tauri-apps/cli` is already a dev dependency, so `npm install` covers it. Install
the global CLI only if you want to run `cargo tauri` commands directly:
```bash
cargo install tauri-cli --version "^2.0" --locked
```

---

## Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/flashcard-app.git
cd flashcard-app
```

**2. Install frontend dependencies**
```bash
npm install
```

**3. Run in development mode**
```bash
npm run tauri dev
```

This uses the `@tauri-apps/cli` version pinned in `devDependencies`, so the CLI
stays in step with the project. `cargo tauri dev` works too and uses whatever
version you installed globally.

The first run compiles SQLite from source via the `bundled` feature and downloads all Rust dependencies. This takes 5–10 minutes. Subsequent runs take under 10 seconds.

---

## Building for Production

```bash
npm run tauri build
```

Output is placed in `src-tauri/target/release/bundle/`. On Windows this produces an `.msi` installer and a standalone `.exe`.

---

## Project Structure

```
flashcard-app/
├── src/                        # React + TypeScript frontend
│   ├── components/
│   │   ├── CardBrowser.tsx     # View, search, edit, delete cards
│   │   ├── CardEditor.tsx      # Create cards with code block support
│   │   ├── CardReview.tsx      # SRS review session (due cards only)
│   │   ├── FolderSidebar.tsx   # Folder tree with badges
│   │   ├── Heatmap.tsx         # Activity calendar
│   │   ├── ReviewAll.tsx       # Read-through mode (no SRS effect)
│   │   ├── StreakCounter.tsx   # Consecutive days counter
│   │   └── components.css      # All component styles
│   ├── lib/
│   │   └── cardContent.ts      # Card text to HTML (escaping, code blocks)
│   ├── types.ts                # Shared types mirroring the Rust models
│   ├── App.tsx                 # Root layout and view routing
│   ├── App.css                 # Global layout styles
│   └── main.tsx                # React entry point
│
└── src-tauri/                  # Rust backend
    ├── src/
    │   ├── main.rs             # Binary entry point
    │   ├── lib.rs              # Tauri commands and app setup
    │   ├── db.rs               # All SQLite operations
    │   ├── models.rs           # Shared data structs (Serialize/Deserialize)
    │   └── srs.rs              # SM-2 spaced repetition algorithm
    ├── Cargo.toml              # Rust dependencies
    └── tauri.conf.json         # Tauri app configuration
```

---

## Database

The database is stored outside the project directory and is never committed to version control.

| Platform | Location |
|----------|----------|
| Windows  | `%APPDATA%\flashcard-app\flashcard.db` |
| Linux    | `~/.local/share/flashcard-app/flashcard.db` |

The schema consists of three tables: `folders` (self-referential for nesting), `cards` (stores SRS state per card), and `reviews` (full review history for heatmap and streak calculation).

---

## How Spaced Repetition Works

When you rate a card after reviewing it, the SM-2 algorithm calculates the next due date:

| Rating | Meaning | Effect |
|--------|---------|--------|
| **Again (1)** | Forgot completely | Resets interval to 1 day |
| **Hard (2)** | Recalled with difficulty | Short interval, ease decreases |
| **Good (3)** | Recalled correctly | Normal interval growth |
| **Easy (4)** | Instant recall | Long interval, ease increases |

Each card tracks its own `interval_days` and `ease_factor`. A card rated Good repeatedly will eventually have intervals of weeks, then months.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` or `Enter` | Flip card |
| `1` | Rate Again |
| `2` | Rate Hard |
| `3` | Rate Good |
| `4` | Rate Easy |
| `←` `→` `↑` `↓` | Navigate cards (Review All mode) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri v2 |
| Backend language | Rust |
| Database | SQLite via rusqlite (bundled) |
| Frontend framework | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| SRS algorithm | SM-2 |
| Date handling | chrono |
| Heatmap component | react-activity-calendar |

---

## Recommended Study Workflow

1. Attempt the problem on [neetcode.io](https://neetcode.io) before opening the app.
2. After solving, go to **Add Card**, select the relevant folder, and fill in the front (problem statement) and back (your solution and key insight) from memory.
3. Each day, open the app and clear the **Review Due** queue before adding new cards.
4. Use **Review All** before interviews to read through an entire topic without affecting your SRS schedule.
5. Keep new cards to 3–5 per day to avoid review debt compounding.