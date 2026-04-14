import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const { project_name, project_description, existing_tasks } = await req.json()
  const existingList = (existing_tasks || []).map(t => t.title + (t.done ? ' (done)' : '')).join(', ') || 'none'
  const prompt = 'You are helping Diana, an entrepreneur. Project: "' + project_name + '". Existing tasks: ' + existingList + '. Suggest 5 specific actionable next steps. Return ONLY a JSON array: [{"title":"...","note":"..."}]'
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
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']') + 1
    const clean = start >= 0 ? text.slice(start, end) : '[]'
    return NextResponse.json({ tasks: JSON.parse(clean) })
  } catch {
    return NextResponse.json({ tasks: [] })
  }
}
