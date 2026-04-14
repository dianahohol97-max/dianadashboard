import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(req) {
  const sb = getSb()
  const body = await req.json()
  const { data } = await sb.from('dashboard_tasks').insert({
    project_id: body.project_id,
    title: body.title,
    note: body.note || null,
    ai_generated: body.ai_generated || false,
    sort_order: body.sort_order || 999
  }).select().single()
  return NextResponse.json(data)
}

export async function PATCH(req) {
  const sb = getSb()
  const body = await req.json()
  const { id, ...updates } = body
  const { data } = await sb.from('dashboard_tasks').update(updates).eq('id', id).select().single()
  return NextResponse.json(data)
}

export async function DELETE(req) {
  const sb = getSb()
  const { searchParams } = new URL(req.url)
  await sb.from('dashboard_tasks').delete().eq('id', searchParams.get('id'))
  return NextResponse.json({ success: true })
}
