# IsoForge — InBioDyn LTS Asset Generator

Generate isometric weight reference images for the InBioDyn Lift Training System.

Uses **Claude Opus 4.5** to craft tailored prompts and **Google Imagen 4 Ultra** to render 2K isometric illustrations. Background removal runs client-side — no server processing needed.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your API keys when prompted.

## Required API Keys

| Service | Purpose | Get one at |
|---------|---------|-----------|
| **Anthropic** | Prompt generation (Claude Opus 4.5) | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **Google AI** | Image generation (Imagen 4 Ultra) | [aistudio.google.com](https://aistudio.google.com/apikey) |

Keys are stored only in your browser's session storage. They're sent directly to Anthropic/Google via server-side API routes and are never logged or persisted.

## Output Format

Images follow the InBioDyn LTS naming convention:

```
{weight_3digit}_{snake_case_description}.png
```

Examples: `025_bag_of_cat_litter.png`, `050_bag_of_concrete_mix.png`

Drop generated images directly into the LTS `images/summary_screen/` folder — the filename IS the database record.

## Deploy to Vercel

```bash
npm i -g vercel
vercel deploy
```

## Deploy with Docker

```bash
docker build -t isoforge .
docker run -p 3000:3000 isoforge
```

## How It Works

1. You pick a weight class (5–70 lbs) and describe an object
2. Claude Opus crafts an optimized isometric illustration prompt
3. Imagen 4 Ultra renders it at 2K resolution
4. Background is automatically removed client-side
5. Download the transparent PNG with the correct LTS filename

Batch mode: queue multiple items, they process in series. Regenerate any image with feedback to remix the prompt.

## Tech Stack

- **Next.js 15** (React 19 + TypeScript)
- **Tailwind CSS** for styling
- **Claude Opus 4.5** via Anthropic API
- **Imagen 4 Ultra** via Google GenAI API
- **@imgly/background-removal** for client-side bg removal
