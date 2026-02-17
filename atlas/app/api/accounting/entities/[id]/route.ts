import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const UpdateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  legal_name: z.string().optional().nullable(),
  use_type: z
    .enum(["operating_company", "holding_company", "spe", "fund_syndication", "other"])
    .optional()
    .nullable(),
  legal_type: z
    .enum(["llc", "s_corp", "partnership", "c_corp", "sole_proprietorship", "trust"])
    .optional()
    .nullable(),
  ein: z.string().optional().nullable(),
  state_of_formation: z.string().optional().nullable(),
  formation_date: z.string().optional().nullable(),
  parent_entity_id: z.string().uuid().optional().nullable(),
  registered_agent: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// GET: Entity detail with summary
// ---------------------------------------------------------------------------
export async function GET(
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

    // Fetch entity details
    const { data: entity, error: entityError } = await supabase
      .from("entities")
      .select(
        `
        *,
        parent_entity:entities!entities_parent_entity_id_fkey(id, name),
        children:entities!entities_parent_entity_id_fkey(id, name, use_type, is_active)
      `
      )
      .eq("id", id)
      .single()

    if (entityError || !entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      )
    }

    // Fetch COA summary (counts by type)
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_type, is_active")
      .eq("entity_id", id)

    const coaSummary = {
      total: (accounts || []).length,
      active: (accounts || []).filter((a) => a.is_active).length,
      by_type: (accounts || []).reduce(
        (acc: Record<string, number>, a) => {
          const type = a.account_type || "unknown"
          acc[type] = (acc[type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }

    // Fetch open fiscal periods
    const { data: openPeriods } = await supabase
      .from("fiscal_periods")
      .select("*")
      .eq("entity_id", id)
      .in("status", ["open", "review"])
      .order("period", { ascending: false })

    // Fetch investor count
    const { count: investorCount } = await supabase
      .from("investors")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", id)

    // Fetch active loans count
    const { count: activeLoanCount } = await supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", id)
      .in("status", ["active", "drawn_in_full", "pending"])

    // Financial snapshot: sum debits and credits from posted transactions
    const { data: financialData } = await supabase
      .from("transactions")
      .select("debit, credit, account:chart_of_accounts!transactions_account_id_fkey(account_type)")
      .eq("entity_id", id)
      .eq("status", "posted")

    let totalAssets = 0
    let totalLiabilities = 0
    let totalEquity = 0
    let totalRevenue = 0
    let totalExpenses = 0

    if (financialData) {
      for (const tx of financialData) {
        const acct = tx.account as { account_type: string } | null
        if (!acct) continue
        const netAmount = (tx.debit || 0) - (tx.credit || 0)
        switch (acct.account_type) {
          case "asset":
            totalAssets += netAmount
            break
          case "liability":
            totalLiabilities += -netAmount
            break
          case "equity":
            totalEquity += -netAmount
            break
          case "revenue":
            totalRevenue += -netAmount
            break
          case "expense":
            totalExpenses += netAmount
            break
        }
      }
    }

    return NextResponse.json({
      data: {
        ...entity,
        coa_summary: coaSummary,
        financial_snapshot: {
          total_assets: Math.round(totalAssets * 100) / 100,
          total_liabilities: Math.round(totalLiabilities * 100) / 100,
          total_equity: Math.round(totalEquity * 100) / 100,
          total_revenue: Math.round(totalRevenue * 100) / 100,
          total_expenses: Math.round(totalExpenses * 100) / 100,
          net_income: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        },
        open_periods: openPeriods || [],
        investor_count: investorCount || 0,
        active_loan_count: activeLoanCount || 0,
      },
    })
  } catch (err) {
    console.error("Entity GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update entity details
// ---------------------------------------------------------------------------
export async function PATCH(
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
    const parsed = UpdateEntitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates = parsed.data

    const { data: entity, error: updateError } = await supabase
      .from("entities")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Update entity error:", updateError)
      return NextResponse.json(
        { error: "Failed to update entity", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: entity })
  } catch (err) {
    console.error("Entity PATCH error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE: Soft delete entity (set status to dissolved)
// ---------------------------------------------------------------------------
export async function DELETE(
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

    // Check for open/pending transactions
    const { count: openTxCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", id)
      .in("status", ["pending", "approved"])

    if (openTxCount && openTxCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot dissolve entity",
          details: `Entity has ${openTxCount} open transaction(s). All transactions must be posted or voided before dissolving.`,
        },
        { status: 400 }
      )
    }

    // Check for open fiscal periods
    const { count: openPeriodCount } = await supabase
      .from("fiscal_periods")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", id)
      .in("status", ["open", "review"])

    if (openPeriodCount && openPeriodCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot dissolve entity",
          details: `Entity has ${openPeriodCount} open fiscal period(s). All periods must be closed before dissolving.`,
        },
        { status: 400 }
      )
    }

    // Soft delete: set is_active to false
    const { data: entity, error: deleteError } = await supabase
      .from("entities")
      .update({ is_active: false })
      .eq("id", id)
      .select("*")
      .single()

    if (deleteError) {
      console.error("Dissolve entity error:", deleteError)
      return NextResponse.json(
        { error: "Failed to dissolve entity", details: deleteError.message },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "entity",
        record_id: id,
        action: "dissolved",
        description: `Dissolved entity: ${entity.name}`,
      })
    }

    return NextResponse.json({ data: entity })
  } catch (err) {
    console.error("Entity DELETE error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
