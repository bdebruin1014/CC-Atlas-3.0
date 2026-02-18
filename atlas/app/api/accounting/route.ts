import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const TransactionFilterSchema = z.object({
  entity_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  transaction_type: z.string().optional(),
  status: z.string().optional(),
  period: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateTransactionSchema = z.object({
  entity_id: z.string().uuid(),
  entries: z
    .array(
      z.object({
        account_id: z.string().uuid(),
        debit: z.number().min(0).default(0),
        credit: z.number().min(0).default(0),
        description: z.string().optional().nullable(),
      })
    )
    .min(2, "At least two entries required for double-entry"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().nullable(),
  transaction_type: z
    .enum([
      "journal_entry",
      "invoice",
      "payment",
      "receipt",
      "transfer",
      "adjustment",
      "closing",
    ])
    .default("journal_entry"),
  project_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  period: z.string().optional().nullable(),
  is_adjusting_entry: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// GET: List transactions for an entity
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
    const parsed = TransactionFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("transactions")
      .select(
        `
        *,
        account:chart_of_accounts!transactions_account_id_fkey(
          id, account_number, account_name, account_type, normal_balance
        ),
        project:projects!transactions_project_id_fkey(id, name, project_number),
        unit:units!transactions_unit_id_fkey(id, unit_number),
        approver:profiles!transactions_approved_by_fkey(id, first_name, last_name)
      `,
        { count: "exact" }
      )
      .eq("entity_id", filters.entity_id)
      .order("date", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    if (filters.account_id) {
      query = query.eq("account_id", filters.account_id)
    }
    if (filters.project_id) {
      query = query.eq("project_id", filters.project_id)
    }
    if (filters.unit_id) {
      query = query.eq("unit_id", filters.unit_id)
    }
    if (filters.transaction_type) {
      query = query.eq("transaction_type", filters.transaction_type as any)
    }
    if (filters.status) {
      query = query.eq("status", filters.status as any)
    }
    if (filters.period) {
      query = query.eq("period", filters.period)
    }
    if (filters.date_from) {
      query = query.gte("date", filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte("date", filters.date_to)
    }
    if (filters.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Transactions fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (err) {
    console.error("Accounting GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create transaction (validate double-entry balance)
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
    const parsed = CreateTransactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Validate double-entry: total debits must equal total credits
    const totalDebits = input.entries.reduce((sum, e) => sum + e.debit, 0)
    const totalCredits = input.entries.reduce((sum, e) => sum + e.credit, 0)

    if (Math.abs(totalDebits - totalCredits) > 0.005) {
      return NextResponse.json(
        {
          error: "Double-entry balance error",
          details: `Total debits ($${totalDebits.toFixed(2)}) must equal total credits ($${totalCredits.toFixed(2)})`,
        },
        { status: 400 }
      )
    }

    // Validate that each entry has either a debit or credit (not both, not neither)
    for (const entry of input.entries) {
      if (entry.debit > 0 && entry.credit > 0) {
        return NextResponse.json(
          {
            error: "Validation error",
            details:
              "Each entry must have either a debit or a credit, not both",
          },
          { status: 400 }
        )
      }
      if (entry.debit === 0 && entry.credit === 0) {
        return NextResponse.json(
          {
            error: "Validation error",
            details: "Each entry must have a non-zero debit or credit",
          },
          { status: 400 }
        )
      }
    }

    // Check that the fiscal period is open
    if (input.period) {
      const { data: fp } = await supabase
        .from("fiscal_periods")
        .select("status")
        .eq("entity_id", input.entity_id)
        .eq("period", input.period)
        .single()

      if (fp && (fp.status === "closed" || fp.status === "locked")) {
        return NextResponse.json(
          {
            error: "Period is closed",
            details: `Fiscal period ${input.period} is ${fp.status} and cannot accept new transactions`,
          },
          { status: 400 }
        )
      }
    }

    // Generate a batch ID for this journal entry
    const batchId = crypto.randomUUID()

    // Determine the period from the date if not provided
    const txDate = new Date(input.date)
    const period =
      input.period ||
      `${txDate.getFullYear()}-${(txDate.getMonth() + 1).toString().padStart(2, "0")}`

    // Build transaction records
    const transactionPayloads = input.entries.map((entry) => ({
      entity_id: input.entity_id,
      date: input.date,
      description: entry.description || input.description || null,
      account_id: entry.account_id,
      debit: entry.debit,
      credit: entry.credit,
      project_id: input.project_id || null,
      unit_id: input.unit_id || null,
      reference_number: input.reference_number || null,
      transaction_type: input.transaction_type,
      status: "pending" as const,
      period,
      is_adjusting_entry: input.is_adjusting_entry,
      batch_id: batchId,
    }))

    const { data: transactions, error: createError } = await supabase
      .from("transactions")
      .insert(transactionPayloads)
      .select("*")

    if (createError) {
      console.error("Create transaction error:", createError)
      return NextResponse.json(
        {
          error: "Failed to create transaction",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "transaction",
        record_id: batchId,
        action: "created",
        description: `Created ${input.transaction_type} with ${input.entries.length} entries totaling $${totalDebits.toFixed(2)}`,
        metadata: {
          entity_id: input.entity_id,
          batch_id: batchId,
          total_debits: totalDebits,
          total_credits: totalCredits,
          entry_count: input.entries.length,
        },
      })
    }

    return NextResponse.json(
      {
        data: transactions,
        batch_id: batchId,
        total_debits: totalDebits,
        total_credits: totalCredits,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Accounting POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
