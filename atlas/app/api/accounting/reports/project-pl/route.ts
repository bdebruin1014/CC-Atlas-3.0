import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ProjectPLSchema = z.object({
  project_id: z.string().uuid().optional(),
  entity_id: z.string().uuid().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
}).refine(
  (data) => data.project_id || data.entity_id,
  { message: "Either project_id or entity_id is required" }
)

// ---------------------------------------------------------------------------
// GET: Project P&L report
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    const parsed = ProjectPLSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    // Determine entity_id(s) to query
    let entityIds: string[] = []
    let projectName: string | null = null

    if (filters.project_id) {
      // Fetch project to get entity association
      const { data: project, error: projError } = await supabase
        .from("projects")
        .select("id, name, entity_id")
        .eq("id", filters.project_id)
        .single()

      if (projError || !project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }

      projectName = project.name
      if (project.entity_id) {
        entityIds = [project.entity_id]
      }
    } else if (filters.entity_id) {
      entityIds = [filters.entity_id]
    }

    if (entityIds.length === 0) {
      return NextResponse.json(
        { error: "No entity associated with the specified project or entity" },
        { status: 400 }
      )
    }

    // Fetch revenue accounts (4xxx) and cost accounts (5xxx)
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name, account_type, normal_balance")
      .in("entity_id", entityIds)
      .eq("is_active", true)
      .or("account_number.like.4%,account_number.like.5%")
      .order("account_number", { ascending: true })

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        data: {
          project_id: filters.project_id || null,
          entity_id: filters.entity_id || entityIds[0],
          project_name: projectName,
          period_start: filters.period_start || null,
          period_end: filters.period_end || null,
          revenue: { accounts: [], total: 0 },
          costs: { accounts: [], total: 0 },
          gross_profit: 0,
          margin_pct: 0,
        },
      })
    }

    const accountIds = accounts.map((a) => a.id)

    // Fetch posted transactions for these accounts
    let txQuery = supabase
      .from("transactions")
      .select("account_id, debit, credit")
      .in("entity_id", entityIds)
      .eq("status", "posted")
      .in("account_id", accountIds)

    if (filters.period_start) {
      txQuery = txQuery.gte("date", filters.period_start)
    }
    if (filters.period_end) {
      txQuery = txQuery.lte("date", filters.period_end)
    }

    // If project_id provided, also filter by project_id tag on transactions
    if (filters.project_id) {
      txQuery = txQuery.eq("project_id", filters.project_id)
    }

    const { data: transactions } = await txQuery

    // Aggregate by account
    const balanceMap: Record<string, { total_debit: number; total_credit: number }> = {}
    if (transactions) {
      for (const tx of transactions) {
        if (!balanceMap[tx.account_id]) {
          balanceMap[tx.account_id] = { total_debit: 0, total_credit: 0 }
        }
        balanceMap[tx.account_id].total_debit += tx.debit || 0
        balanceMap[tx.account_id].total_credit += tx.credit || 0
      }
    }

    // Separate revenue (4xxx) and cost (5xxx)
    const revenueAccounts = accounts
      .filter((a) => a.account_number.startsWith("4"))
      .map((acct) => {
        const bal = balanceMap[acct.id] || { total_debit: 0, total_credit: 0 }
        const balance =
          acct.normal_balance === "credit"
            ? bal.total_credit - bal.total_debit
            : bal.total_debit - bal.total_credit

        return {
          account_id: acct.id,
          account_number: acct.account_number,
          account_name: acct.account_name,
          total_debit: Math.round(bal.total_debit * 100) / 100,
          total_credit: Math.round(bal.total_credit * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        }
      })

    const costAccounts = accounts
      .filter((a) => a.account_number.startsWith("5"))
      .map((acct) => {
        const bal = balanceMap[acct.id] || { total_debit: 0, total_credit: 0 }
        const balance =
          acct.normal_balance === "debit"
            ? bal.total_debit - bal.total_credit
            : bal.total_credit - bal.total_debit

        return {
          account_id: acct.id,
          account_number: acct.account_number,
          account_name: acct.account_name,
          total_debit: Math.round(bal.total_debit * 100) / 100,
          total_credit: Math.round(bal.total_credit * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        }
      })

    const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0)
    const totalCosts = costAccounts.reduce((s, a) => s + a.balance, 0)
    const grossProfit = totalRevenue - totalCosts
    const marginPct = totalRevenue > 0
      ? Math.round((grossProfit / totalRevenue) * 10000) / 100
      : 0

    return NextResponse.json({
      data: {
        project_id: filters.project_id || null,
        entity_id: filters.entity_id || entityIds[0],
        project_name: projectName,
        period_start: filters.period_start || null,
        period_end: filters.period_end || null,
        revenue: {
          accounts: revenueAccounts.filter((a) => a.balance !== 0),
          total: Math.round(totalRevenue * 100) / 100,
        },
        costs: {
          accounts: costAccounts.filter((a) => a.balance !== 0),
          total: Math.round(totalCosts * 100) / 100,
        },
        gross_profit: Math.round(grossProfit * 100) / 100,
        margin_pct: marginPct,
      },
    })
  } catch (err) {
    console.error("Project P&L report error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
