import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
export async function GET() {
  try {
    const sb = getSb()
    const { data: projects, error: pe } = await sb.from('dashboard_projects').select('*').order('sort_order')
    if (pe) return NextResponse.json({ error: pe.message }, { status: 500 })
    const { data: tasks, error: te } = await sb.from('dashboard_tasks').select('*').order('sort_order')
    if (te) return NextResponse.json({ error: te.message }, { status: 500 })
    const result = (projects || []).map(p => ({
      ...p,
      tasks: (tasks || []).filter(t => t.project_id === p.id)
    }))
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
export async function POST(req) {
  const sb = getSb()
  const body = await req.json()
  const { data } = await sb.from('dashboard_projects').insert({
    name: body.name, description: body.desc || null,
    color: body.color || '#4C7BC9', deadline: body.deadline || null,
    sort_order: body.sort_order || 999
  }).select().single()
  return NextResponse.json(data)
}
export async function PATCH(req) {
  const sb = getSb()
  const body = await req.json()
  const { id, ...updates } = body
  const { data } = await sb.from('dashboard_projects').update(updates).eq('id', id).select().single()
  return NextResponse.json(data)
}
export async function DELETE(req) {
  const sb = getSb()
  const { searchParams } = new URL(req.url)
  await sb.from('dashboard_projects').delete().eq('id', searchParams.get('id'))
  return NextResponse.json({ success: true })
}
