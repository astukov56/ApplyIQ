import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type { CoverLetterResult } from '@/types/tailor';

export interface CoverLetterEditRequest {
  coverLetter: CoverLetterResult;
  instruction: string;
  candidateName?: string;
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
}

export interface CoverLetterEditResult {
  updatedCoverLetter: CoverLetterResult;
  changeDescription: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CoverLetterEditRequest = await request.json();
    const {
      coverLetter,
      instruction,
      candidateName = 'Candidate',
      targetCompany = 'Company',
      targetRole = 'Target Position',
      jobDescription = '',
    } = body;

    if (!instruction?.trim()) {
      return Response.json({ error: 'instruction is required' }, { status: 400 });
    }
    if (!coverLetter || !coverLetter.body) {
      return Response.json({ error: 'coverLetter with body is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const systemPrompt = `You are an elite career strategist and executive cover letter architect assisting candidate: ${candidateName}.
Target Company: ${targetCompany}
Target Role: ${targetRole}

You will receive the candidate's current cover letter body and a single instruction.
Modify ONLY what the instruction requests. Preserve the standard 4-paragraph narrative architecture.

CONSTRAINTS:
- Structure: Exactly 4 cohesive paragraphs separated by double newlines (\\n\\n).
- Length: Total body word count must remain between 350 and 450 words.
- Tone: Executive, articulate, confident, grounded in real engineering/problem-solving value.

OUTPUT SCHEMA - return ONLY valid JSON:
{
  "body": "<string: 4 narrative paragraphs separated by \\n\\n>",
  "changeDescription": "<string: concise one-sentence description of edits made>"
}`;

    const userPrompt = `USER INSTRUCTION:
${instruction}

TARGET JOB DESCRIPTION:
${jobDescription || `Role: ${targetRole} at ${targetCompany}`}

CURRENT COVER LETTER BODY:
${coverLetter.body}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return Response.json({ error: 'Empty response from OpenAI' }, { status: 502 });
    }

    const parsed = JSON.parse(raw);
    const newBody = String(parsed.body || coverLetter.body).trim();
    const newWordCount = newBody.split(/\s+/).filter(Boolean).length;
    const newFullText = `${coverLetter.opening}\n\n${newBody}\n\n${coverLetter.closing}`;

    const updatedCoverLetter: CoverLetterResult = {
      ...coverLetter,
      body: newBody,
      wordCount: newWordCount,
      fullText: newFullText,
      targetCompany: coverLetter.targetCompany || targetCompany,
      targetRole: coverLetter.targetRole || targetRole,
      subject: coverLetter.subject || `Re: Application for ${targetRole} – ${targetCompany}`,
    };

    const result: CoverLetterEditResult = {
      updatedCoverLetter,
      changeDescription: parsed.changeDescription || 'Updated cover letter according to prompt.',
    };

    return Response.json(result);
  } catch (err: unknown) {
    console.error('[/api/tailor/cover-letter] error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
