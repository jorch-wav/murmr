# MURMR

A mindful smoking and spending tracker with a mesmerizing 3D boids murmuration.

🔗 **Live App:** [jorch-wav.github.io/murmr](https://jorch-wav.github.io/murmr)

## What is MURMR?

MURMR helps you track smoking sessions and related spending with a beautiful, calming interface. The centerpiece is a GPU-accelerated 3D starling murmuration that responds to your touch and reacts when you log sessions.

## Features

- 🐦 **3D Boids Murmuration** - 2048 birds simulated on GPU, responding to touch
- 📊 **Stats Dashboard** - View sessions by day, week, month, or year
- 💰 **Spending Tracking** - Log expenses with notes, see monthly totals
- ⏱️ **Streak Tracking** - Monitor your longest streak and time since last session
- 📱 **PWA Support** - Install on your phone, works offline
- 🌙 **Dark Mode** - Light/dark/auto themes with accent color options
- 📅 **Retroactive Logging** - Add past sessions and expenses
- 📜 **Collapsible History** - Day-grouped logs with expand/collapse

## Screenshots

| Home | Stats | Dark Mode |
|------|-------|-----------|
| Murmuration view with streak timer | Sessions, spending, charts | Full dark theme support |

## Tech Stack

- **Vanilla JavaScript** - No frameworks, pure JS
- **Three.js** - 3D rendering with WebGL
- **GPUComputationRenderer** - GPU-based boids simulation
- **CSS3** - Custom properties for theming
- **localStorage** - Client-side data persistence
- **Service Worker** - Offline PWA support

## How It Works

### The Murmuration
The birds follow classic boids rules (separation, alignment, cohesion) computed entirely on the GPU using fragment shaders. When you log a session, they scatter in a "death animation" before slowly reforming.

### Stats Periods
- **Day** - Hourly breakdown
- **Week** - Daily breakdown (weeks start Monday)
- **Month** - Daily breakdown
- **Year** - Monthly breakdown

Navigate between periods using the arrow buttons.

### Spending Toggle
Tap the spending card to toggle between:
- Period view (spent today/this week/etc.)
- Monthly view (spent this month)

## Installation

### As a PWA (Recommended)
1. Visit [jorch-wav.github.io/murmr](https://jorch-wav.github.io/murmr) on your phone
2. iOS: Tap Share → "Add to Home Screen"
3. Android: Tap menu → "Install app"

### Local Development
```bash
git clone https://github.com/jorch-wav/murmr.git
cd murmr
python3 -m http.server 8080
# Open http://localhost:8080
```

## Project Structure

```
murmr/
├── index.html          # Main HTML
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── app.js          # App initialization
│   ├── storage.js      # Data layer
│   ├── stats.js        # Stats dashboard
│   ├── boids.js        # GPU boids simulation
│   └── themes.js       # Theme management
└── icons/              # PWA icons
```

## Data Privacy

All data is stored locally in your browser's localStorage. Nothing is sent to any server. Your data stays on your device.

## License

MIT

---

Made with 🐦 by [jorch-wav](https://github.com/jorch-wav)
