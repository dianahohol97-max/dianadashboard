import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const { project_name, project_description, existing_tasks } = await req.json()
  const prompt = 'You are helping Diana, an entrepreneur building AI-powered income streams. Project: "' + project_name + '". Description: ' + (project_description || 'none') + '. Existing tasks: ' + ((existing_tasks || []).map(t => t.title + (t.done ? ' (done)' : '')).join(', ') || 'none') + '. Suggest 5 specific actionable next steps she is missing. Return ONLY a JSON array with no explanation: [{"title":"...","note":"why this matters"}]'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await response.json()
  const text = data.content?.[0]?.text || '[]'
  try {
    const clean = text.replace(/```json
?/g, '').replace(/```
?/g, '').trim()
    return NextResponse.json({ tasks: JSON.parse(clean) })
  } catch {
    return NextResponse.json({ tasks: [] })
  }
}
