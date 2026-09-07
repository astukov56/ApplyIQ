import { NextRequest } from 'next/server';
import OpenAI from 'openai';

import { normalizeUrl, normalizeLinkedInUrl, normalizeGitHubUrl } from '@/lib/linkUtils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// GPT-4o mini structured extraction prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert resume parser. Extract all information from the provided resume text and return a single valid JSON object.

CRITICAL RULES:
- Do NOT invent or hallucinate any information not present in the text. If a field is absent, omit it or return an empty array/string.
- EDUCATION DATES: Extract ONLY the graduation or completion year (e.g. "2025" or "Graduated 2025") into "endDate". NEVER assume, infer, or fabricate an unstated multi-year range like "2021-2025" unless an explicit start year/date is explicitly written in the source text. If no start year is explicitly written, set "startDate" to "".
- CONTACT LINKS: Extract full URLs for linkedinUrl, githubUrl, and websiteUrl if present.

OUTPUT SCHEMA (return exactly this shape):
{
  "summary": "<professional summary paragraph>",
  "skills": [
    { "id": "<uuid>", "name": "<skill name>", "category": "<Languages|Frameworks|Cloud & DB|Tools & Other>", "proficiency": "<Beginner|Intermediate|Advanced|Expert>" }
  ],
  "experiences": [
    {
      "id": "<uuid>",
      "company": "<company name>",
      "role": "<job title>",
      "location": "<city, country>",
      "startDate": "<Mon YYYY or YYYY>",
      "endDate": "<Mon YYYY or Present>",
      "isCurrent": <true|false>,
      "highlights": ["<bullet point>"]
    }
  ],
  "education": [
    {
      "id": "<uuid>",
      "institution": "<university/school>",
      "degree": "<degree name>",
      "fieldOfStudy": "<major/field>",
      "startDate": "<explicit start year ONLY if written in text, otherwise empty string \"\">",
      "endDate": "<graduation/completion year ONLY (e.g. \"2025\" or \"Graduated 2025\"). Do NOT invent ranges like \"2021-2025\">",
      "grade": "<GPA or grade if present>",
      "details": "<any extra details>"
    }
  ],
  "projects": [
    {
      "id": "<uuid>",
      "title": "<project title>",
      "description": "<one-sentence description>",
      "techStack": ["<tech>"],
      "liveUrl": "<url or omit>",
      "githubUrl": "<url or omit>"
    }
  ],
  "name": "<full name>",
  "title": "<professional title or headline>",
  "email": "<email>",
  "phone": "<phone>",
  "location": "<city, country>",
  "linkedinUrl": "<url or empty string>",
  "githubUrl": "<url or empty string>",
  "websiteUrl": "<url or omit>"
}`;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file uploaded. Send a multipart/form-data request with a "file" field.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) {
      return Response.json({ error: 'Unsupported file type. Upload a .pdf, .doc, or .docx file.' }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ----- Extract plain text -----
    let rawText = '';
    if (ext === 'docx' || ext === 'doc') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as typeof import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      // PDF
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      rawText = result.text;
    }

    rawText = rawText.trim();
    if (!rawText || rawText.length < 50) {
      return Response.json({ error: 'Could not extract meaningful text from the file. The file may be scanned/image-based.' }, { status: 422 });
    }

    // Truncate to ~12,000 chars to stay within token budget
    const truncated = rawText.length > 12000 ? rawText.slice(0, 12000) + '\n[... truncated ...]' : rawText;

    // ----- Ask GPT-4o mini to structure the text -----
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-openai-api-key' || apiKey.startsWith('sk-placeholder')) {
      return Response.json(
        { error: 'Invalid OpenAI API key. Please verify OPENAI_API_KEY in your .env.local file.' },
        { status: 401 }
      );
    }

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `RESUME TEXT:\n${truncated}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return Response.json({ error: 'Empty response from OpenAI' }, { status: 502 });
    }

    const parsed = JSON.parse(raw);

    // Normalize IDs and arrays to prevent undefined/null errors
    if (Array.isArray(parsed.skills)) {
      parsed.skills = parsed.skills.map((s: Record<string, unknown>, idx: number) => ({
        id: (s.id as string) && !String(s.id).includes('uuid') ? String(s.id) : `sk-parsed-${idx}-${crypto.randomUUID().slice(0, 8)}`,
        name: String(s.name || '').trim(),
        category: (['Languages', 'Frameworks', 'Cloud & DB', 'Tools & Other'].includes(s.category as string) ? s.category : 'Tools & Other') as string,
        proficiency: (['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(s.proficiency as string) ? s.proficiency : 'Intermediate') as string,
      })).filter((s: { name: string }) => s.name.length > 0);
    } else {
      parsed.skills = [];
    }

    if (Array.isArray(parsed.experiences)) {
      parsed.experiences = parsed.experiences.map((exp: Record<string, unknown>, idx: number) => ({
        id: (exp.id as string) && !String(exp.id).includes('uuid') ? String(exp.id) : `exp-parsed-${idx}-${crypto.randomUUID().slice(0, 8)}`,
        company: String(exp.company || 'Company'),
        role: String(exp.role || 'Role'),
        location: String(exp.location || ''),
        startDate: String(exp.startDate || '2023'),
        endDate: String(exp.endDate || 'Present'),
        isCurrent: Boolean(exp.isCurrent || String(exp.endDate).toLowerCase().includes('present')),
        highlights: Array.isArray(exp.highlights) ? exp.highlights.map(String).filter((h: string) => h.trim().length > 0) : [],
      }));
    } else {
      parsed.experiences = [];
    }

    if (Array.isArray(parsed.education)) {
      parsed.education = parsed.education.map((edu: Record<string, unknown>, idx: number) => ({
        id: (edu.id as string) && !String(edu.id).includes('uuid') ? String(edu.id) : `edu-parsed-${idx}-${crypto.randomUUID().slice(0, 8)}`,
        institution: String(edu.institution || 'Institution'),
        degree: String(edu.degree || 'Degree'),
        fieldOfStudy: String(edu.fieldOfStudy || ''),
        startDate: String(edu.startDate || ''),
        endDate: String(edu.endDate || ''),
        grade: edu.grade ? String(edu.grade) : undefined,
        details: edu.details ? String(edu.details) : undefined,
      }));
    } else {
      parsed.education = [];
    }

    if (Array.isArray(parsed.projects)) {
      parsed.projects = parsed.projects.map((proj: Record<string, unknown>, idx: number) => ({
        id: (proj.id as string) && !String(proj.id).includes('uuid') ? String(proj.id) : `proj-parsed-${idx}-${crypto.randomUUID().slice(0, 8)}`,
        title: String(proj.title || 'Project'),
        description: String(proj.description || ''),
        techStack: Array.isArray(proj.techStack) ? proj.techStack.map(String) : [],
        liveUrl: proj.liveUrl ? normalizeUrl(String(proj.liveUrl)) : undefined,
        githubUrl: proj.githubUrl ? normalizeUrl(String(proj.githubUrl)) : undefined,
      }));
    } else {
      parsed.projects = [];
    }

    parsed.linkedinUrl = normalizeLinkedInUrl(parsed.linkedinUrl);
    parsed.githubUrl = normalizeGitHubUrl(parsed.githubUrl);
    parsed.websiteUrl = normalizeUrl(parsed.websiteUrl);

    return Response.json({ success: true, data: parsed });
  } catch (err: unknown) {
    console.error('[/api/resume/parse] error:', err);
    const status = (err as { status?: number })?.status;
    const code = (err as { code?: string })?.code;
    const msg = err instanceof Error ? err.message : String(err);

    if (
      status === 401 ||
      code === 'invalid_api_key' ||
      msg.includes('401') ||
      msg.toLowerCase().includes('incorrect api key') ||
      msg.toLowerCase().includes('invalid api key')
    ) {
      return Response.json(
        { error: 'Invalid OpenAI API key. Please verify OPENAI_API_KEY in your .env.local file.' },
        { status: 401 }
      );
    }

    return Response.json({ error: msg || 'Internal server error' }, { status: 500 });
  }
}
