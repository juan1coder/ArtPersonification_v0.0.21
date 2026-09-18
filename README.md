# ArtPersona Studio (v0.0.21)

A specialized studio and local automation toolkit for crafting, testing, and managing structured AI art prompts, personas, and visual style tags across Google Gemini and local Ollama models.

---

## Features

- **Prompt Workshop**: Formulate rich prompts by pairing subject descriptions with modular personas and categorical style tags (lighting, optics/camera, textures, artistic movements).
- **Live Model Testing**: Test synthesized prompts directly against Google Gemini with adjustable temperature, top-P, and thinking configurations.
- **VRAM & Context Advisor**: Estimate GPU memory footprints (weights, KV cache, system headroom) for running Ollama LLMs locally across various quantizations.
- **Persona & Style Vault**: Organize and edit custom system prompts, structured JSON character cards, and reusable aesthetic presets.
- **Standalone Linux Script (`artpersona`)**: Includes a native Zenity-powered Bash script to run prompt selection and Ollama generation locally without launching the browser.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Motion
- **Backend / API**: Express, Node.js, `@google/genai` SDK
- **Local Scripting**: Bash, Zenity, Ollama
- **License**: GPL-3.0

---

## Quick Start

### 1. Web Application

#### Prerequisites
- Node.js (v18+ recommended)
- Google Gemini API key

#### Setup
```bash
# Clone the repository
git clone [https://github.com/juan1coder/ArtPersonification_v0.0.21.git](https://github.com/juan1coder/ArtPersonification_v0.0.21.git)
cd ArtPersonification_v0.0.21

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

Add your Gemini API key inside .env:

Code snippet
GEMINI_API_KEY=your_api_key_here
PORT=3000
Running
Bash
# Development server
npm run dev

# Production build and run
npm run build
npm start
```

# 2. Standalone Linux Script (artpersona)
Ensure you have ollama and zenity installed on your system, then run:

```Bash
chmod +x artpersona
./artpersona
```

License

This project is licensed under the GNU General Public License v3.0.
