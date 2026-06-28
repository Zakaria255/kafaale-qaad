import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma/client';
import { sysLog } from './logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface FieldData {
  caseId: string;
  // Private victim info
  victimDescription: string;
  victimLocation: string;
  victimSituation: string;
  category: string;
  emergencyLevel: string;
  estimatedAmount: number;
  agentNotes: string;
  witnessStatements?: string;
  mediaUrls?: string[];
}

interface SanitizationResult {
  generatedTitle: string;
  generatedStory: string;
  generatedCategory: string;
  generatedCity: string;
  generatedUrgency: string;
  safeMediaUrls: string[];
  piiDetected: boolean;
  piiRemoved: string[];
  mediaFlagged: string[];
  confidenceScore: number;
  tokensUsed: number;
  processingMs: number;
}

const SYSTEM_PROMPT = `You are the Kafaale Qaad AI Privacy & Sanitization Engine.

Your ONLY job is to take private humanitarian field investigation data and produce a SAFE, DIGNIFIED public version that:
1. REMOVES all Personally Identifiable Information (PII): full names, phone numbers, exact addresses, national IDs, passport numbers, medical record numbers, banking details, GPS coordinates, home locations, school names that identify the victim
2. KEEPS only safe public information: general humanitarian situation, city/region (no street address), category, urgency level
3. GENERATES a compassionate, professional public case title and story
4. IDENTIFIES any media (image URLs) that may be graphic, humiliating, show unprotected children, or contain visible PII in images

Output ONLY valid JSON. No markdown, no explanation, no extra text.

JSON Schema:
{
  "generatedTitle": "string — safe public title, max 100 chars, e.g. 'Urgent Medical Support for Family in Mogadishu'",
  "generatedStory": "string — 2-4 sentences, safe humanitarian summary, no PII, compassionate tone",
  "generatedCategory": "string — one of: food, medical, shelter, orphan, disaster, education, other",
  "generatedCity": "string — city/region only, e.g. 'Mogadishu' or 'Baidoa Region' — never exact address",
  "generatedUrgency": "string — one of: critical, high, medium, low",
  "safeMediaUrls": ["array of media URLs that are SAFE for public display"],
  "piiDetected": true/false,
  "piiRemoved": ["list of PII types that were found and removed, e.g. 'phone number', 'exact address', 'full name'"],
  "mediaFlagged": ["array of media URLs flagged as unsafe, graphic, or exploitative"],
  "confidenceScore": 0-100
}`;

export async function sanitizeCaseWithAI(data: FieldData): Promise<SanitizationResult> {
  const start = Date.now();

  const userMessage = `
Field Investigation Data — PRIVATE (DO NOT include in public output):

Case Category: ${data.category}
Emergency Level: ${data.emergencyLevel}
Victim Situation (private): ${data.victimDescription}
Location Details (private): ${data.victimLocation}
Current Situation: ${data.victimSituation}
Estimated Amount Needed: $${data.estimatedAmount}
Field Agent Notes: ${data.agentNotes}
${data.witnessStatements ? `Witness Statements (private): ${data.witnessStatements}` : ''}
${data.mediaUrls?.length ? `Media URLs to evaluate: ${data.mediaUrls.join(', ')}` : ''}

Generate a safe, dignified public version. Remove ALL PII. Output valid JSON only.
`.trim();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const processingMs = Date.now() - start;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';

    // Clean potential markdown wrappers
    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      sysLog.error('AI returned invalid JSON — using fallback sanitization', { rawText });
      parsed = buildFallbackSanitization(data);
    }

    const result: SanitizationResult = {
      generatedTitle: String(parsed.generatedTitle || 'Humanitarian Aid Request').slice(0, 100),
      generatedStory: String(parsed.generatedStory || 'A family in need requires humanitarian assistance.'),
      generatedCategory: validateCategory(parsed.generatedCategory, data.category),
      generatedCity: String(parsed.generatedCity || ''),
      generatedUrgency: validateUrgency(parsed.generatedUrgency, data.emergencyLevel),
      safeMediaUrls: Array.isArray(parsed.safeMediaUrls) ? parsed.safeMediaUrls : [],
      piiDetected: Boolean(parsed.piiDetected),
      piiRemoved: Array.isArray(parsed.piiRemoved) ? parsed.piiRemoved : [],
      mediaFlagged: Array.isArray(parsed.mediaFlagged) ? parsed.mediaFlagged : [],
      confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 80)),
      tokensUsed,
      processingMs,
    };

    sysLog.info(`✅ AI sanitization completed for case ${data.caseId}`, {
      tokensUsed,
      processingMs,
      piiDetected: result.piiDetected,
      piiRemoved: result.piiRemoved,
    });

    return result;
  } catch (err: any) {
    sysLog.error(`❌ AI sanitization failed for case ${data.caseId}`, err);
    throw new Error(`AI sanitization failed: ${err.message}`);
  }
}

