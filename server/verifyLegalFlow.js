const apiUrl = process.env.LEGAL_BOT_URL || "http://127.0.0.1:5000/api/ask";

const cases = [
  { question: "Can police arrest me without a warrant?", legal: true },
  { question: "What is the capital of India?", legal: false },
  { question: "Someone is harassing my sister. What can she do?", legal: true },
  { question: "How do I file an RTI request?", legal: true },
  { question: "What protection is available for domestic violence?", legal: true },
  { question: "My office has sexual harassment, what is the complaint process?", legal: true },
  { question: "How can I report child sexual abuse?", legal: true },
  { question: "Who pays compensation after a road accident?", legal: true },
  { question: "How does divorce work?", legal: true },
  { question: "My employer has not paid my salary?", legal: true },
  { question: "What is the weather today?", legal: false },
];

async function ask(body) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { status: response.status, data: await response.json() };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  for (const testCase of cases) {
    const result = await ask({ question: testCase.question });
    const { status, data } = result;

    assert(status === 200, `${testCase.question}: expected 200, got ${status}`);
    assert(data.success === true, `${testCase.question}: response was not successful`);

    if (testCase.legal) {
      assert(data.datasetMatches > 0, `${testCase.question}: no legal records retrieved`);
      assert(data.sources?.length > 0, `${testCase.question}: no sources returned`);
      assert(data.sources[0].title, `${testCase.question}: source title missing`);
    } else {
      assert(data.topic === "Legal scope", `${testCase.question}: non-legal question was not refused`);
      assert(data.sources?.length === 0, `${testCase.question}: refusal returned sources`);
    }

    console.log(`PASS ${testCase.legal ? "LEGAL" : "REFUSED"}: ${testCase.question}`);
  }

  const empty = await ask({ question: "" });
  assert(empty.status === 400, `empty question: expected 400, got ${empty.status}`);
  console.log("PASS INVALID: empty question returns 400");

  const malformed = await ask({ question: 42 });
  assert(malformed.status === 400, `non-string question: expected 400, got ${malformed.status}`);
  console.log("PASS INVALID: non-string question returns 400");

  console.log(`ALL TESTS PASSED: ${cases.length + 2} checks against ${apiUrl}`);
})().catch((error) => {
  console.error("VERIFICATION FAILED:", error.message);
  process.exitCode = 1;
});
