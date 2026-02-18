import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const COAFilterSchema = z.object({
  entity_id: z.string().uuid("entity_id is required"),
  account_type: z
    .enum(["asset", "liability", "equity", "revenue", "expense", "contra"])
    .optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().optional(),
})

const CreateAccountSchema = z.object({
  entity_id: z.string().uuid(),
  account_number: z.string().min(1, "Account number is required"),
  account_name: z.string().min(1, "Account name is required"),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense", "contra"]),
  normal_balance: z.enum(["debit", "credit"]),
  parent_account_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

const UpdateAccountSchema = z.object({
  id: z.string().uuid("Account ID is required"),
  account_name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  parent_account_id: z.string().uuid().optional().nullable(),
  account_type: z
    .enum(["asset", "liability", "equity", "revenue", "expense", "contra"])
    .optional(),
})

// ---------------------------------------------------------------------------
// GET: Chart of accounts for entity with current balances
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
    const parsed = COAFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    // Fetch accounts
    let query = supabase
      .from("chart_of_accounts")
      .select(
        `
        *,
        parent_account:chart_of_accounts!chart_of_accounts_parent_account_id_fkey(id, account_number, account_name)
      `
      )
      .eq("entity_id", filters.entity_id)
      .order("account_number", { ascending: true })

    if (filters.account_type) {
      query = query.eq("account_type", filters.account_type)
    }
    if (filters.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active)
    }
    if (filters.search) {
      query = query.or(
        `account_name.ilike.%${filters.search}%,account_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      )
    }

    const { data: accounts, error: accountsError } = await query

    if (accountsError) {
      console.error("COA fetch error:", accountsError)
      return NextResponse.json(
        { error: "Failed to fetch chart of accounts" },
        { status: 500 }
      )
    }

    // Fetch transaction sums for balance computation
    const { data: balances } = await supabase
      .from("transactions")
      .select("account_id, debit, credit")
      .eq("entity_id", filters.entity_id)
      .eq("status", "posted")

    // Compute balances per account
    const balanceMap: Record<string, { total_debit: number; total_credit: number }> = {}
    if (balances) {
      for (const tx of balances) {
        if (!balanceMap[tx.account_id]) {
          balanceMap[tx.account_id] = { total_debit: 0, total_credit: 0 }
        }
        balanceMap[tx.account_id].total_debit += tx.debit || 0
        balanceMap[tx.account_id].total_credit += tx.credit || 0
      }
    }

    const enrichedAccounts = (accounts || []).map((acct: any) => {
      const bal = balanceMap[acct.id] || { total_debit: 0, total_credit: 0 }
      // Current balance based on normal_balance side
      const currentBalance =
        acct.normal_balance === "debit"
          ? bal.total_debit - bal.total_credit
          : bal.total_credit - bal.total_debit

      return {
        ...acct,
        total_debit: Math.round(bal.total_debit * 100) / 100,
        total_credit: Math.round(bal.total_credit * 100) / 100,
        current_balance: Math.round(currentBalance * 100) / 100,
      }
    })

    return NextResponse.json({
      data: enrichedAccounts,
      total: enrichedAccounts.length,
    })
  } catch (err) {
    console.error("COA GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create account
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
    const parsed = CreateAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Check account_number unique within entity
    const { data: existing } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("entity_id", input.entity_id)
      .eq("account_number", input.account_number)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: "Duplicate account number",
          details: `Account number ${input.account_number} already exists for this entity.`,
        },
        { status: 409 }
      )
    }

    const { data: account, error: createError } = await supabase
      .from("chart_of_accounts")
      .insert({
        entity_id: input.entity_id,
        account_number: input.account_number,
        account_name: input.account_name,
        account_type: input.account_type,
        normal_balance: input.normal_balance,
        parent_account_id: input.parent_account_id || null,
        description: input.description || null,
        is_active: input.is_active,
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create account error:", createError)
      return NextResponse.json(
        { error: "Failed to create account", details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: account }, { status: 201 })
  } catch (err) {
    console.error("COA POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update account
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
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
    const parsed = UpdateAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, account_type, ...updates } = parsed.data

    // If changing account_type, check no transactions exist
    if (account_type) {
      const { count: txCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", id)

      if (txCount && txCount > 0) {
        return NextResponse.json(
          {
            error: "Cannot change account type",
            details: `Account has ${txCount} transaction(s). Account type cannot be changed when transactions exist.`,
          },
          { status: 400 }
        )
      }

      ;(updates as Record<string, unknown>).account_type = account_type
    }

    const { data: account, error: updateError } = await supabase
      .from("chart_of_accounts")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Update account error:", updateError)
      return NextResponse.json(
        { error: "Failed to update account", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: account })
  } catch (err) {
    console.error("COA PATCH error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
