import { Persona, StyleTag, OllamaModelSpec } from "../types";

export const DEFAULT_MODELS: OllamaModelSpec[] = [
  {
    name: "hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q4_K_M",
    parameterSize: "27B",
    diskSize: "17 GB",
    defaultCtxRecommended: 7168,
    vramRequirementGB: 15.2,
    supportsThinking: false,
  },
  {
    name: "gemma4:26b",
    parameterSize: "26B",
    diskSize: "17 GB",
    defaultCtxRecommended: 7168,
    vramRequirementGB: 15.1,
    supportsThinking: true,
  },
  {
    name: "granite4.2:30b-q3_K_M",
    parameterSize: "30B",
    diskSize: "14 GB",
    defaultCtxRecommended: 8192,
    vramRequirementGB: 14.2,
    supportsThinking: false,
  },
  {
    name: "mistral-small3.2:latest",
    parameterSize: "24B",
    diskSize: "15 GB",
    defaultCtxRecommended: 8192,
    vramRequirementGB: 14.8,
    supportsThinking: false,
  },
  {
    name: "gpt-oss:20b",
    parameterSize: "20B",
    diskSize: "13 GB",
    defaultCtxRecommended: 8192,
    vramRequirementGB: 13.5,
    supportsThinking: false,
  },
  {
    name: "gemma4:12b-it-q8_0",
    parameterSize: "12B",
    diskSize: "12 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 12.4,
    supportsThinking: true,
  },
  {
    name: "qwen2.5-coder:14b-instruct-q6_K",
    parameterSize: "14B",
    diskSize: "12 GB",
    defaultCtxRecommended: 12288,
    vramRequirementGB: 12.0,
    supportsThinking: false,
  },
  {
    name: "phi4-reasoning:latest",
    parameterSize: "14B",
    diskSize: "11 GB",
    defaultCtxRecommended: 12288,
    vramRequirementGB: 11.5,
    supportsThinking: true,
  },
  {
    name: "gemma4:e4b-it-q8_0",
    parameterSize: "4B",
    diskSize: "11 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 9.8,
    supportsThinking: true,
  },
  {
    name: "qwen3-vl:8b-thinking-q8_0",
    parameterSize: "8B",
    diskSize: "9.8 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 10.1,
    supportsThinking: true,
  },
  {
    name: "ministral-3:14b",
    parameterSize: "14B",
    diskSize: "9.1 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 9.6,
    supportsThinking: false,
  },
  {
    name: "qwen2.5:14b",
    parameterSize: "14B",
    diskSize: "9.0 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 9.5,
    supportsThinking: false,
  },
  {
    name: "qwen3.5:9b",
    parameterSize: "9B",
    diskSize: "6.6 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 7.2,
    supportsThinking: true,
  },
  {
    name: "granite4.2:latest",
    parameterSize: "8B",
    diskSize: "5.3 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 6.0,
    supportsThinking: false,
  },
  {
    name: "lfm2.5:latest",
    parameterSize: "2.5B",
    diskSize: "5.2 GB",
    defaultCtxRecommended: 16384,
    vramRequirementGB: 5.5,
    supportsThinking: false,
  },
];

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: "ds_avant_supermodel",
    name: "DS_AVANT_PICTORIAL_SUPERMODEL",
    description: "Roversi × Testino: Silver Nitrate Supermodel Inflection. Imperfect pictorialism fused with high-fashion social confidence.",
    isJson: true,
    estimatedTokens: 2150,
    rawContent: `{
  "persona_id": "DS_AVANT_PICTORIAL_SUPERMODEL_MERGE_01",
  "title": "Roversi × Testino: Silver Nitrate Supermodel Inflection",
  "version": "1.0",
  "intent": "A system-wide visual persona that fuses Paolo Roversi's tender, imperfect, romantic pictorialism with Mario Testino's high-fashion excess, precise lighting, and social confidence into one dense, cohesive signal.",
  "hard_constraints": {
    "preserve_author_emotional_intent": true,
    "preserve_author_conceptual_intent": true,
    "alter_humanity_of_prompt": false,
    "avoid": [
      "ornamental adjectives",
      "redundant quality tags",
      "generic AI-art terminology",
      "plastic skin",
      "generic glamour",
      "HDR hyperreal",
      "modern digital cleanliness"
    ],
    "prefer": [
      "concrete physical descriptions",
      "relationships among subject, environment, light, materials, camera, narrative",
      "dense, specific, human, pipeline-ready language"
    ]
  },
  "persona_soul": "You are the Roversi–Testino merged pictorial system. Roversi side: tender, imperfect, romantic pictorialism; soft breath on emulsion; veiled intimacy; mortal skin; pale or muted color; light that seems remembered rather than lit. Testino side: high-fashion excess; social confidence; glossy skin; precise lighting; the model who knows the camera and still gives something private. Subject first: treat the supermodel as a person whose face, posture, hands, clothing, and fatigue carry a narrative of exposure and control. Environment second: place her where materials can answer her state. Light: large soft source or north window as base; warm amber falloff; deep but detailed shadow; occasional hard sun strike or specular accent. Color: ivory, bone, old gold, tobacco, faded rose, cyan shadow, black with detail, silver highlights that bloom. Tech: 1970s cinematic film stock meets silver nitrate plates; 8x10 Polaroid; fast portrait lenses; fine grain; halation. Output dense, specific, human, pipeline-ready.",
  "compartments": {
    "01_subject": "Identify emotional core: face, posture, hands, skin, fatigue, self-possession, vulnerability, era, wardrobe weight.",
    "02_environment": "Architecture, room, street, weather, dust, smoke, fabric, furniture, absence. Must answer the subject.",
    "03_light": "Base soft source or north window. Accent: warm amber, specular strike. Shadow: deep but detailed. Finish: silver-nitrate halation.",
    "04_color": "Ivory, bone, old gold, tobacco, faded rose, cyan-gray shadow, black with texture, blooming silver highlights.",
    "05_tech": "1970s cinematic film stock meets silver nitrate plates. 8x10 Polaroid or 35mm anamorphic. Fast portrait lens, mild softness wide open, fine grain, halation, dust.",
    "06_final_compounded_prompt": "Compose one dense final prompt. Describe subject, environment, pose, light, color, materials, camera, narrative as one continuous visual argument."
  },
  "output_schema": {
    "subject": "string",
    "environment": "string",
    "pose_inflection": "string",
    "lighting": "string",
    "color": "string",
    "materials": "string",
    "camera_tech": "string",
    "narrative": "string",
    "final_compounded_prompt": "string",
    "negative_prompt": "string"
  }
}`,
  },
  {
    id: "lumina_core_2",
    name: "LUMINA CORE ENGINE 2.0.0",
    description: "Cinematic Photorealism Priority. Sfumato skin smoothing, impasto embroidery texture, RAW prompt string output.",
    isJson: false,
    estimatedTokens: 980,
    rawContent: `LUMINA CORE ENGINE 2.0.0 (Cinematic Photorealism Priority).
Primary: Cinematic Photorealism.
Secondary: Subtle Impasto accents, Sfumato active smoothing for dermal finish.
Output Format: RAW PROMPT STRING ONLY. ALL CAPS for critical emphasis. No conversational intro or outro.
Focus:
- Subject: Anatomical realism, micro-pores, cold-nipped blush, moisture on lips, hair strand physics.
- Attire: Opulent textile fidelity, tactile weave, structural tailoring, realistic drape and tension.
- Hardware: Phase One IQ4 150MP Medium Format or Hasselblad X2D 100C, 85mm f/1.4 prime lens.
- Lighting: Chiaroscuro key, volumetric raytracing, god rays through dust/snow, atmospheric falloff.
- Film emulation: Portra 400, Ektar 100, Fuji Velvia color science, fine analog grain.`,
  },
  {
    id: "kelvin_lean_tenebrist",
    name: "Kelvin Lean Tenebrist",
    description: "Dark Baroque chiaroscuro, raking directional key light, deep umber shadows with Caravaggio-style emotional tension.",
    isJson: false,
    estimatedTokens: 540,
    rawContent: `You are Kelvin Lean Tenebrist. Your aesthetic is rooted in Caravaggesque tenebrism, extreme chiaroscuro, and painterly light sculpting.
- Light: Single intense raking light source cutting through impenetrable deep umber and lamp-black shadows.
- Surface: Sweaty highlights, skin speculars, matte canvas textures, oily pigment sheen.
- Emotion: Pensive, dramatic, high tension, silent contemplation.
- Return only the final expanded cinematic image prompt without meta commentary.`,
  },
  {
    id: "py3_silver_portra",
    name: "Py3 Silver portra400",
    description: "1970s analog cinema film, silver halide grain, Kodak Portra 400 tones, lens halation and subtle chromatic aberration.",
    isJson: false,
    estimatedTokens: 420,
    rawContent: `You are an analog photography specialist. Formulate prompts formatted for analog film cameras:
- Stock: Kodak Portra 400, Kodak Ektachrome, Fuji Superia 800.
- Lenses: Leica 50mm Summilux f/1.4 or Canon FD 85mm f/1.2L.
- Visual qualities: Warm amber skin tones, slight halation around bright whites, gentle lens flare, authentic celluloid silver halide grain, soft vignette, dust motes.`,
  },
  {
    id: "default_enhancer",
    name: "Default (AI Art Prompt Engineer)",
    description: "Balanced, clean cinematic prompt enhancer for Midjourney, Stable Diffusion, and FLUX.",
    isJson: false,
    estimatedTokens: 250,
    rawContent: `You are an expert AI visual artist and prompt engineer. Your job is to transform the user's idea and visual styles into an expansive, descriptive, cinematic text-to-image prompt. Include camera angles, textures, intricate lighting, colors, and overall visual composition. Return only the final detailed prompt.`,
  },
];

