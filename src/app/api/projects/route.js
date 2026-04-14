import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET() {
  const sb = getSb()
  const { data: projects } = await sb.from('dashboard_projects').select('*').order('sort_order')
  const { data: tasks } = await sb.from('dashboard_tasks').select('*').order('sort_order')
  const result = (projects || []).map(p => ({
    ...p,
    tasks: (tasks || []).filter(t => t.project_id === p.id)
  }))
  return NextResponse.json(result)
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
