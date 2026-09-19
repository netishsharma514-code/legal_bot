const LEGAL_KEYWORDS = [
  "law", "laws", "legal", "rights", "right", "constitution", "constitutional",
  "lawyer", "advocate", "attorney", "legal advice", "legal aid", "law firm",
  "वकील", "कानूनी", "अधिकार", "व्यवस्था", "कानून", "पुलिस", "गिरफ्तारी", "गिरफ्तार", "हिरासत",
  "police", "arrest", "detention", "custody", "crime", "criminal", "offence",
  "offense", "complaint", "consumer", "rti", "cyber", "fraud", "property",
  "women", "woman", "harassment", "harass", "harassing", "domestic", "family", "marriage", "court", "magistrate",
  "procedure", "remedy", "duty", "duties", "bns", "bnss", "bsa", "ipc",
  "act", "section", "article", "case", "appeal", "notice", "complain", "safety",
  "abuse", "violence", "domestic violence", "protection", "legal remedy", "legal help",
  "sexual", "molestation", "dowry", "threat", "stalking", "bullying", "complainant", "victim",
  "public authority", "information request", "safe", "security", "grievance", "misuse", "illegal",
  "child", "minor", "pocso", "workplace", "office", "employee", "employer", "salary", "wages",
  "labour", "labor", "divorce", "maintenance", "matrimonial", "accident", "insurance", "compensation",
  "vehicle", "driving", "license", "licence"
];

const LEGAL_SYNONYMS = {
  arrest: ["arrest", "arrested", "arresting", "warrant", "detain", "detained", "detention", "custody", "taken into custody", "police custody"],
  police: ["police", "cop", "cops", "officer", "investigation", "station"],
  rights: ["rights", "legal rights", "constitutional rights", "fundamental rights", "entitled"],
  women: ["women", "woman", "girl", "harassment", "harass", "harassing", "domestic violence", "dowry", "sexual", "molestation", "abuse", "violence", "victim"],
  cyber: ["cyber", "internet", "online", "fraud", "phishing", "email scam", "digital", "banking scam", "identity theft", "scam", "transaction fraud"],
  consumer: ["consumer", "refund", "defective", "service", "product", "complaint", "seller", "merchant", "grievance", "deficiency"],
  property: ["property", "land", "house", "title", "sale deed", "registration", "ownership", "possession", "document"],
  rti: ["rti", "right to information", "information request", "public authority", "government records", "transparency", "records"],
  crime: ["crime", "criminal", "offence", "offense", "punishment", "penalty", "murder", "theft", "rape", "illegal", "misuse"],
  court: ["court", "magistrate", "judge", "appeal", "trial", "proceedings", "legal procedure", "case", "complaint"],
  lawyer: ["lawyer", "advocate", "attorney", "counsel", "legal advisor", "legal help", "hire lawyer", "local lawyer", "law firm", "consultation", "वकील", "अधिवक्ता"],
  child: ["child", "minor", "pocso", "child abuse", "child safety", "exploitation"],
  workplace: ["workplace", "office", "employee", "employer", "internal committee", "workplace complaint"],
  family: ["divorce", "marriage", "matrimonial", "maintenance", "husband", "wife", "separation", "child custody"],
  employment: ["salary", "wages", "minimum wage", "unpaid salary", "labour", "labor", "employee", "employer"],
  accident: ["accident", "road accident", "motor vehicle", "insurance", "compensation", "driving", "vehicle"]
};

const STOP_WORDS = new Set([
  "what", "when", "where", "why", "how", "who", "which", "the", "this", "that",
  "these", "those", "about", "from", "with", "into", "your", "mine", "their", "them",
  "have", "been", "will", "can", "could", "should", "must", "i", "me", "my", "we",
  "our", "you", "are", "is", "am", "do", "does", "did", "it", "a", "an", "of", "for",
  "and", "or", "to", "in", "on", "at", "by", "if", "then", "not", "any", "some", "after",
  "before", "without", "please", "help", "tell", "give"
]);

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

function normalizeText(value) {
  return stringifyValue(value).trim();
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyValue(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return [value];
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .flatMap((entry) => normalizeKeywords(entry))
      .filter(Boolean);
  }

  return [];
}

