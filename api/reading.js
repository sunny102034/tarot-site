module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, cards, mode, cardLabels } = req.body;
  if (!cards || cards.length === 0) return res.status(400).json({ error: 'Missing cards' });

  let prompt = '';
  if (mode === 'fortune') {
    const cardList = cards.map((c, i) => `${cardLabels[i]}：${c.name}${c.rev ? '（逆位）' : ''}`).join('\n');
    prompt = `你是一位經驗豐富的塔羅師，請用繁體中文針對以下牌陣給出具體的運勢解讀。

牌陣：
${cardList}

解讀要求：
- 針對每張牌的具體象徵意義說明，逆位要特別指出其含義的轉變
- 說明這幾張牌組合在一起對當事人的具體影響
- 給出實際可行的建議，而非泛泛而談
- 避免模糊、任何人都能套用的說法
- 字數約200字，用段落書寫，不要條列`;
  } else {
    const cardList = cards.map((c, i) => `${cardLabels[i]}：${c.name}${c.rev ? '（逆位）' : ''}`).join('\n');
    prompt = `你是一位經驗豐富的塔羅師，請用繁體中文針對以下問題與牌陣給出具體解讀。

問題：「${question}」

牌陣：
${cardList}

解讀要求：
- 直接針對「${question}」這個具體問題來解讀，不要答非所問
- 針對每張牌在這個問題上的具體意涵說明，逆位要特別指出其影響
- 說明三張牌的整體訊息對這個問題的回應
- 最後給出針對這個問題的具體建議或行動方向
- 避免模糊、任何人都能套用的巴納姆效應式說法
- 字數約220字，用段落書寫，不要條列`;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 2500 }
      })
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return res.status(200).json({ reading: text });
    console.error('Gemini error:', JSON.stringify(data));
    return res.status(500).json({ error: 'No response from AI' });
  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
