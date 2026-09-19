const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { GoogleGenAI } = require("@google/genai");
const { isLegalQuestion, retrieveRelevantLaws, refusalResponse } = require("./rag/retriever.cjs");

const MODEL_NAME = "gemini-2.5-flash";
const HF_MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct";
const datasetPath = path.join(__dirname, "data", "ipcLawDataset.json");

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stringifyValue).join(" ");
  if (typeof value === "object") {
    if (typeof value.en === "string") return value.en;
    if (typeof value.english === "string") return value.english;
    return Object.values(value)
      .map(stringifyValue)
      .join(" ");
  }
  return String(value);
}

function loadIpcDataset() {
  try {
    return JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  } catch (error) {
    console.error("IPC DATASET ERROR:", error.message);
    return [];
  }
}

const legalSources = [
  "Constitution of India",
  "Bharatiya Nyaya Sanhita, 2023",
  "Bharatiya Nagarik Suraksha Sanhita, 2023",
  "Bharatiya Sakshya Adhiniyam, 2023",
  "Consumer Protection Act, 2019",
  "Right to Information Act, 2005",
  "Information Technology Act, 2000",
];

function fallbackAnswer(question, relevantLaw) {
  const normalizedQuestion = question.toLowerCase();

  if (relevantLaw.length > 0) {
    const law = relevantLaw[0];
    const lawTitle = stringifyValue(law.title);
    const lawSummary = stringifyValue(law.summary);
    const currentStatus = stringifyValue(law.currentStatus);
    return {
      topic: lawTitle,
      quickAnswer: `Based on ${stringifyValue(law.act)}${law.section ? ` — ${stringifyValue(law.section)}` : ""}: ${lawSummary}`,
      detailedAnswer: `${lawSummary} ${currentStatus} This is general legal information and not a substitute for advice from a qualified lawyer. Consult a qualified lawyer for advice about a real case.`,
      sources: [
        {
          title: stringifyValue(law.act),
          section: law.section ? `${stringifyValue(law.section)} — ${lawTitle}` : lawTitle,
          type: "Local legal reference dataset",
          sourceUrl: law.sourceUrl || "https://www.indiacode.nic.in/",
          verifiedAt: law.verifiedAt || "",
        },
      ],
    };
  }

  if (
    normalizedQuestion.includes("arrest") ||
    normalizedQuestion.includes("police") ||
    normalizedQuestion.includes("detained")
  ) {
    return {
      topic: "Police & Arrest",
      quickAnswer:
        "If you are arrested, you generally have the right to know the grounds of your arrest and to consult a lawyer of your choice. An arrested person must generally be produced before a magistrate within 24 hours, subject to applicable legal exceptions.",
      detailedAnswer:
        "Article 22 of the Constitution of India provides protections to a person who is arrested, including being informed of the grounds of arrest and the right to consult and be defended by a legal practitioner of their choice. This is general legal information and not a substitute for advice from a qualified lawyer. Consult a qualified lawyer for advice about a real case.",
      sources: [
        {
          title: "Constitution of India",
          section: "Article 22",
          type: "Constitutional provision",
        },
      ],
    };
  }

  return {
    topic: "Legal Information",
    quickAnswer:
      "I do not have enough verified source context to answer this safely.",
    detailedAnswer:
      "I do not have enough verified legal information in my current knowledge base to answer this reliably. Please consult a qualified legal professional or refer to the relevant official legal source. This is general legal information and not a substitute for advice from a qualified lawyer.",
    sources: [],
  };
}

function parseAnswer(text) {
  const cleanedText = text.trim().replace(/^```json\s*|\s*```$/g, "");
  const answer = JSON.parse(cleanedText);

  if (
    typeof answer.topic !== "string" ||
    typeof answer.quickAnswer !== "string" ||
    typeof answer.detailedAnswer !== "string" ||
    !Array.isArray(answer.sources)
  ) {
    throw new Error("Model returned an invalid legal answer format");
  }

  return answer;
}

