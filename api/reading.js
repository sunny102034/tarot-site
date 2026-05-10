export default async function handler(req, res) {
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
    prompt = `你是一位富有靈性與洞察力的塔羅師，風格溫柔而深刻，擅長用優美的繁體中文給予指引。\n\n本次運勢牌陣如下：\n${cardList}\n\n請根據這些牌，給出一段有深度、有溫度的運勢解讀（約200-280字）。解讀中請自然地提及各張牌的名稱與意涵，整合成一段流暢的段落敘述，最後給予一句簡短有力的建議作結。不要使用條列式，用自然的段落書寫。`;
  } else {
    const cardList = cards.map((c, i) => `${cardLabels[i]}：${c.name}${c.rev ? '（逆位）' : ''}`).join('\n');
    prompt = `你是一位富有靈性與洞察力的塔羅師，風格溫柔而深刻，擅長用優美的繁體中文給予指引。\n\n用戶的問題是：「${question}」\n\n本次抽到的三張牌是：\n${cardList}\n\n請針對這個問題與這三張牌，給出一段有深度、有溫度的塔羅解讀（約250-320字）。解讀中請自然地提及每張牌的名稱，說明它在這個問題上的意涵，再整合成完整回應，最後給予一句有力的靈性建議作結。不要用條列，用流暢的段落敘述。`;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-8b',
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
        })
      });
      if (!response.ok) continue;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ reading: text });
    } catch { continue; }
  }

  return res.status(500).json({ error: 'No response from AI' });
}
