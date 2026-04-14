import { NextResponse } from 'next/server'

export async function POST(req) {
  const { project_name, project_description, existing_tasks } = await req.json()

  const prompt = `You are helping Diana, an entrepreneur building AI-powered income streams.
Project: "${project_name}". Description: ${project_description || 'none'}.
Existing tasks: ${(existing_tasks || []).map(t => t.title + (t.done ? ' (done)' : '')).join(', ') || 'none'}.
Suggest 5-7 specific actionable tasks she is missing. Focus on practical next steps and automation.
Return ONLY a JSON array, no explanation:
[{"title":"...","note":"why this matters","hours_planned":2}]`

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
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return NextResponse.json({ tasks: JSON.parse(clean) })
  } catch {
    return NextResponse.json({ tasks: [] })
  }
}