function buildPrompt(question, relevantLaw) {
  return `You are LEGAL_BOT, an Indian legal information assistant. Your job is to explain legal information in plain language using the retrieved legal context. Do not act as a lawyer or give legal advice for a live case. Limit yourself to general legal information.

Rules:
1. Use only the supplied legal context.
2. Do not invent sections, acts, cases, dates, penalties, or procedures.
3. If the retrieved material is insufficient, say: "I do not have enough verified legal information in my current knowledge base to answer this reliably. Please consult a qualified legal professional or refer to the relevant official legal source."
4. Keep the answer general and cautious.
5. Prefer these source families when relevant: ${legalSources.join(", ")}.
6. Use the local reference dataset only as supporting information and clearly distinguish historical IPC references from current law where relevant.

Retrieved legal context:
${JSON.stringify(relevantLaw, null, 2)}

Return only valid JSON with exactly these keys and no extra text:
- topic: short category string
- quickAnswer: 2 to 4 sentence plain-language answer
- detailedAnswer: clear explanation in simple language, ending with "Consult a qualified lawyer for advice about a real case."
- sources: array of objects, each with title, section, type, and sourceUrl strings. Copy sourceUrl from the supplied legal context. Include only sources that genuinely support the answer.

Question: ${question}`;
}

async function askHuggingFace(token, model, prompt) {
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 900,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face request failed: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Hugging Face returned no answer");
  return parseAnswer(content);
}

function createMlService(config) {
  const geminiApiKey = typeof config === "string" ? config : config?.geminiApiKey;
  const huggingFaceToken = typeof config === "object" ? config?.huggingFaceToken : null;
  const huggingFaceModel = typeof config === "object" && config?.huggingFaceModel
    ? config.huggingFaceModel
    : HF_MODEL_NAME;
  const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
  const dataset = loadIpcDataset();

  async function answer(question) {
    const userQuestion = typeof question === "string" ? question.trim() : "";

    if (!userQuestion) {
      return {
        answer: fallbackAnswer("", []),
        model: "fallback",
        datasetMatches: 0,
      };
    }

    if (!isLegalQuestion(userQuestion)) {
      return {
        answer: refusalResponse(),
        model: "scope-filter",
        datasetMatches: 0,
      };
    }

    const relevantLaw = retrieveRelevantLaws(userQuestion, dataset);
    const prompt = buildPrompt(userQuestion, relevantLaw);

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
        });

        return {
          answer: parseAnswer(response.text),
          model: MODEL_NAME,
          datasetMatches: relevantLaw.length,
        };
      } catch (error) {
        console.error("GEMINI ERROR:", error.message);
      }
    }

    if (huggingFaceToken) {
      try {
        return {
          answer: await askHuggingFace(huggingFaceToken, huggingFaceModel, prompt),
          model: `huggingface:${huggingFaceModel}`,
          datasetMatches: relevantLaw.length,
        };
      } catch (error) {
        console.error("HUGGING FACE ERROR:", error.message);
      }
    }

    if (!ai && !huggingFaceToken) {
      return {
        answer: fallbackAnswer(userQuestion, relevantLaw),
        model: "fallback",
        datasetMatches: relevantLaw.length,
      };
    }

    return {
      answer: fallbackAnswer(userQuestion, relevantLaw),
      model: "fallback",
      datasetMatches: relevantLaw.length,
    };
  }

  async function test() {
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: "Reply with exactly: LEGAL_BOT AI CONNECTION SUCCESSFUL",
        });
        if (response.text.trim().includes("LEGAL_BOT AI CONNECTION SUCCESSFUL")) return true;
      } catch (error) {
        console.error("GEMINI TEST ERROR:", error.message);
      }
    }

    if (huggingFaceToken) {
      try {
        await askHuggingFace(huggingFaceToken, huggingFaceModel, "Reply with exactly: LEGAL_BOT AI CONNECTION SUCCESSFUL");
        return true;
      } catch (error) {
        console.error("HUGGING FACE TEST ERROR:", error.message);
      }
    }

    return false;
  }

  return { answer, test, model: ai ? MODEL_NAME : (huggingFaceToken ? `huggingface:${huggingFaceModel}` : "fallback") };
}

module.exports = { createMlService, MODEL_NAME };
