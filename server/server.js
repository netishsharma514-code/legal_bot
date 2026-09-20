const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createMlService, MODEL_NAME } = require("./mlService");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const app = express();

/* ================================
   SERVER CONFIG
================================ */

const DEFAULT_PORT = Number(process.env.PORT || 5000);

const PORT_CANDIDATES = Array.from(
  { length: 10 },
  (_, index) => DEFAULT_PORT + index
);

const HOST = "0.0.0.0";

const NETWORK_IP = process.env.NETWORK_IP || Object.values(os.networkInterfaces())
  .flat()
  .find((address) => address && address.family === "IPv4" && !address.internal)?.address
  || "127.0.0.1";

const historyFile = path.join(
  __dirname,
  "data",
  "history.json"
);

const lawyersFile = path.join(
  __dirname,
  "data",
  "lawyers.json"
);

/* ================================
   ML SERVICE
================================ */

const mlService = createMlService({
  geminiApiKey: process.env.GEMINI_API_KEY,

  huggingFaceToken:
    process.env.HF_API_TOKEN ||
    process.env.HUGGINGFACE_API_TOKEN,

  huggingFaceModel:
    process.env.HF_MODEL,
});

/* ================================
   MIDDLEWARE
================================ */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// In-memory variable to store device data/status
let latestDeviceStatus = "STANDBY";

/* ================================
   HISTORY FUNCTIONS
================================ */

const readHistory = () => {
  try {
    return JSON.parse(
      fs.readFileSync(historyFile, "utf8")
    );
  } catch {
    return [];
  }
};

const saveHistory = (entry) => {
  fs.mkdirSync(
    path.dirname(historyFile),
    {
      recursive: true,
    }
  );

  const history = [
    entry,
    ...readHistory(),
  ].slice(0, 100);

  fs.writeFileSync(
    historyFile,
    JSON.stringify(history, null, 2)
  );
};

const readLawyers = () => {
  try {
    const saved = JSON.parse(
      fs.readFileSync(lawyersFile, "utf8")
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const writeLawyers = (lawyers) => {
  fs.mkdirSync(
    path.dirname(lawyersFile),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    lawyersFile,
    JSON.stringify(lawyers, null, 2)
  );
};

/* ================================
   BASIC ROUTES
================================ */

app.get("/", (req, res) => {
  res.json({
    message: "LEGAL_BOT backend is running!",
    status: "online",
  });
});

/* ================================
   HEALTH CHECK
================================ */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "LEGAL_BOT API",
  });
});

/* ================================
   DEVICE STATUS
================================ */

app.post("/api/sensor-data", (req, res) => {
  const data = req.body;
  console.log("Received data from ESP32:", data);

  res.json({
    status: "success",
    message: "Data received",
  });
});

app.get("/api/get-status", (req, res) => {
  res.json({
    command: latestDeviceStatus,
  });
});

/* ================================
   HISTORY
================================ */

app.get("/api/history", (req, res) => {
  res.json({
    success: true,
    history: readHistory(),
  });
});

app.get("/api/lawyers", (req, res) => {
  res.json({
    success: true,
    lawyers: readLawyers(),
  });
});

app.post("/api/lawyers", (req, res) => {
  try {
    const rawLawyer = req.body || {};
    const lawyer = {
      id: rawLawyer.id || Date.now(),
      name: String(rawLawyer.name || "").trim(),
      city: String(rawLawyer.city || "").trim(),
      specialization: String(rawLawyer.specialization || "").trim(),
      experience: String(rawLawyer.experience || "").trim(),
      phone: String(rawLawyer.phone || "").trim(),
      availability: String(rawLawyer.availability || "").trim(),
      rating: String(rawLawyer.rating || "New").trim() || "New",
    };

    if (!lawyer.name || !lawyer.city || !lawyer.specialization) {
      return res.status(400).json({
        success: false,
        error: "Name, city, and specialization are required.",
      });
    }

    const lawyers = [lawyer, ...readLawyers()].slice(0, 50);
    writeLawyers(lawyers);

    return res.status(201).json({
      success: true,
      lawyers,
    });
  } catch (error) {
    console.error("LAWYERS SAVE ERROR:", error.message);
    return res.status(500).json({
      success: false,
      error: "Unable to save lawyer details.",
    });
  }
});

