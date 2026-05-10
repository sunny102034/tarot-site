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
    prompt = `你是塔羅師，請用繁體中文根據以下牌陣給出150字以內的運勢解讀，用段落敘述，不要條列：\n${cardList}`;
  } else {
    const cardList = cards.map((c, i) => `${cardLabels[i]}：${c.name}${c.rev ? '（逆位）' : ''}`).join('\n');
    prompt = `你是塔羅師，請用繁體中文根據以下問題與牌陣給出150字以內的解讀，用段落敘述，不要條列：\n問題：${question}\n牌陣：\n${cardList}`;
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
        generationConfig: { temperature: 0.9, maxOutputTokens: 400 }
      })
    });

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data).slice(0, 500));
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return res.status(200).json({ reading: text });
    
    console.error('No text in response:', JSON.stringify(data));
    return res.status(500).json({ error: 'No response from AI' });
  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