function normalizeQuestion(question = "") {
  return String(question || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTokens(question) {
  return normalizeQuestion(question)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function hasLegalSignal(question) {
  const normalized = normalizeQuestion(question);
  const tokens = getTokens(question);

  if (!normalized) {
    return false;
  }

  const matchedLegalWords = LEGAL_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  const matchedSynonyms = Object.entries(LEGAL_SYNONYMS).some(([topic, words]) =>
    words.some((word) => normalized.includes(word) || normalized.includes(topic))
  );

  // Strong legal-signal examples based on Indian legal categories
  const hasLegalContext = tokens.some((token) =>
    ["arrest", "police", "rights", "law", "criminal", "court", "consumer", "complaint",
      "property", "harassment", "rti", "cyber", "women", "detention", "fraud", "act",
      "section", "article", "magistrate", "constitutional", "offence", "offense", "safety",
      "protection", "abuse", "violence", "molestation", "dowry", "sexual", "stalking", "threat",
      "remedy", "legal", "victim", "grievance", "misuse", "public authority", "refund", "title",
      "registration", "security", "illegal", "child", "minor", "pocso", "workplace", "office", "employee",
      "employer", "salary", "wages", "labour", "labor", "divorce", "maintenance", "matrimonial", "accident",
      "insurance", "compensation", "vehicle", "driving", "license", "licence"].includes(token)
  );

  return matchedLegalWords.length > 0 || matchedSynonyms || hasLegalContext;
}

function scoreEntry(question, entry) {
  const tokens = getTokens(question);
  const normalizedEntry = {
    act: normalizeText(entry.act),
    section: normalizeText(entry.section),
    title: normalizeText(entry.title),
    summary: normalizeText(entry.summary),
    text: normalizeText(entry.text),
    keywords: normalizeKeywords(entry.keywords),
  };
  const searchableText = [
    normalizedEntry.act,
    normalizedEntry.section,
    normalizedEntry.title,
    normalizedEntry.summary,
    normalizedEntry.text,
    ...normalizedEntry.keywords,
  ].join(" ").toLowerCase();

  let score = 0;
  const titleLower = normalizedEntry.title.toLowerCase();
  const actLower = normalizedEntry.act.toLowerCase();
  const sectionLower = normalizedEntry.section.toLowerCase();

  tokens.forEach((token) => {
    if (!token) return;
    if (searchableText.includes(token)) score += 2;
    if (titleLower.includes(token)) score += 3;
    if (actLower.includes(token)) score += 2;
    if (sectionLower.includes(token)) score += 2;
    if (normalizedEntry.keywords.some((keyword) => keyword.toLowerCase().includes(token))) score += 3;
  });

  // Boost when question and record share legal topic words
  const questionLower = normalizeQuestion(question);
  const arrestQuestion = /\b(arrest|arrested|arresting|warrant|detain|detained|detention|custody)\b/.test(questionLower);
  if (arrestQuestion && /\b(arrest|detention|custody|warrant|magistrate)\b/i.test(searchableText)) {
    score += 100;
  }

  Object.entries(LEGAL_SYNONYMS).forEach(([topic, words]) => {
    if (words.some((word) => questionLower.includes(word))) {
      if (searchableText.includes(topic) || words.some((word) => searchableText.includes(word))) {
        score += topic === "arrest" ? 20 : 5;
      }
    }
  });

  return score;
}

function retrieveRelevantLaws(question, dataset = []) {
  const normalized = normalizeQuestion(question);
  if (!normalized || !Array.isArray(dataset) || dataset.length === 0) {
    return [];
  }

  const normalizedQuestion = normalizeQuestion(question);
  const arrestQuestion = /\b(arrest|arrested|arresting|warrant|detain|detained|detention|custody)\b/.test(normalizedQuestion);
  const arrestTerms = /\b(arrest|arrested|arresting|warrant|detain|detained|detention)\b/.test(normalizedQuestion)
    ? /\b(arrest|detention|warrant|magistrate)\b/i
    : /\b(custody|arrest|detention|warrant|magistrate)\b/i;
  const scoredEntries = dataset
    .map((entry) => {
      const searchableText = [
        normalizeText(entry.act),
        normalizeText(entry.section),
        normalizeText(entry.title),
        normalizeText(entry.summary),
        normalizeText(entry.text),
        ...normalizeKeywords(entry.keywords),
      ].join(" ");
      const directArrestMatch = arrestQuestion && arrestTerms.test(searchableText);
      return { entry, score: scoreEntry(question, entry), priority: directArrestMatch ? 1000 : 0 };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => (second.priority + second.score) - (first.priority + first.score))
    .slice(0, 5)
    .map((item) => item.entry);

  return scoredEntries;
}

function refusalResponse(language = "en") {
  if (language === "hi") {
    return {
      topic: "कानूनी सीमा",
      quickAnswer: "मैं केवल भारतीय कानून, कानूनी अधिकारों, कर्तव्यों और कानूनी प्रक्रियाओं से जुड़े प्रश्नों में सहायता कर सकता हूँ। कृपया अपने कानूनी अधिकार या कानून से संबंधित प्रश्न पूछें।",
      detailedAnswer: "यह प्रश्न कानूनी क्षेत्र से बाहर है। LEGAL_BOT भारतीय कानूनी अधिकारों, कर्तव्यों, सुरक्षा, प्रक्रियाओं और कानून से जुड़े विषयों के बारे में सामान्य जानकारी देने के लिए बनाया गया है।",
      sources: [],
    };
  }

  return {
    topic: "Legal scope",
    quickAnswer:
      "I’m LEGAL_BOT. I can only help with Indian laws, legal rights, duties, and legal procedures. Please ask me something related to your legal rights or the law.",
    detailedAnswer:
      "This question is outside the legal domain. LEGAL_BOT is designed to answer questions about Indian legal rights, duties, protections, procedures, and law-related issues only.",
    sources: [],
  };
}

module.exports = {
  LEGAL_KEYWORDS,
  isLegalQuestion: hasLegalSignal,
  retrieveRelevantLaws,
  refusalResponse,
};
