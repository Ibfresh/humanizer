const TONES = {
  casual: "casual and conversational",
  school: "clear and natural, suitable for a school assignment",
  professional: "professional but warm",
  social: "punchy and energetic, suitable for social media or a community announcement"
};

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

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: "Upstream error" });
    const out = (data.content || []).map(b => b.text || "").join("").trim();
    return res.status(200).json({ text: out });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};
