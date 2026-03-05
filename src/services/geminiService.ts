import { GoogleGenAI, Type } from "@google/genai";
import rulesData from "../data/notary_primary_sources_v1.json";

const SYSTEM_INSTRUCTION = `
You are a Notary Rules assistant (NOTARYOS GUARDIAN).

HARD RULES:
1. Answer ONLY using the provided PRIMARY SOURCES dataset below and any context provided.
2. If the dataset does not contain relevant text for the selected state/topic, you MUST say: "Not found in provided primary sources."
3. NEVER use general knowledge. NEVER guess. NEVER hallucinate.
4. You MUST return:
   - A direct, clear answer.
   - A source list (title + url).
   - Where found (specific page, section, or field if available).
   - "Last updated" date (from the source or registry record).

---

PRIMARY SOURCES DATASET (notary_primary_sources_v1.json):
${JSON.stringify(rulesData, null, 2)}

---

JSON OUTPUT MODE (MANDATORY)
You MUST output ONLY valid JSON.
Do NOT include markdown fences.

Schema:
{
  "summary": "string", (The direct answer)
  "action": "string",
  "details": ["string"],
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "source": {
    "title": "string",
    "url": "string",
    "where_found": "string", (Page/Section/Field)
    "last_updated": "YYYY-MM-DD" | ""
  },
  "confidence": "string",
  "disclaimer": "This is not legal advice. Verify with the official source.",
  "clarifying_questions": ["string"],
  "next_ctas": [
    { "label": "string", "target_view": "schedule|journal|clients|finances|settings|export" }
  ]
}

Rules:
- details must always be an array (use 1–6 bullets).
- If you cannot verify a source from the dataset, set:
  source.title = "Not available in this dataset"
  source.url = ""
  source.where_found = ""
  source.last_updated = ""
- clarifying_questions must be [] if none are needed.
- next_ctas must be [] if none are appropriate.
- risk_level defaults to MEDIUM when clarifying is required.
- confidence should reflect how well the query matches the dataset (e.g., "High", "Partial", "None").

---

TONE
- Calm
- Professional
- Reassuring
- Clear
- Non-judgmental
- Senior-notary demeanor
`;

export type Phase = 'BEFORE APPOINTMENT' | 'DURING SIGNING' | 'AFTER SIGNING';

export interface NotaryContext {
  state?: string;
  appointmentType?: string;
  phase: Phase;
  clientInfo?: string;
  journalStatus: 'not started' | 'started' | 'completed';
}

export interface GuardianResponse {
  summary: string;
  action: string;
  details: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  source: {
    title: string;
    url: string;
    where_found: string;
    last_updated: string;
  };
  confidence: string;
  disclaimer: string;
  clarifying_questions: string[];
  next_ctas: {
    label: string;
    target_view: 'schedule' | 'journal' | 'clients' | 'finances' | 'settings' | 'export';
  }[];
}

export async function getGuardianResponse(message: string, context: NotaryContext): Promise<GuardianResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3.1-pro-preview";

  const contextStr = `
CURRENT CONTEXT:
- State: ${context.state || 'Unknown'}
- Appointment Type: ${context.appointmentType || 'Unknown'}
- Phase: ${context.phase}
- Client Info: ${context.clientInfo || 'Unknown'}
- Journal Status: ${context.journalStatus}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: message }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\n\n" + contextStr,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          action: { type: Type.STRING },
          details: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          risk_level: { 
            type: Type.STRING,
            enum: ["LOW", "MEDIUM", "HIGH"]
          },
          source: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              where_found: { type: Type.STRING },
              last_updated: { type: Type.STRING }
            },
            required: ["title", "url", "where_found", "last_updated"]
          },
          confidence: { type: Type.STRING },
          disclaimer: { type: Type.STRING },
          clarifying_questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          next_ctas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                target_view: { 
                  type: Type.STRING,
                  enum: ["schedule", "journal", "clients", "finances", "settings", "export"]
                }
              },
              required: ["label", "target_view"]
            }
          }
        },
        required: ["summary", "action", "details", "risk_level", "source", "confidence", "disclaimer", "clarifying_questions", "next_ctas"]
      }
    },
  });

  try {
    return JSON.parse(response.text || '{}') as GuardianResponse;
  } catch (e) {
    console.error("Failed to parse Guardian response:", e);
    throw new Error("Invalid response format from AI");
  }
}
