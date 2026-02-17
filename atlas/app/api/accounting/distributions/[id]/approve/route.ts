import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// POST: Approve distribution (draft -> approved)
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch the distribution
    const { data: distribution, error: fetchError } = await supabase
      .from("distributions")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !distribution) {
      return NextResponse.json(
        { error: "Distribution not found" },
        { status: 404 }
      )
    }

    if (distribution.status !== "draft") {
      return NextResponse.json(
        {
          error: "Invalid state transition",
          details: `Cannot approve a distribution with status '${distribution.status}'. Only draft distributions can be approved.`,
        },
        { status: 400 }
      )
    }

    // Verify allocations exist
    const { count: allocCount } = await supabase
      .from("distribution_allocations")
      .select("id", { count: "exact", head: true })
      .eq("distribution_id", id)

    if (!allocCount || allocCount === 0) {
      return NextResponse.json(
        { error: "No allocations", details: "Distribution has no investor allocations." },
        { status: 400 }
      )
    }

    // Update status to approved
    const { data: updated, error: updateError } = await supabase
      .from("distributions")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Approve distribution error:", updateError)
      return NextResponse.json(
        { error: "Failed to approve distribution", details: updateError.message },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "distribution",
        record_id: id,
        action: "approved",
        description: `Approved distribution of $${distribution.total_amount} (${distribution.distribution_type})`,
        metadata: {
          entity_id: distribution.entity_id,
          total_amount: distribution.total_amount,
          allocation_count: allocCount,
        },
      })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("Distribution approve error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
