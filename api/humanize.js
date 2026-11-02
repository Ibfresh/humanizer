const TONES = {
  casual: "casual and conversational",
  school: "clear and natural, suitable for a school assignment",
  professional: "professional but warm",
  social: "punchy and energetic, suitable for social media or a community announcement"
};

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { text, tone } = req.body || {};
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "No text" });
  if (text.length > 6000) return res.status(400).json({ error: "Text too long (max 6000 characters)" });
  const toneText = TONES[tone] || TONES.school;

  const prompt =
    "Rewrite the text below so it reads like a real person wrote it. Tone: " + toneText + ".\n" +
    "Rules: keep every fact, name and claim exactly the same; do not add new information; use plain everyday words; " +
    "vary sentence length and rhythm; avoid stock AI phrases (delve, tapestry, crucial, moreover, furthermore, " +
    "in conclusion, it is important to note, landscape); avoid em dashes; keep roughly the same length and paragraph " +
    "structure. Reply with only the rewritten text, no intro or notes.\n\nTEXT:\n" + text;

  let busy = false;
  for (const model of MODELS) {
    try {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      if (r.status === 429) { busy = true; continue; }
      if (!r.ok) continue;
      const data = await r.json();
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const out = parts.map(p => p.text || "").join("").trim();
      if (out) return res.status(200).json({ text: out });
    } catch (e) {}
  }
  if (busy) return res.status(429).json({ error: "Busy right now, try again in a minute" });
  return res.status(502).json({ error: "Something went wrong, try again" });
};