export async function runAiSanitizationForCase(caseId: string): Promise<AiPublicData> {
  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      fieldInvestigation: true,
      mediaFiles: true,
    },
  });

  if (!kase) throw new Error('Case not found');
  if (!kase.fieldInvestigation) throw new Error('No field investigation found — cannot sanitize');

  const inv = kase.fieldInvestigation;

  const fieldData: FieldData = {
    caseId,
    victimDescription: kase.privateDescription || '',
    victimLocation: kase.privateAddress || 'Location withheld',
    victimSituation: inv.situationNotes || kase.privateDescription || '',
    category: kase.category,
    emergencyLevel: kase.emergencyLevel,
    estimatedAmount: Number(inv.estimatedAmountNeeded),
    agentNotes: inv.officialNotes || '',
    // witnessStatements removed — not in current schema
    mediaUrls: kase.mediaFiles.map((m) => m.url),
  };

  const result = await sanitizeCaseWithAI(fieldData);

  // Mark safe media in DB
  if (result.safeMediaUrls.length > 0) {
    await prisma.caseMedia.updateMany({
      where: { caseId, url: { in: result.safeMediaUrls } },
      data: { isPublic: true },
    });
  }

  // Mark flagged media in DB
  if (result.mediaFlagged.length > 0) {
    for (const url of result.mediaFlagged) {
      await prisma.caseMedia.updateMany({
        where: { caseId, url },
        data: { isFlagged: true, flagReason: 'AI: unsafe/graphic/exploitative content' },
      });
    }
  }

  // Arrays are persisted as JSON strings (String columns — engine-agnostic).
  const safeMediaUrls = JSON.stringify(result.safeMediaUrls || []);
  const piiRemoved    = JSON.stringify(result.piiRemoved || []);
  const mediaFlagged  = JSON.stringify(result.mediaFlagged || []);

  // Upsert AI public data
  const aiData = await prisma.aiPublicData.upsert({
    where: { caseId },
    update: {
      generatedTitle:    result.generatedTitle,
      generatedStory:    result.generatedStory,
      generatedCategory: result.generatedCategory,
      generatedCity:     result.generatedCity,
      generatedUrgency:  result.generatedUrgency,
      safeMediaUrls,
      piiDetected:       result.piiDetected,
      piiRemoved,
      mediaFlagged,
      confidenceScore:   result.confidenceScore,
      tokensUsed:        result.tokensUsed,
      updatedAt:         new Date(),
    },
    create: {
      caseId,
      generatedTitle:    result.generatedTitle,
      generatedStory:    result.generatedStory,
      generatedCategory: result.generatedCategory,
      generatedCity:     result.generatedCity,
      generatedUrgency:  result.generatedUrgency,
      safeMediaUrls,
      piiDetected:       result.piiDetected,
      piiRemoved,
      mediaFlagged,
      confidenceScore:   result.confidenceScore,
      tokensUsed:        result.tokensUsed,
    },
  });

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status:          'ai_sanitized',
      aiSanitizedAt:   new Date(),
      publicTitle:     result.generatedTitle,
      publicStory:     result.generatedStory,
      publicCity:      result.generatedCity,
      publicMediaUrls: safeMediaUrls,
    },
  });

  return aiData;
}

// ── Helpers ───────────────────────────────────────────────────────

function validateCategory(cat: string, fallback: string): string {
  const valid = ['food', 'medical', 'shelter', 'orphan', 'disaster', 'education', 'other'];
  return valid.includes(cat) ? cat : fallback;
}

function validateUrgency(urg: string, fallback: string): string {
  const valid = ['critical', 'high', 'medium', 'low'];
  return valid.includes(urg) ? urg : fallback;
}

function buildFallbackSanitization(data: FieldData): any {
  return {
    generatedTitle: `Urgent ${data.category} support needed`,
    generatedStory: `A family requires urgent ${data.category} assistance. Our field team has verified the situation and confirmed the need for immediate humanitarian support.`,
    generatedCategory: data.category,
    generatedCity: 'Undisclosed location',
    generatedUrgency: data.emergencyLevel,
    safeMediaUrls: [],
    piiDetected: true,
    piiRemoved: ['Unable to process — fallback used'],
    mediaFlagged: data.mediaUrls || [],
    confidenceScore: 40,
  };
}

// Re-export type for use in routes
export type AiPublicData = Awaited<ReturnType<typeof prisma.aiPublicData.upsert>>;
