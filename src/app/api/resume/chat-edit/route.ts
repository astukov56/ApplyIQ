import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { ResumeVersion, SkillItem, SkillCategory } from "@/types";

export interface ChatEditRequest {
  resume: ResumeVersion;
  instruction: string;
  candidateName?: string;
}

export interface ChatEditResult {
  updatedResume: ResumeVersion;
  changeDescription: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatEditRequest = await request.json();
    const { resume, instruction, candidateName = "Candidate" } = body;

    if (!instruction?.trim()) {
      return Response.json({ error: "instruction is required" }, { status: 400 });
    }
    if (!resume) {
      return Response.json({ error: "resume is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const systemPrompt = `You are a precise resume editor assisting candidate: ${candidateName}.
You will receive a resume snapshot (JSON) and a single natural-language instruction.
Apply ONLY the change described by the instruction. Touch nothing else.

STRICT IMMUTABILITY RULES:
- DO NOT modify Work Experience entries, Job Titles, Company Names, or Dates unless the instruction explicitly targets them.
- DO NOT rewrite bullet points unless the instruction explicitly asks.
- DO NOT alter Project titles or descriptions unless explicitly targeted.
- DO NOT remove any existing skills unless explicitly asked.
- DO NOT add more than 3 new skills unless explicitly asked.

ALLOWED ACTIONS (based on what the instruction asks):
- Rewrite the professional summary
- Add or remove specific named skills
- Adjust tone/wording of the summary only

OUTPUT SCHEMA - return ONLY valid JSON, no markdown fences:
{
  "summary": "<string: updated or unchanged professional summary>",
  "skills": [{ "id": "<string>", "name": "<string>", "category": "<string>", "proficiency": "<string>" }],
  "changeDescription": "<string: one-sentence description of what was changed>"
}`;

    const userPrompt = `INSTRUCTION: ${instruction}

CURRENT RESUME (JSON):
${JSON.stringify(
  {
    summary: resume.summary,
    skills: resume.skills,
    experiences: resume.experiences,
  },
  null,
  2,
)}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return Response.json({ error: "Empty response from OpenAI" }, { status: 502 });
    }

    const parsed = JSON.parse(raw);
    const nowIso = new Date().toISOString();

    const existingIds = new Set(resume.skills.map((s) => s.id));
    const parsedSkills: SkillItem[] = Array.isArray(parsed.skills) ? parsed.skills : resume.skills;

    const keptOriginals = resume.skills.filter((s) =>
      parsedSkills.some(
        (ps: SkillItem) =>
          ps.id === s.id || ps.name.toLowerCase() === s.name.toLowerCase()
      )
    );
    const newAdditions = parsedSkills
      .filter(
        (ps: SkillItem) =>
          !existingIds.has(ps.id) &&
          !resume.skills.some(
            (s) => s.name.toLowerCase() === ps.name.toLowerCase()
          )
      )
      .slice(0, 3)
      .map((s: SkillItem) => ({
        id: s.id || `sk-chat-${crypto.randomUUID().slice(0, 8)}`,
        name: String(s.name || "").trim(),
        category: (s.category as SkillCategory) || ("Tools & Other" as SkillCategory),
        proficiency: s.proficiency || "Intermediate",
      }));

    const mergedSkills: SkillItem[] = [...keptOriginals, ...newAdditions];

    const updatedResume: ResumeVersion = {
      ...resume,
      updatedAt: nowIso,
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : resume.summary,
      skills: mergedSkills.length > 0 ? mergedSkills : resume.skills,
      experiences: resume.experiences,
      education: resume.education,
      projects: resume.projects,
    };

    const result: ChatEditResult = {
      updatedResume,
      changeDescription:
        typeof parsed.changeDescription === "string"
          ? parsed.changeDescription
          : `Applied: "${instruction}"`,
    };

    return Response.json(result);
  } catch (err: unknown) {
    console.error("[/api/resume/chat-edit] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