/* ================================
   ASK API
================================ */

app.post("/api/ask", async (req, res) => {
  try {
    const question =
      typeof req.body.question === "string"
        ? req.body.question.trim()
        : "";
      const language = req.body.language === "hi" ? "hi" : "en";

    if (!question) {
      return res.status(400).json({
        error: "Please enter a question.",
      });
    }

    const modelResult =
      await mlService.answer(question, language);

    const answer = modelResult.answer;

    const entry = {
      id: Date.now().toString(),

      question,

      language,

      ...answer,

      model: modelResult.model,

      datasetMatches:
        modelResult.datasetMatches,

      createdAt:
        new Date().toISOString(),
    };

    try {
      saveHistory(entry);
    } catch (error) {
      console.error(
        "HISTORY SAVE ERROR:",
        error.message
      );
    }

    res.json({
      success: true,

      ...entry,

      robotAnswer:
        answer.quickAnswer,
    });

  } catch (error) {
    console.error(
      "ASK API ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Internal server error.",
    });
  }
});

/* ================================
   ROBOT ASK API
================================ */

app.post(
  "/api/robot/ask",
  async (req, res) => {
    try {
      const question =
        typeof req.body.question === "string"
          ? req.body.question.trim()
          : "";
          const language = req.body.language === "hi" ? "hi" : "en";

      if (!question) {
        return res.status(400).json({
          error:
            "Please provide a legal question.",
        });
      }

      const modelResult =
        await mlService.answer(question, language);

      const answer =
        modelResult.answer;

      const speechText =
        answer.topic === "Legal scope"
          ? answer.quickAnswer
          : `${answer.topic}. ${answer.quickAnswer}`;

      res.json({
        success: true,

        topic: answer.topic,

        speechText,

        quickAnswer:
          answer.quickAnswer,

        detailedAnswer:
          answer.detailedAnswer,

        sources:
          answer.sources,

        model:
          modelResult.model,

        datasetMatches:
          modelResult.datasetMatches,
      });

    } catch (error) {
      console.error(
        "ROBOT ASK ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Internal server error.",
      });
    }
  }
);

/* ================================
   AI CONNECTION TEST
================================ */

app.get(
  "/api/ai-test",
  async (req, res) => {
    try {
      const connected =
        await mlService.test();

      res.status(
        connected ? 200 : 503
      ).json({
        success: connected,

        model: MODEL_NAME,

        message: connected
          ? "LEGAL_BOT AI CONNECTION SUCCESSFUL"
          : "ML service is unavailable; fallback answers remain enabled",
      });

    } catch (error) {
      console.error(
        "AI TEST ERROR:",
        error
      );

      res.status(503).json({
        success: false,
        model: MODEL_NAME,
        message:
          "ML service is unavailable.",
      });
    }
  }
);

/* ================================
   START SERVER
================================ */

const startServer = (
  portIndex = 0
) => {

  const port =
    PORT_CANDIDATES[portIndex];

  const server = app.listen(
    port,
    HOST,
    () => {

      console.log("");
      console.log(
        "================================="
      );
      console.log(
        "       LEGAL_BOT BACKEND"
      );
      console.log(
        "================================="
      );

      console.log(
        `Local:   http://localhost:${port}`
      );

      console.log(
        `Network: http://${NETWORK_IP}:${port}`
      );

      console.log(
        `Health:  http://${NETWORK_IP}:${port}/api/health`
      );

      console.log(
        `Ask API: http://${NETWORK_IP}:${port}/api/ask`
      );

      console.log(
        "================================="
      );

      console.log("");
    }
  );

  server.on(
    "error",
    (error) => {

      if (
        error.code === "EADDRINUSE" &&
        portIndex <
          PORT_CANDIDATES.length - 1
      ) {

        console.warn(
          `Port ${port} is busy. Trying ${
            PORT_CANDIDATES[
              portIndex + 1
            ]
          } instead...`
        );

        startServer(
          portIndex + 1
        );

        return;
      }

      if (
        error.code === "EADDRINUSE"
      ) {

        console.error(
          "No free backend port was available."
        );

      } else {

        console.error(
          "Backend server error:",
          error.message
        );
      }

      process.exitCode = 1;
    }
  );
};

startServer();