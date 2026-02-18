import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ConvertSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  project_type: z.enum([
    'scattered_lot',
    'lot_development',
    'community_development',
    'lot_purchase',
    'other',
  ]),
  owner_entity_id: z.string().uuid().nullable().optional(),
  builder_entity_id: z.string().uuid().nullable().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: opportunityId } = await params
    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const parsed = ConvertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Verify opportunity exists and is not already converted
    const { data: opportunity, error: fetchError } = await supabase
      .from('opportunities')
      .select('id, status, name')
      .eq('id', opportunityId)
      .single()

    if (fetchError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    if (opportunity.status === 'converted') {
      return NextResponse.json(
        { error: 'Opportunity has already been converted to a project' },
        { status: 409 }
      )
    }

    // Call the PostgreSQL function to convert opportunity to project
    const { data: projectId, error: rpcError } = await supabase.rpc(
      'convert_opportunity_to_project',
      { p_opportunity_id: opportunityId }
    )

    if (rpcError) {
      console.error('Convert opportunity function error:', rpcError)
      return NextResponse.json(
        { error: 'Failed to convert opportunity', details: rpcError.message },
        { status: 500 }
      )
    }

    // Update project with any additional fields from the dialog
    // (the SQL function uses opportunity data, but the dialog may override name/type/entities)
    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.project_name) updatePayload.name = parsed.data.project_name
    if (parsed.data.project_type) updatePayload.type = parsed.data.project_type
    if (parsed.data.builder_entity_id !== undefined) {
      updatePayload.builder_entity_id = parsed.data.builder_entity_id
    }
    if (parsed.data.owner_entity_id !== undefined) {
      updatePayload.owner_entity_id = parsed.data.owner_entity_id
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
    }

    return NextResponse.json({
      data: {
        project_id: projectId,
      },
    })
  } catch (err) {
    console.error('Convert opportunity error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
