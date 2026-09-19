import { useEffect, useRef, useState } from "react";
import "./App.css";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const browserHostApiUrl = typeof window !== "undefined" && window.location.hostname
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : "";

const DEFAULT_API_BASE_URLS = [
  configuredApiUrl,
  browserHostApiUrl,
  "http://127.0.0.1:5000",
  "http://localhost:5000",
  "http://127.0.0.1:5001",
  "http://localhost:5001",
].filter((value, index, array) => value && array.indexOf(value) === index);

const resolveApiBaseUrl = async () => {
  for (const baseUrl of DEFAULT_API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { method: "GET", cache: "no-store" });
      if (response.ok) {
        return baseUrl;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return DEFAULT_API_BASE_URLS[0];
};

const topics = [
  { icon: "⚖️", name: "My Rights" },
  { icon: "👮", name: "Police & Arrest" },
  { icon: "💻", name: "Cyber Crime" },
  { icon: "🏠", name: "Property" },
  { icon: "🛒", name: "Consumer Rights" },
  { icon: "📄", name: "RTI" },
];

const defaultLawyers = [
  {
    id: 1,
    name: "Adv. Neha Sharma",
    city: "Delhi",
    specialization: "Domestic Violence & Family Law",
    experience: "8 years",
    phone: "+91 98100 11223",
    availability: "Mon-Sat",
    rating: "4.9/5",
  },
  {
    id: 2,
    name: "Adv. Arjun Mehta",
    city: "Mumbai",
    specialization: "Employment & Wage Disputes",
    experience: "10 years",
    phone: "+91 98220 44551",
    availability: "Tue-Sun",
    rating: "4.8/5",
  },
  {
    id: 3,
    name: "Adv. Sana Khan",
    city: "Bengaluru",
    specialization: "Cyber Crime & Online Fraud",
    experience: "6 years",
    phone: "+91 93411 68972",
    availability: "Mon-Fri",
    rating: "4.7/5",
  },
];

const translations = {
  en: {
    badge: "AI-POWERED • INDIAN LAW",
    title1: "Know your rights.",
    title2: "Understand the law.",
    heroText: "Ask questions about Indian laws and your legal rights. Get clear, simple answers backed by authoritative legal sources.",
    placeholder: "Ask anything about Indian law...",
    askButton: "Ask Legal_Bot",
    voiceStatus: "Listening... ask your legal question.",
    tryLabel: "Try:",
    topicLabel: "EXPLORE LEGAL TOPICS",
    trust1: "Source-backed answers",
    trust2: "Simple language",
    trust3: "Designed for everyone",
    howTitle: "HOW IT WORKS",
    aboutTitle: "ABOUT LEGAL_BOT",
    hireTitle: "HIRE A LOCAL LAWYER",
    hireText: "Find nearby legal support and record verified lawyer contact details for quick follow-up.",
    questionsTitle: "RECENT QUESTIONS",
    clearHistory: "Clear local history",
    newQuestion: "New Question",
    askAnother: "Ask another question →",
    hireIntro: "Add or update nearby lawyer information below.",
    lawyerForm: {
      name: "Lawyer name",
      city: "City / locality",
      specialization: "Practice area",
      experience: "Years of experience",
      phone: "Phone number",
      availability: "Availability",
      rating: "Rating",
      add: "Add lawyer details",
    },
    noLawyers: "No local lawyer details saved yet.",
    currentLanguage: "English",
  },
  hi: {
    badge: "एआई-सक्षम • भारतीय कानून",
    title1: "अपने अधिकार जानें.",
    title2: "कानून को समझें।",
    heroText: "भारतीय कानून और अपने कानूनी अधिकारों के बारे में सवाल पूछें। भरोसेमंद स्रोतों से सरल, साफ़ जवाब पाएं।",
    placeholder: "भारतीय कानून पर कुछ भी पूछें...",
    askButton: "Legal_Bot से पूछें",
    voiceStatus: "सुन रहा हूँ... अपना सवाल कहें।",
    tryLabel: "कोशिश करें:",
    topicLabel: "कानूनी विषय देखें",
    trust1: "स्रोत-आधारित जवाब",
    trust2: "सरल भाषा",
    trust3: "हर किसी के लिए",
    howTitle: "यह कैसे काम करता है",
    aboutTitle: "LEGAL_BOT के बारे में",
    hireTitle: "लोकल वकील लें",
    hireText: "पास के कानूनी सहायता और सत्यापित वकील संपर्क विवरण को जल्दी से देखें और जोड़ें।",
    questionsTitle: "हाल के सवाल",
    clearHistory: "लोकल हिस्ट्री साफ़ करें",
    newQuestion: "नया सवाल",
    askAnother: "एक और सवाल पूछें →",
    hireIntro: "नीचे अपने निकटस्थ वकील की जानकारी भरें या अपडेट करें।",
    lawyerForm: {
      name: "वकील का नाम",
      city: "शहर / इलाका",
      specialization: "प्रैक्टिस क्षेत्र",
      experience: "अनुभव (वर्ष)",
      phone: "फोन नंबर",
      availability: "उपलब्धता",
      rating: "रेटिंग",
      add: "वकील विवरण जोड़ें",
    },
    noLawyers: "अभी कोई लोकल वकील जानकारी नहीं है।",
    currentLanguage: "हिंदी",
  },
};

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [language, setLanguage] = useState("en");
  const speechRecognitionRef = useRef(null);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("legal_bot_history") || "[]");
    } catch {
      return [];
    }
  });
  const [lawyerForm, setLawyerForm] = useState({
    name: "",
    city: "",
    specialization: "",
    experience: "",
    phone: "",
    availability: "",
    rating: "",
  });
  const [lawyers, setLawyers] = useState(defaultLawyers);

  const t = translations[language];

  const loadLawyers = async () => {
    try {
      const apiBaseUrl = await resolveApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/lawyers`, { method: "GET", cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load lawyers");
      }
      const data = await response.json();
      if (Array.isArray(data.lawyers) && data.lawyers.length > 0) {
        setLawyers(data.lawyers);
      }
    } catch {
      setLawyers(defaultLawyers);
    }
  };

  useEffect(() => {
    localStorage.setItem("legal_bot_history", JSON.stringify(history.slice(0, 20)));
  }, [history]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLawyers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    speechRecognitionRef.current?.stop();
  }, []);

  const rememberAnswer = (entry) => {
    setHistory((previous) => [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, 20));
  };

  const getSpeechText = (entry) => {
    if (!entry) return "";

    if (language !== "hi") {
      return `${entry.topic}. ${entry.quickAnswer} ${entry.detailedAnswer}`;
    }

    const translatedTopic = {
      "Police & Arrest": "पुलिस और गिरफ्तारी",
      "Cyber Crime": "साइबर अपराध",
      "Consumer Rights": "उपभोक्ता अधिकार",
      "My Rights": "मेरा अधिकार",
      Property: "संपत्ति",
      RTI: "सूचना का अधिकार",
      "Legal Information": "कानूनी जानकारी",
      "Connection Error": "कनेक्शन त्रुटि",
      "Legal scope": "कानूनी सीमा",
    }[entry.topic] || entry.topic || "कानूनी जानकारी";

    const translateSpeechText = (text) => {
      if (!text) return "";
      const replacements = [
        ["rights", "अधिकार"],
        ["right", "अधिकार"],
        ["law", "कानून"],
        ["laws", "कानून"],
        ["legal", "कानूनी"],
        ["police", "पुलिस"],
        ["arrest", "गिरफ्तारी"],
        ["detained", "गिरफ्तार"],
        ["custody", "कस्टडी"],
        ["warrant", "वारंट"],
        ["crime", "अपराध"],
        ["fraud", "धोखाधड़ी"],
        ["harassment", "उत्पीड़न"],
        ["help", "सहायता"],
        ["consult", "सलाह लें"],
        ["lawyer", "वकील"],
        ["qualified", "योग्य"],
        ["information", "जानकारी"],
        ["procedure", "प्रक्रिया"],
        ["safety", "सुरक्षा"],
        ["protection", "सुरक्षा"],
        ["duty", "कर्तव्य"],
        ["duties", "कर्तव्य"],
        ["government", "सरकार"],
        ["domestic", "घरेलू"],
        ["violence", "हिंसा"],
        ["child", "बच्चा"],
        ["abuse", "दुरुपयोग"],
        ["compensation", "मुआवज़ा"],
        ["accident", "दुर्घटना"],
        ["marriage", "विवाह"],
        ["child abuse", "बाल शोषण"],
        ["This is general legal information", "यह सामान्य कानूनी जानकारी है"],
        ["not a substitute for advice from a qualified lawyer", "किसी योग्य वकील की सलाह का विकल्प नहीं है"],
        ["general legal information", "सामान्य कानूनी जानकारी"],
        ["legal information", "कानूनी जानकारी"],
        ["Please consult a qualified lawyer", "कृपया किसी योग्य वकील से सलाह लें"],
        ["This is general legal information and not a substitute for advice from a qualified lawyer", "यह सामान्य कानूनी जानकारी है और किसी योग्य वकील की सलाह का विकल्प नहीं है"],
      ];

      let finalText = text;
      replacements.forEach(([source, target]) => {
        finalText = finalText.replace(new RegExp(source, "gi"), target);
      });

      return finalText;
    };

    const quickText = translateSpeechText(entry.quickAnswer || "");
    const detailedText = translateSpeechText(entry.detailedAnswer || "");

    if (quickText) {
      return `नमस्ते। ${translatedTopic} पर जानकारी। ${quickText}. ${detailedText ? `${detailedText}.` : ""} कृपया किसी योग्य वकील से सलाह लें।`;
    }

    if (detailedText) {
      return `नमस्ते। ${translatedTopic} पर जानकारी। ${detailedText}. कृपया किसी योग्य वकील से सलाह लें।`;
    }

    return `नमस्ते। ${translatedTopic} पर सामान्य कानूनी सूचना। कृपया किसी योग्य वकील से सलाह लें।`;
  };

  const askQuestion = async (text = question) => {
    const finalQuestion = text.trim();

    if (!finalQuestion) return;

    setQuestion(finalQuestion);
    setLoading(true);
    setAnswer(null);

    try {
      const apiBaseUrl = await resolveApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: finalQuestion }),
      });

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      setAnswer({
        id: data.id,
        question: finalQuestion,
        topic: data.topic || "Legal Information",
        quickAnswer: data.quickAnswer,
        detailedAnswer: data.detailedAnswer,
        sources: data.sources || [],
      });
      rememberAnswer(data);
    } catch (error) {
      console.error("LEGAL_BOT ERROR:", error);

      setAnswer({
        topic: "Connection Error",
        quickAnswer: "Legal_Bot could not connect to its legal information server. Please make sure the backend is running.",
        detailedAnswer: "The website is working, but the backend could not be reached. Please check that the Legal_Bot server is running on localhost:5000.",
        sources: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const newQuestion = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setQuestion("");
    setAnswer(null);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openSection = (id) => {
    setAnswer(null);
    setLoading(false);
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }));
  };

  const toggleSpeech = () => {
    if (!answer || !("speechSynthesis" in window)) {
      window.alert(language === "hi" ? "इस ब्राउज़र में आवाज़ चलाना उपलब्ध नहीं है।" : "Voice playback is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const speechText = getSpeechText(answer);
    const utterance = new SpeechSynthesisUtterance(speechText);
    const speechVoices = window.speechSynthesis.getVoices();
    const preferredVoice = speechVoices.find((voice) => (
      voice.lang && voice.lang.toLowerCase().startsWith(language === "hi" ? "hi" : "en")
    ));

    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = language === "hi" ? 0.9 : 0.95;
    utterance.pitch = language === "hi" ? 1.05 : 1;
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const startVoiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus(language === "hi" ? "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।" : "Voice input is unavailable in this browser. Try Chrome or Edge, or type your question.");
      return;
    }

    speechRecognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        setQuestion(transcript);
        setVoiceStatus(language === "hi" ? `सुना: “${transcript}”` : `Heard: “${transcript}”`);
        askQuestion(transcript);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      const messages = {
        "not-allowed": language === "hi" ? "माइक्रोफोन की अनुमति ब्लॉक है। साइट को अनुमति दें और फिर कोशिश करें।" : "Microphone permission was blocked. Allow microphone access for this site and try again.",
        "audio-capture": language === "hi" ? "कोई माइक्रोफोन नहीं मिला।" : "No microphone was detected. Check the microphone connection and browser settings.",
        network: language === "hi" ? "इस ब्राउज़र में नेटवर्क आवश्यक है।" : "Voice recognition needs a network connection in this browser.",
        "no-speech": language === "hi" ? "कोई आवाज़ नहीं मिली। साफ़ बोलें।" : "No speech was detected. Try speaking clearly after pressing the microphone.",
      };
      setVoiceStatus(messages[event.error] || (language === "hi" ? "वॉइस इनपुट शुरू नहीं हुआ। टाइप करें।" : "Voice input could not start. You can type your question instead."));
    };
    recognition.onend = () => setIsListening(false);
    speechRecognitionRef.current = recognition;
    setVoiceStatus(t.voiceStatus);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceStatus(language === "hi" ? "माइक्रोफोन पहले से सक्रिय है। थोड़ी देर रुकें।" : "Microphone is already active. Wait a moment and try again.");
    }
  };

  const handleTopic = (topic) => {
    const topicQuestions = {
      "My Rights": language === "hi" ? "भारत के नागरिक के रूप में मेरे मूल अधिकार क्या हैं?" : "What are my basic rights as an Indian citizen?",
      "Police & Arrest": language === "hi" ? "अगर मुझे गिरफ्तार किया जाए तो मेरे अधिकार क्या हैं?" : "What are my rights if I am arrested?",
      "Cyber Crime": language === "hi" ? "अगर मुझे साइबर धोखाधड़ी का शिकार बनाया जाए तो क्या करना चाहिए?" : "What should I do if I become a victim of cyber fraud?",
      Property: language === "hi" ? "जमीन या संपत्ति विवाद में मेरे मौलिक अधिकार क्या हैं?" : "What are my basic rights in a property dispute?",
      "Consumer Rights": language === "hi" ? "अगर मुझे खराब सामान मिला है तो मैं क्या कर सकता हूँ?" : "What can I do if I receive a defective product?",
      RTI: language === "hi" ? "मैं सूचना का अधिकार (RTI) कैसे उपयोग कर सकता हूँ?" : "How can I use the Right to Information?",
    };

    const selectedQuestion = topicQuestions[topic];
    setQuestion(selectedQuestion);
    askQuestion(selectedQuestion);
  };

  const handleLawyerInput = (event) => {
    const { name, value } = event.target;
    setLawyerForm((previous) => ({ ...previous, [name]: value }));
  };

  const submitLawyer = async (event) => {
    event.preventDefault();
    const cleaned = {
      id: Date.now(),
      name: lawyerForm.name.trim(),
      city: lawyerForm.city.trim(),
      specialization: lawyerForm.specialization.trim(),
      experience: lawyerForm.experience.trim(),
      phone: lawyerForm.phone.trim(),
      availability: lawyerForm.availability.trim(),
      rating: lawyerForm.rating.trim() || "New",
    };

    if (!cleaned.name || !cleaned.city || !cleaned.specialization) {
      return;
    }

    try {
      const apiBaseUrl = await resolveApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/lawyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });

      if (!response.ok) {
        throw new Error("Unable to save lawyer");
      }

      const data = await response.json();
      if (Array.isArray(data.lawyers)) {
        setLawyers(data.lawyers);
      }
    } catch {
      setLawyers((previous) => [cleaned, ...previous]);
    }

    setLawyerForm({
      name: "",
      city: "",
      specialization: "",
      experience: "",
      phone: "",
      availability: "",
      rating: "",
    });
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo" onClick={newQuestion}>
          <div className="logo-mark">⚖</div>
          <div>
            <div className="logo-name">LEGAL<span>_BOT</span></div>
            <div className="logo-sub">INDIAN LEGAL ASSISTANT</div>
          </div>
        </div>

        <div className="nav-links">
          <button className="nav-link" onClick={() => openSection("how")}>{language === "hi" ? "यह कैसे काम करता है" : "How it works"}</button>
          <button className="nav-link" onClick={() => openSection("about")}>{language === "hi" ? "हमारे बारे में" : "About"}</button>
          <button className="nav-link" onClick={() => openSection("hire")}>{language === "hi" ? "वकील लें" : "Hire a Lawyer"}</button>
          <button className="language-toggle" onClick={() => setLanguage((current) => (current === "en" ? "hi" : "en"))}>
            {language === "en" ? "हिंदी" : "English"}
          </button>
          <button className="nav-button" onClick={newQuestion}>{t.newQuestion}</button>
        </div>
      </nav>

      {!answer && !loading && (
        <main className="hero">
          <div className="badge">
            <span className="status-dot"></span>
            {t.badge}
          </div>

          <h1>
            {t.title1}
            <br />
            <span>{t.title2}</span>
          </h1>

          <p className="hero-text">{t.heroText}</p>

          <div className="search-container">
            <div className="search-icon">⌕</div>
            <input
              type="text"
              placeholder={t.placeholder}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") askQuestion();
              }}
            />

            <button
              className="mic-button"
              title={language === "hi" ? "अपना सवाल बोलें" : "Speak your question"}
              aria-label={language === "hi" ? "अपना सवाल बोलें" : "Speak your question"}
              aria-pressed={isListening}
              onClick={startVoiceInput}
            >
              {isListening ? "●" : "🎙"}
            </button>

            <button className="ask-button" onClick={() => askQuestion()}>
              {t.askButton}
              <span>→</span>
            </button>
          </div>

          {voiceStatus && <div className="voice-status" role="status">{voiceStatus}</div>}

          <div className="search-hint">
            {t.tryLabel}
            <button onClick={() => askQuestion(language === "hi" ? "अगर मुझे गिरफ्तार किया जाए तो मेरे अधिकार क्या हैं?" : "What are my rights if I am arrested?")}>
              {language === "hi" ? "अगर मुझे गिरफ्तार किया जाए तो मेरे अधिकार क्या हैं?" : "What are my rights if I am arrested?"}
            </button>
          </div>

          <section className="topics">
            <div className="section-label">{t.topicLabel}</div>
            <div className="topic-grid">
              {topics.map((topic) => (
                <button className="topic-card" key={topic.name} onClick={() => handleTopic(topic.name)}>
                  <span className="topic-icon">{topic.icon}</span>
                  <span>{topic.name}</span>
                  <span className="arrow">↗</span>
                </button>
              ))}
            </div>
          </section>

          <section className="trust-section">
            <div className="trust-item"><span>✓</span>{t.trust1}</div>
            <div className="trust-item"><span>✓</span>{t.trust2}</div>
            <div className="trust-item"><span>✓</span>{t.trust3}</div>
          </section>

          <section id="how" className="info-section">
            <div className="section-label">{t.howTitle}</div>
            <div className="info-grid">
              <div>
                <span>01</span>
                <h3>{language === "hi" ? "सवाल पूछें" : "Ask a legal question"}</h3>
                <p>{language === "hi" ? "टेक्स्ट या वॉइस से भारतीय कानून, अधिकार, कर्तव्य या प्रक्रियाओं के बारे में पूछें।" : "Ask about Indian law, rights, duties, or legal procedure using text or voice."}</p>
              </div>
              <div>
                <span>02</span>
                <h3>{language === "hi" ? "प्रासंगिक कानून ढूंढें" : "Find relevant law"}</h3>
                <p>{language === "hi" ? "LEGAL_BOT अनावश्यक सवालों को फ़िल्टर करता है और रिकॉर्ड से सही कानूनी जानकारी निकालता है।" : "LEGAL_BOT filters unrelated questions and retrieves matching legal records from its knowledge base."}</p>
              </div>
              <div>
                <span>03</span>
                <h3>{language === "hi" ? "जवाब सुनें" : "Hear the answer"}</h3>
                <p>{language === "hi" ? "ब्राउज़र में पढ़ें या सुनें। वही जवाब ESP32 रोबोट से भी मांगा जा सकता है।" : "Read or listen in the browser. The same answer can also be requested by your ESP32 robot."}</p>
              </div>
            </div>
          </section>

          <section id="about" className="info-section about-section">
            <div className="section-label">{t.aboutTitle}</div>
            <p>{language === "hi" ? "LEGAL_BOT सामान्य जागरूकता के लिए भारतीय कानूनी सूचना सहायक है। यह कानूनी स्रोतों की जानकारी को सरल भाषा में समझाता है और कानूनी क्षेत्र से बाहर के सवालों को अस्वीकार कर देता है।" : "LEGAL_BOT is an Indian legal-information assistant for general awareness. It explains retrieved legal sources in simple language and refuses questions outside the legal domain."}</p>
            <p className="info-note">{language === "hi" ? "यह वकील नहीं है और वास्तविक मामले में पेशेवर सलाह का विकल्प नहीं है।" : "It is not a lawyer and does not replace professional advice for a real case."}</p>
          </section>

          <section id="hire" className="info-section hire-section">
            <div className="section-label">{t.hireTitle}</div>
            <div className="hire-wrap">
              <div className="hire-copy">
                <p>{t.hireText}</p>
              </div>
              <form className="lawyer-form" onSubmit={submitLawyer}>
                <div className="form-grid">
                  <label>
                    <span>{t.lawyerForm.name}</span>
                    <input name="name" value={lawyerForm.name} onChange={handleLawyerInput} placeholder={language === "hi" ? "वकील का नाम" : "Lawyer name"} required />
                  </label>
                  <label>
                    <span>{t.lawyerForm.city}</span>
                    <input name="city" value={lawyerForm.city} onChange={handleLawyerInput} placeholder={language === "hi" ? "शहर / इलाका" : "City / locality"} required />
                  </label>
                  <label>
                    <span>{t.lawyerForm.specialization}</span>
                    <input name="specialization" value={lawyerForm.specialization} onChange={handleLawyerInput} placeholder={language === "hi" ? "जैसे: घरेलू हिंसा, साइबर" : "e.g. family law, cyber"} required />
                  </label>
                  <label>
                    <span>{t.lawyerForm.experience}</span>
                    <input name="experience" value={lawyerForm.experience} onChange={handleLawyerInput} placeholder={language === "hi" ? "उदाहरण: 8 साल" : "Example: 8 years"} />
                  </label>
                  <label>
                    <span>{t.lawyerForm.phone}</span>
                    <input name="phone" value={lawyerForm.phone} onChange={handleLawyerInput} placeholder={language === "hi" ? "फोन नंबर" : "Phone number"} />
                  </label>
                  <label>
                    <span>{t.lawyerForm.availability}</span>
                    <input name="availability" value={lawyerForm.availability} onChange={handleLawyerInput} placeholder={language === "hi" ? "जैसे: Mon-Sat" : "e.g. Mon-Sat"} />
                  </label>
                  <label className="full-width">
                    <span>{t.lawyerForm.rating}</span>
                    <input name="rating" value={lawyerForm.rating} onChange={handleLawyerInput} placeholder={language === "hi" ? "जैसे: 4.9/5" : "e.g. 4.9/5"} />
                  </label>
                </div>
                <button className="submit-lawyer" type="submit">{t.lawyerForm.add}</button>
              </form>
            </div>
            <div className="lawyer-directory">
              {lawyers.length === 0 ? (
                <p className="empty-lawyers">{t.noLawyers}</p>
              ) : (
                lawyers.map((lawyer) => (
                  <div className="lawyer-card" key={lawyer.id}>
                    <div className="lawyer-header">
                      <div>
                        <strong>{lawyer.name}</strong>
                        <small>{lawyer.city}</small>
                      </div>
                      <span>{lawyer.rating}</span>
                    </div>
                    <p>{lawyer.specialization}</p>
                    <div className="lawyer-meta">
                      <span>{lawyer.experience}</span>
                      <span>{lawyer.availability}</span>
                    </div>
                    <a href={`tel:${lawyer.phone}`}>{lawyer.phone}</a>
                  </div>
                ))
              )}
            </div>
          </section>

          {history.length > 0 && (
            <section className="history-section">
              <div className="section-label">{t.questionsTitle}</div>
              <div className="history-list">
                {history.slice(0, 5).map((item) => (
                  <button className="history-item" key={item.id} onClick={() => askQuestion(item.question)}>
                    <span>{item.question}</span>
                    <small>{item.topic}</small>
                  </button>
                ))}
              </div>
              <button className="clear-history" onClick={() => setHistory([])}>{t.clearHistory}</button>
            </section>
          )}
        </main>
      )}

      {loading && (
        <main className="loading-screen">
          <div className="loading-orb">⚖</div>
          <div className="loading-title">{language === "hi" ? "LEGAL_BOT जानकारी जुटा रहा है..." : "Legal_Bot is researching..."}</div>
          <div className="loading-subtitle">{language === "hi" ? "प्रासंगिक कानूनी जानकारी بررسی कर रहा है" : "Checking relevant legal information"}</div>
          <div className="loading-bar"><div></div></div>
          <div className="loading-steps">
            <span className="active">{language === "hi" ? "✓ सवाल समझा जा रहा है" : "✓ Understanding your question"}</span>
            <span>{language === "hi" ? "◌ प्रासंगिक कानून ढूंढा जा रहा है" : "◌ Finding relevant law"}</span>
            <span>{language === "hi" ? "◌ सरल व्याख्या तैयार की जा रही है" : "◌ Preparing simple explanation"}</span>
          </div>
        </main>
      )}

      {answer && !loading && (
        <main className="answer-page">
          <div className="answer-header">
            <div>
              <div className="answer-label">{language === "hi" ? "आपका सवाल" : "YOUR QUESTION"}</div>
              <h2>{question}</h2>
            </div>
            <button className="new-question" onClick={newQuestion}>{t.newQuestion}</button>
          </div>

          <section className="quick-answer">
            <div className="quick-top">
              <div className="quick-title"><span className="spark">✦</span>{language === "hi" ? "तुरंत जवाब" : "QUICK ANSWER"}</div>
              <button className="listen-button" onClick={toggleSpeech}>{isSpeaking ? (language === "hi" ? "■ रोकें" : "■ Stop") : (language === "hi" ? "🔊 सुनें" : "🔊 Listen")}</button>
            </div>
            <p>{answer.quickAnswer}</p>
            <div className="robot-note">
              <span>🤖</span>
              {language === "hi" ? "यह जवाब Wi‑Fi ESP32 रोबोट से भी मंगाया जा सकता है और उसके स्पीकर में चलाया जा सकता है।" : "This answer can also be requested by the Wi‑Fi ESP32 robot and played through its speaker."}
            </div>
          </section>

          <div className="answer-grid">
            <section className="detail-card">
              <div className="card-heading"><span>01</span>{language === "hi" ? "विस्तृत समझ" : "DETAILED EXPLANATION"}</div>
              <p>{answer.detailedAnswer}</p>
            </section>

            <section className="sources-card">
              <div className="card-heading"><span>02</span>{language === "hi" ? "कानूनी स्रोत" : "LEGAL SOURCES"}</div>
              <p className="source-intro">{language === "hi" ? "इस जवाब को तैयार करने में उपयोग किए गए स्रोत" : "Information used to prepare this answer."}</p>

              {answer.sources.map((source, index) => (
                <div className="source-item" key={index}>
                  <div className="source-icon">📜</div>
                  <div className="source-content">
                    <strong>{source.title}</strong>
                    <span>{source.section}</span>
                    <small>{source.type}</small>
                  </div>
                  <a
                    className="source-link"
                    href={source.sourceUrl || "https://www.indiacode.nic.in/"}
                    target="_blank"
                    rel="noreferrer"
                    title={language === "hi" ? "अधिकारिक कानूनी स्रोत खोलें" : "Open official legal source"}
                    aria-label={`Open source for ${source.title}`}
                  >
                    ↗
                  </a>
                </div>
              ))}
            </section>
          </div>

          <div className="disclaimer-box">
            <span>⚠</span>
            <div>
              <strong>{language === "hi" ? "महत्वपूर्ण:" : "Important:"}</strong>
              {language === "hi" ? " Legal_Bot सामान्य कानूनी जानकारी केवल शिक्षा और जागरूकता के लिए देता है। यह वकील, न्यायाधीश, अदालत या वास्तविक कानूनी सलाह का विकल्प नहीं है।" : " Legal_Bot provides general legal information for educational and awareness purposes. It is not a lawyer, judge, court or substitute for professional legal advice."}
            </div>
          </div>

          <button className="bottom-question" onClick={newQuestion}>{t.askAnother}</button>
        </main>
      )}

      <footer>
        <div>© 2026 LEGAL_BOT</div>
        <div>{language === "hi" ? "कानूनी जागरूकता के लिए बनाया गया • भारत" : "Built for legal awareness • India"}</div>
      </footer>
    </div>
  );
}

export default App;
