import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ClosePeriodSchema = z.object({
  action: z.enum(["close", "lock", "reopen"]).default("close"),
})

// ---------------------------------------------------------------------------
// POST: Close, lock, or reopen a fiscal period
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

    const body = await request.json()
    const parsed = ClosePeriodSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { action } = parsed.data

    // Fetch the period
    const { data: period, error: fetchError } = await supabase
      .from("fiscal_periods")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !period) {
      return NextResponse.json(
        { error: "Fiscal period not found" },
        { status: 404 }
      )
    }

    if (action === "close") {
      // Can only close open or review periods
      if (!["open", "review"].includes(period.status)) {
        return NextResponse.json(
          {
            error: "Invalid state transition",
            details: `Cannot close a period with status '${period.status}'. Only open or review periods can be closed.`,
          },
          { status: 400 }
        )
      }

      // Check for unposted transactions
      const { count: unpostedCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("entity_id", period.entity_id)
        .eq("period", period.period)
        .in("status", ["pending", "approved"])

      if (unpostedCount && unpostedCount > 0) {
        return NextResponse.json(
          {
            error: "Unposted transactions exist",
            details: `Period has ${unpostedCount} unposted transaction(s). All transactions must be posted or voided before closing.`,
          },
          { status: 400 }
        )
      }

      // Close the period
      const { data: updated, error: updateError } = await supabase
        .from("fiscal_periods")
        .update({
          status: "closed",
          closed_by: user.id,
          closed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single()

      if (updateError) {
        console.error("Close period error:", updateError)
        return NextResponse.json(
          { error: "Failed to close period", details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: updated })
    }

    if (action === "lock") {
      // Can only lock closed periods
      if (period.status !== "closed") {
        return NextResponse.json(
          {
            error: "Invalid state transition",
            details: `Cannot lock a period with status '${period.status}'. Only closed periods can be locked.`,
          },
          { status: 400 }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from("fiscal_periods")
        .update({ status: "locked" })
        .eq("id", id)
        .select("*")
        .single()

      if (updateError) {
        console.error("Lock period error:", updateError)
        return NextResponse.json(
          { error: "Failed to lock period", details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: updated })
    }

    if (action === "reopen") {
      // Can only reopen closed periods (not locked)
      if (period.status !== "closed") {
        return NextResponse.json(
          {
            error: "Invalid state transition",
            details: `Cannot reopen a period with status '${period.status}'. Only closed periods can be reopened.`,
          },
          { status: 400 }
        )
      }

      // Check user role for admin-only reopen
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!profile || !["global_admin", "module_admin"].includes(profile.role || "")) {
        return NextResponse.json(
          { error: "Insufficient permissions", details: "Only admins can reopen closed periods." },
          { status: 403 }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from("fiscal_periods")
        .update({
          status: "open",
          closed_by: null,
          closed_at: null,
        })
        .eq("id", id)
        .select("*")
        .single()

      if (updateError) {
        console.error("Reopen period error:", updateError)
        return NextResponse.json(
          { error: "Failed to reopen period", details: updateError.message },
          { status: 500 }
        )
      }

      // Activity log
      const orgId = user.user_metadata?.organization_id
      if (orgId) {
        await supabase.from("activity_log").insert({
          organization_id: orgId,
          user_id: user.id,
          record_type: "fiscal_period",
          record_id: id,
          action: "reopened",
          description: `Reopened fiscal period ${period.period}`,
        })
      }

      return NextResponse.json({ data: updated })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("Period close error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
