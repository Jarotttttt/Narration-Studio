# Narration Studio

A modern video narration studio powered by AI. Create, edit, and manage narration projects with ease — featuring YouTube transcript fetching and AI-powered content generation.

## Features

- **AI-Powered Narration** — Generate narration scripts using custom AI API integration
- **YouTube Transcript Import** — Fetch and clean transcripts directly from YouTube videos
- **Project Management** — Create, edit, and organize your narration projects
- **Rich Text Editor** — Full-featured editor built with React
- **Export Support** — Export your projects with JSZip integration
- **Local Storage** — Projects saved locally via IndexedDB (Dexie)
- **Modern UI** — Tailwind CSS v4 with dark/light-ready design system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, Inter font |
| Backend | Express, tsx |
| Storage | Dexie (IndexedDB) |
| AI | OpenAI-compatible API |
| Icons | Lucide React |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AI_API_KEY` | API key for AI content generation |
| `AI_BASE_URL` | Base URL for AI API endpoint |
| `YOUTUBE_TRANSCRIPT_API_URL` | YouTube transcript API endpoint |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Type-check with TypeScript |

## Project Structure

```
src/
├── components/     # Reusable components (VideoStudio)
├── pages/          # Route pages (Dashboard, NewProject, ProjectView, Settings)
├── lib/            # Utilities
├── db.ts           # IndexedDB schema & operations
├── types.ts        # TypeScript type definitions
├── App.tsx         # Root app with router & layout
└── main.tsx        # Entry point
```

---

© 2026 Jarot — All Rights Reserved.
