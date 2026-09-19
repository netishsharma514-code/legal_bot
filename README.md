# LEGAL_BOT

LEGAL_BOT is an Indian legal-information assistant. It filters for legal questions, retrieves matching records from the local legal dataset, and optionally uses an AI provider to explain those records in plain language. Unrelated questions are refused.

## Run locally

```bash
npm install
npm --prefix server install
cp .env.example .env
cp server/.env.example server/.env
npm start
npm run dev
```

Set the runtime environment values in the local `.env` files before starting the app. Provider credentials are optional because the local retrieval fallback remains available. Never commit `.env` files or expose provider keys in frontend code.

The backend uses port `5000` by default and tries the next ports if it is busy. The frontend probes the configured backend URL and local fallback ports.

## Environment files

Root `.env.example`:

```env
VITE_API_URL=http://localhost:5000
GEMINI_API_KEY=replace_with_a_gemini_api_key
HF_API_TOKEN=replace_with_a_huggingface_token
HF_MODEL=Qwen/Qwen2.5-7B-Instruct
```

Server `server/.env.example`:

```env
PORT=5000
GEMINI_API_KEY=replace_with_a_gemini_api_key
HF_API_TOKEN=replace_with_a_huggingface_token
HF_MODEL=Qwen/Qwen2.5-7B-Instruct
NETWORK_IP=127.0.0.1
```

## Verification

With the backend running, execute:

```bash
node server/verifyLegalFlow.js
```

This covers legal retrieval, unrelated-question refusal, source presence, empty input, malformed input, and the expanded domestic-violence, POCSO, workplace, accident, divorce, and wage topics.

## Sources and safety

Records include act/section labels, summaries, status notes, verification dates, and official India Code links. LEGAL_BOT provides general legal information, not case-specific legal advice. Verify current law against the official text and consult a qualified legal professional for a live matter.

## Vite reference

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
