/**
 * Generate sample pet portrait images for the Royal Paws landing page.
 * Uses the same prompts from the PortraitFactory site.
 * Reads OPENROUTER_API_KEY from the backend .env.local
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read API key from backend .env.local
const envPath = path.resolve(__dirname, '../../teamscout-ai-extractor (1)/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const openrouterKey = envContent.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
if (!openrouterKey) {
  console.error('No OPENROUTER_API_KEY found in', envPath);
  process.exit(1);
}

const MODEL = 'google/gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/samples');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Download a dog photo from Unsplash as base64
async function downloadDogPhoto() {
  console.log('Downloading sample dog photo...');
  const url = 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=600&h=800&fit=crop&crop=face';
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  // Save the original
  fs.writeFileSync(path.join(OUTPUT_DIR, 'original.jpg'), buf);
  console.log('Saved original.jpg');
  return buf;
}

// Generate a portrait using OpenRouter
async function generatePortrait(imageBuffer, stylePrompt, styleName) {
  console.log(`Generating ${styleName}...`);
  const base64 = imageBuffer.toString('base64');
  
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      modalities: ['image', 'text'],
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: stylePrompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error for ${styleName}: ${err}`);
  }

  const json = await res.json();
  
  // Extract image from response
  const images = json.choices?.[0]?.message?.images;
  let imgData = null;
  
  if (Array.isArray(images) && images.length > 0) {
    const dataUrl = images[0].image_url?.url || '';
    const [, data] = dataUrl.split(',');
    imgData = data;
  } else {
    const parts = json.choices?.[0]?.message?.content;
    const imgPart = Array.isArray(parts) ? parts.find(p => p.type === 'image_url') : null;
    if (imgPart) {
      const dataUrl = imgPart.image_url?.url || '';
      const [, data] = dataUrl.split(',');
      imgData = data;
    }
  }

  if (!imgData) {
    console.error('Response:', JSON.stringify(json).slice(0, 500));
    throw new Error(`No image in response for ${styleName}`);
  }

  return Buffer.from(imgData, 'base64');
}

// Prompts from PortraitFactory siteConfig
const COMMON = 'Preserve the dog\'s face, breed, fur color, and markings EXACTLY. The costume should fit naturally on the dog\'s body. CRITICAL COMPOSITION: This must be a PERFECT SQUARE image. Center the dog vertically — leave at least 15% space ABOVE the top of the head. The head must NOT be near the top edge. Cinematic lighting, 8K quality. No picture frames, no borders, no text, no watermarks.';

const STYLES = [
  {
    id: 'royal',
    name: 'Royal Monarch',
    prompt: `Transform this pet photo into a photorealistic portrait of this EXACT dog wearing an ornate royal crown and ermine-trimmed velvet robe with golden accents, seated on a golden throne in a grand palace throne room with tapestries and candlelight. ${COMMON}`,
    filename: 'royal.png',
  },
  {
    id: 'military',
    name: 'Military General',
    prompt: `Transform this pet photo into a photorealistic portrait of this EXACT dog wearing a decorated military general uniform with gold epaulettes, medals, braided cords, and a red sash, posed proudly in a war room with maps and flags behind them. ${COMMON}`,
    filename: 'military.png',
  },
  {
    id: 'renaissance',
    name: 'Renaissance Noble',
    prompt: `Transform this pet photo into a photorealistic portrait of this EXACT dog wearing an elegant Renaissance-era noble outfit with a white lace ruff collar and velvet cloak, posed in a grand Italian villa with marble columns and oil paintings. ${COMMON}`,
    filename: 'renaissance.png',
  },
  {
    id: 'wizard',
    name: 'Wizard Sorcerer',
    prompt: `Transform this pet photo into a photorealistic portrait of this EXACT dog wearing a mystical wizard robe with arcane symbols, a pointed hat, and holding a glowing staff, in a magical library filled with floating books and glowing orbs. ${COMMON}`,
    filename: 'wizard.png',
  },
  {
    id: 'astronaut',
    name: 'Astronaut Explorer',
    prompt: `Transform this pet photo into a photorealistic portrait of this EXACT dog wearing a detailed NASA-style space suit with helmet visor open, floating in a space station with Earth visible through the window behind them. ${COMMON}`,
    filename: 'astronaut.png',
  },
  {
    id: 'flower',
    name: 'Flower Garden',
    prompt: `Transform this pet photo into a photorealistic portrait of this EXACT dog surrounded by a lush vibrant flower garden with roses, sunflowers, and butterflies, wearing a delicate flower crown, with soft golden-hour sunlight. ${COMMON}`,
    filename: 'flower.png',
  },
];

async function main() {
  const dogPhoto = await downloadDogPhoto();

  for (const style of STYLES) {
    try {
      const result = await generatePortrait(dogPhoto, style.prompt, style.name);
      const outPath = path.join(OUTPUT_DIR, style.filename);
      fs.writeFileSync(outPath, result);
      console.log(`Saved ${style.filename} (${(result.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`Failed ${style.name}:`, err.message);
    }
  }

  console.log('\nDone! Files saved to:', OUTPUT_DIR);
}

main();