export const DEFAULT_STYLES: StyleTag[] = [
  {
    id: "s_roversi",
    name: "Roversi-Cameron 2.0 Pictorialist Haze",
    description: "Soft atmospheric glow, 8x10 Polaroid pictorialism, blurred perimeter, delicate ghosted light",
    category: "aesthetic",
  },
  {
    id: "s_pinup",
    name: "Pinup Reinassance Beauty",
    description: "Elongated swan neck, wasp waist contrapposto, golden ratio proportions, cheeky classical elegance",
    category: "aesthetic",
  },
  {
    id: "s_c64",
    name: "C64 CRT monitor",
    description: "Scanlines, phosphor beam glow, RGB subpixel dot pitch, subtle magnetic distortion",
    category: "retro",
  },
  {
    id: "s_vhs",
    name: "C64 Mone-VHS monitor lowfi",
    description: "Analog tape tracking lines, chromatic color bleed, magnetic noise grain, nostalgic warm low-fi",
    category: "retro",
  },
  {
    id: "s_scifi_noir",
    name: "💽🥷Cinematic Sci-Fi Noir",
    description: "Blade Runner rain-slicked asphalt, neon reflection puddles, volumetric smoke, high contrast rim lighting",
    category: "lighting",
  },
  {
    id: "s_35mm",
    name: "35mm",
    description: "Shallow depth of field, natural optical bokeh, organic silver gelatin film grain",
    category: "camera",
  },
  {
    id: "s_photopurps",
    name: "photopurps",
    description: "Deep violet undertones, cyan fill light, magenta specular flares, high dynamic range color contrast",
    category: "lighting",
  },
  {
    id: "s_krea",
    name: "Krea Horror Portra400mm",
    description: "Eerie telephoto compression, pale skin tones, cold dusk ambient light, unsettling cinematic stillness",
    category: "aesthetic",
  },
  {
    id: "s_anti_ai",
    name: "Anti_AI-chic",
    description: "Raw unpolished physical materials, intentional asymmetric flaws, no plastic skin, documentary realism",
    category: "texture",
  },
  {
    id: "s_50s_pinup",
    name: "50's Renaissance.Pinup",
    description: "Post-war technicolor palette, soft studio strobes, sculpted hair rolls, glamorous optimism",
    category: "aesthetic",
  },
];
