import { z } from 'zod';
import { ConfigError } from './usda';

export const VisionResult = z.object({
  is_food: z.boolean(),
  meal_name: z.string().default('Meal'),
  overall_confidence: z.number().min(0).max(1).default(0.5),
  items: z.array(z.object({
    name: z.string().min(1).max(120),
    usda_query: z.string().min(1).max(120),
    estimated_grams: z.number().positive().max(3000),
    cooking_method: z.string().max(80).default(''),
    visible_ingredients: z.array(z.string().max(60)).max(20).default([]),
    confidence: z.number().min(0).max(1).default(0.5),
    note: z.string().max(300).default(''),
  })).max(12).default([]),
  questions: z.array(z.string().max(240)).max(6).default([]),
});

export type VisionResult = z.infer<typeof VisionResult>;

const SYSTEM = `You are the food-recognition component of a nutrition app. Look at the photo and report what is visible.
Rules:
- Identify every distinct food on the plate (rice, curry, bread, salad, sauce, drink...). Recognise Pakistani, Indian, Middle Eastern, Asian, European and American dishes, homemade and restaurant.
- usda_query must be a plain English USDA FoodData Central search phrase for that item (e.g. "rice, white, cooked", "chicken breast, roasted", "lentils, cooked"). If a composite dish is unlikely to exist in USDA (e.g. biryani, karahi, nihari), split it into its main visible components (cooked rice, chicken curry, ...) with separate gram estimates, or use the closest dish phrase.
- estimated_grams is your honest best estimate of the edible weight from the photo; use plate, cutlery and hand size as scale cues. Never claim precision.
- Report cooking_method and visible oil/sauce/toppings only if you can actually see evidence; otherwise leave blank.
- Lower the confidence for anything ambiguous, hidden or hard to size, and add short clarifying questions the user should confirm (hidden ingredients, oil amount, portion size, dish identity).
- If the image does not contain food, set is_food=false and return no items.`;

const TOOL: any = {
  name: 'report_food_analysis',
  description: 'Report the foods recognised in the photo.',
  input_schema: {
    type: 'object',
    properties: {
      is_food: { type: 'boolean' },
      meal_name: { type: 'string', description: 'Short name for the whole meal' },
      overall_confidence: { type: 'number', description: '0 to 1' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            usda_query: { type: 'string' },
            estimated_grams: { type: 'number' },
            cooking_method: { type: 'string' },
            visible_ingredients: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', description: '0 to 1, recognition and portion confidence combined' },
            note: { type: 'string' },
          },
          required: ['name', 'usda_query', 'estimated_grams', 'confidence'],
        },
      },
      questions: { type: 'array', items: { type: 'string' } },
    },
    required: ['is_food', 'meal_name', 'overall_confidence', 'items', 'questions'],
  },
};

function geminiKey(): string {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!k) throw new ConfigError('GEMINI_API_KEY is not configured on the server.');
  return k;
}

export function anthropic(): any {
  return {
    messages: {
      create: async (params: any) => {
        const key = geminiKey();
        const useTool = Array.isArray(params.tools) && params.tools.length > 0;
        let textParts: string[] = [];
        let imageData: string | null = null;
        let imageMime = 'image/jpeg';
        const msgs = params.messages || [];
        for (const m of msgs) {
          const c = m.content;
          if (typeof c === 'string') textParts.push(c);
          else if (Array.isArray(c)) {
            for (const part of c) {
              if (part.type === 'text' && part.text) textParts.push(part.text);
              if (part.type === 'image' && part.source?.data) {
                imageData = part.source.data;
                imageMime = part.source.media_type || 'image/jpeg';
              }
              if (part.type === 'input_text' && part.text) textParts.push(part.text);
            }
          }
        }
        let prompt = (params.system || '') + '\n\n' + textParts.join('\n');
        if (useTool) {
          prompt += '\n\nReturn ONLY valid JSON, no markdown, no code fences, matching this shape: {"is_food": boolean, "meal_name": string, "overall_confidence": number 0-1, "items": [{"name": string, "usda_query": string, "estimated_grams": number, "cooking_method": string, "visible_ingredients": string[], "confidence": number 0-1, "note": string}], "questions": string[]}. ' + SYSTEM;
        }
        const parts: any[] = [{ text: prompt }];
        if (imageData) parts.push({ inline_data: { mime_type: imageMime, data: imageData } });
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 2000 } }),
        });
        const json: any = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Gemini request failed');
        let out = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
        out = out.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
        if (useTool) {
          const start = out.indexOf('{');
          const end = out.lastIndexOf('}');
          if (start >= 0 && end > start) out = out.slice(start, end + 1);
          let parsed: any;
          try { parsed = JSON.parse(out); } catch { parsed = { is_food: false, meal_name: 'Meal', overall_confidence: 0.5, items: [], questions: [] }; }
          return { content: [{ type: 'tool_use', name: 'report_food_analysis', input: parsed }] };
        }
        return { content: [{ type: 'text', text: out }] };
      },
    },
  };
}

export const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export async function analyzeFoodImage(input: { mime: string; base64: string }) {
  const msg: any = await anthropic().messages.create({
    model: MODEL(),
    max_tokens: 1200,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'report_food_analysis' },
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: input.mime, data: input.base64 } }, { type: 'text', text: 'Analyze this food photo and report the foods recognised.' }] }],
  });
  const block = (msg.content || []).find((b: any) => b.type === 'tool_use');
  if (!block) throw new Error('No tool output from Gemini');
  return VisionResult.parse((block as any).input);
}
