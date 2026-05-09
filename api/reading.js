export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, cards, mode, cardLabels } = req.body;
  if (!cards || cards.length === 0) return res.status(400).json({ error: 'Missing cards' });

  // Build prompt based on mode
  let prompt = '';
  if (mode === 'fortune') {
    // Fortune mode (daily/monthly/seasonal/yearly) - no question, just cards
    const cardList = cards.map((c, i) => `${cardLabels[i]}：${c.name}${c.rev ? '（逆位）' : ''}`).join('\n');
    prompt = `你是一位富有靈性與洞察力的塔羅師，風格溫柔而深刻，擅長用優美的繁體中文給予指引。

本次運勢牌陣如下：
${cardList}

請根據這些牌，給出一段有深度、有溫度的運勢解讀（約200-280字）。
解讀中請自然地提及各張牌的名稱與意涵，整合成一段流暢的段落敘述，最後給予一句簡短有力的建議作結。
不要使用條列式，用自然的段落書寫。`;
  } else {
    // Question mode
    const cardList = cards.map((c, i) => `${cardLabels[i]}：${c.name}${c.rev ? '（逆位）' : ''}`).join('\n');
    prompt = `你是一位富有靈性與洞察力的塔羅師，風格溫柔而深刻，擅長用優美的繁體中文給予指引。

用戶的問題是：「${question}」

本次抽到的三張牌是：
${cardList}

請針對這個問題與這三張牌，給出一段有深度、有溫度的塔羅解讀（約250-320字）。
解讀中請自然地提及每張牌的名稱，說明它在這個問題上的意涵，再整合成完整回應，最後給予一句有力的靈性建議作結。
不要用條列，用流暢的段落敘述。`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.content?.[0]?.text) {
      return res.status(200).json({ reading: data.content[0].text });
    }
    return res.status(500).json({ error: 'No response from AI' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
