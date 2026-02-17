import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// POST: Issue capital call (draft -> issued)
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

    // Fetch the capital call
    const { data: call, error: fetchError } = await supabase
      .from("capital_calls")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !call) {
      return NextResponse.json(
        { error: "Capital call not found" },
        { status: 404 }
      )
    }

    if (call.status !== "draft") {
      return NextResponse.json(
        {
          error: "Invalid state transition",
          details: `Cannot issue a capital call with status '${call.status}'. Only draft calls can be issued.`,
        },
        { status: 400 }
      )
    }

    // Verify there are responses
    const { count: responseCount } = await supabase
      .from("capital_call_responses")
      .select("id", { count: "exact", head: true })
      .eq("capital_call_id", id)

    if (!responseCount || responseCount === 0) {
      return NextResponse.json(
        { error: "No responses", details: "Capital call has no investor responses to issue." },
        { status: 400 }
      )
    }

    // Update status to issued
    const { data: updated, error: updateError } = await supabase
      .from("capital_calls")
      .update({ status: "issued" })
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Issue capital call error:", updateError)
      return NextResponse.json(
        { error: "Failed to issue capital call", details: updateError.message },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "capital_call",
        record_id: id,
        action: "issued",
        description: `Issued capital call ${call.call_number} for $${call.total_amount}`,
        metadata: {
          entity_id: call.entity_id,
          total_amount: call.total_amount,
          investor_count: responseCount,
        },
      })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("Capital call issue error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
