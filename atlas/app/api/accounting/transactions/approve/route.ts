import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const BulkApproveSchema = z.object({
  batch_ids: z.array(z.string().uuid()).min(1, "At least one batch_id is required"),
})

// ---------------------------------------------------------------------------
// POST: Bulk approve transactions by batch_id
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = BulkApproveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { batch_ids } = parsed.data

    const results: {
      batch_id: string
      updated: number
      error: string | null
    }[] = []

    for (const batchId of batch_ids) {
      // Fetch transactions in this batch that are pending or approved
      const { data: batchTxns, error: fetchError } = await supabase
        .from("transactions")
        .select("id, status, period, entity_id")
        .eq("batch_id", batchId)
        .in("status", ["pending", "approved"])

      if (fetchError) {
        results.push({ batch_id: batchId, updated: 0, error: fetchError.message })
        continue
      }

      if (!batchTxns || batchTxns.length === 0) {
        results.push({ batch_id: batchId, updated: 0, error: "No eligible transactions found" })
        continue
      }

      // Validate all periods are open
      const periods = [...new Set(batchTxns.map((t) => t.period).filter(Boolean))]
      const entityId = batchTxns[0].entity_id

      if (periods.length > 0) {
        const { data: closedPeriods } = await supabase
          .from("fiscal_periods")
          .select("period, status")
          .eq("entity_id", entityId)
          .in("period", periods)
          .in("status", ["closed", "locked"])

        if (closedPeriods && closedPeriods.length > 0) {
          const closedList = closedPeriods.map((p) => p.period).join(", ")
          results.push({
            batch_id: batchId,
            updated: 0,
            error: `Transactions reference closed/locked period(s): ${closedList}`,
          })
          continue
        }
      }

      // Update all transactions in this batch to posted
      const txIds = batchTxns.map((t) => t.id)
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "posted",
          approved_by: user.id,
        })
        .in("id", txIds)

      if (updateError) {
        results.push({ batch_id: batchId, updated: 0, error: updateError.message })
      } else {
        results.push({ batch_id: batchId, updated: txIds.length, error: null })
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
    const totalFailed = results.filter((r) => r.error).length

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "transaction",
        action: "bulk_approved",
        description: `Approved ${totalUpdated} transactions across ${batch_ids.length} batch(es)`,
        metadata: {
          batch_ids,
          total_updated: totalUpdated,
          total_failed: totalFailed,
        },
      })
    }

    return NextResponse.json({
      approved: totalUpdated,
      failed: totalFailed,
      results,
    })
  } catch (err) {
    console.error("Transaction approve error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
