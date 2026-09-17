import { StyleTag } from "../types";

export interface SynthesizedPromptResult {
  result: string;
  modelUsed: string;
  modelNameDisplay: string;
  isLocalFallback?: boolean;
}

/**
 * High-fidelity algorithmic prompt expander used when server/cloud API is restarting or experiencing momentary downtime.
 * Guarantees zero downtime and prevents any 'Unexpected token' failures.
 */
export function synthesizePromptLocally(
  rawPrompt: string,
  personaName: string,
  personaContent: string,
  activeStyles: StyleTag[]
): SynthesizedPromptResult {
  const cleanPrompt = rawPrompt.trim();
  const styleDescriptions = activeStyles.map((s) => s.description).join(", ");
  const styleKeywords = activeStyles.map((s) => s.name).join(", ");

  // Extract core concepts
  const isPortrait = /woman|man|girl|boy|person|portrait|face|model|blonde|figure|character/i.test(cleanPrompt);

  const subjectDetail = isPortrait
    ? `${cleanPrompt.replace(/\.$/, "")}, captured in a natural, candid yet poised expression with realistic skin texture, subtle subsurface scattering, and lifelike ocular reflections`
    : `${cleanPrompt.replace(/\.$/, "")}, rendered with meticulous structural fidelity, organic surface imperfections, and authentic atmospheric scale`;

  const lightingDetail = activeStyles.some((s) => /roversi|haze|pictorial/i.test(s.name))
    ? "Soft raking pictorialist ambient light filtered through diffused silk, warm halogen amber fill with blooming specular highlights on highlights and deep velvety shadow gradients"
    : "Cinematic high-contrast Rembrandt directional key lighting, soft natural bounce, subtle volumetric dust motes caught in the beam";

  const materialsDetail =
    "Tactile micro-textures, authentic fabric weaves, liquid sheen reflections, natural particulate dust, fine grain and true-to-life surface depth";

  const cameraDetail = activeStyles.some((s) => /35mm/i.test(s.name))
    ? "Shot on vintage 35mm prime lens (50mm f/1.4), authentic chemical film emulsion grain, natural optical falloff, organic halation around specular peaks"
    : "Large format 8x10 analog plate aesthetic, shallow focal plane, exquisite edge sharpness with gentle chromatic dispersion";

  const colorDetail = activeStyles.some((s) => /pinup|reinassance/i.test(s.name))
    ? "Rich warm golden hour palette, faded champagne, sepia undertones, deep emerald and crimson accents, authentic film color grade"
    : "Balanced organic color harmony, neutral deep blacks, warm midtones, desaturated natural hues with painterly tonal separation";

  const environmentDetail =
    "Richly layered environmental background, atmospheric depth of field, tactile architectural or natural backdrop enhancing the narrative focus";

  const finalCompounded = `${cleanPrompt}. ${styleKeywords ? `Aesthetic Style: ${styleKeywords}. ` : ""}${lightingDetail}. ${cameraDetail}. ${materialsDetail}. Authentic film texture, hyper-detailed craftsmanship, masterpiece quality.`;

  const negativePrompt =
    "deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation, watermark, signature, CGI render, cartoon, 3D render";

  const structuredOutput = {
    subject: subjectDetail,
    environment: environmentDetail,
    pose_inflection: "Dynamic counterposto alignment with natural weight distribution and cinematic gravitas",
    lighting: lightingDetail,
    color: colorDetail,
    materials: materialsDetail,
    camera_tech: cameraDetail,
    final_compounded_prompt: finalCompounded,
    negative_prompt: negativePrompt,
  };

  return {
    result: JSON.stringify(structuredOutput, null, 2),
    modelUsed: "local-synthesizer",
    modelNameDisplay: "Local Studio Engine (Zero-Downtime Fallback)",
    isLocalFallback: true,
  };
}
