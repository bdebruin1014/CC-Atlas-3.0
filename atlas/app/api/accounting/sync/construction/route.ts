import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ConstructionSyncSchema = z.object({
  event_type: z.enum([
    "invoice_created",
    "payment_processed",
    "draw_requested",
    "draw_paid",
  ]),
  event_data: z.object({
    entity_id: z.string().uuid(),
    project_id: z.string().uuid().optional().nullable(),
    unit_id: z.string().uuid().optional().nullable(),
    amount: z.number().positive("Amount must be positive"),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    vendor_name: z.string().optional().nullable(),
    source_record_id: z.string().uuid().optional().nullable(),
    cost_code: z.string().optional().nullable(),
    job_id: z.string().uuid().optional().nullable(),
  }),
})

// ---------------------------------------------------------------------------
// Helper: Find account by name pattern and type
// ---------------------------------------------------------------------------
async function findAccount(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  entityId: string,
  namePattern: string,
  accountType: string
): Promise<string | null> {
  const { data } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("entity_id", entityId)
    .eq("account_type", accountType as any)
    .ilike("account_name", `%${namePattern}%`)
    .eq("is_active", true)
    .limit(1)
    .single()

  return data?.id || null
}

// ---------------------------------------------------------------------------
// POST: Sync construction event to accounting (idempotent)
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
    const parsed = ConstructionSyncSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { event_type, event_data } = parsed.data

    // Idempotency check: if source_record_id provided, check if already synced
    if (event_data.source_record_id) {
      const { data: existingSync } = await supabase
        .from("transactions")
        .select("id, batch_id")
        .eq("source_record_id", event_data.source_record_id)
        .limit(1)
        .single()

      if (existingSync) {
        return NextResponse.json({
          data: {
            batch_id: existingSync.batch_id,
            transaction_id: existingSync.id,
          },
          message: "Already synced (idempotent)",
          idempotent: true,
        })
      }
    }

    // Resolve entity
    let entityId = event_data.entity_id

    // If no entity directly, try to resolve via project
    if (!entityId && event_data.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("owner_entity_id")
        .eq("id", event_data.project_id)
        .single()

      if (project?.owner_entity_id) {
        entityId = project.owner_entity_id
      }
    }

    if (!entityId) {
      return NextResponse.json(
        {
          error: "Cannot determine entity",
          details: "Could not resolve entity from event data. Provide entity_id.",
        },
        { status: 400 }
      )
    }

    const batchId = crypto.randomUUID()
    const txDate = event_data.date
    const period = txDate.slice(0, 7)
    const amount = event_data.amount

    let debitAccountId: string | null = null
    let creditAccountId: string | null = null
    let description = ""
    let txType = "journal_entry"

    // Determine accounts based on event type
    switch (event_type) {
      case "invoice_created": {
        // Debit: Construction in Progress (asset)
        // Credit: Accounts Payable (liability)
        debitAccountId =
          (await findAccount(supabase, entityId, "construction in progress", "asset")) ||
          (await findAccount(supabase, entityId, "CIP", "asset")) ||
          (await findAccount(supabase, entityId, "hard cost", "expense"))
        creditAccountId =
          (await findAccount(supabase, entityId, "accounts payable", "liability")) ||
          (await findAccount(supabase, entityId, "AP", "liability"))

        const vendorName = event_data.vendor_name || "Vendor"
        const refNum = event_data.reference_number || ""
        description =
          event_data.description ||
          `Construction invoice - ${vendorName}${refNum ? ` #${refNum}` : ""} - $${amount}`
        txType = "invoice"
        break
      }

      case "payment_processed": {
        // Debit: Accounts Payable (liability)
        // Credit: Cash (asset)
        debitAccountId =
          (await findAccount(supabase, entityId, "accounts payable", "liability")) ||
          (await findAccount(supabase, entityId, "AP", "liability"))
        creditAccountId =
          (await findAccount(supabase, entityId, "cash", "asset")) ||
          (await findAccount(supabase, entityId, "operating", "asset"))

        const payeeName = event_data.vendor_name || "Payee"
        description =
          event_data.description ||
          `Payment to ${payeeName} - $${amount}`
        txType = "payment"
        break
      }

      case "draw_requested": {
        // Debit: Accounts Receivable or Draw Receivable (asset)
        // Credit: Construction Loan (liability)
        debitAccountId =
          (await findAccount(supabase, entityId, "accounts receivable", "asset")) ||
          (await findAccount(supabase, entityId, "draw receivable", "asset"))
        creditAccountId =
          (await findAccount(supabase, entityId, "construction loan", "liability")) ||
          (await findAccount(supabase, entityId, "development loan", "liability"))

        description =
          event_data.description ||
          `Construction draw requested - $${amount}`
        break
      }

      case "draw_paid": {
        // Debit: Cash (asset)
        // Credit: Construction Loan (liability)
        debitAccountId =
          (await findAccount(supabase, entityId, "cash", "asset")) ||
          (await findAccount(supabase, entityId, "operating", "asset"))
        creditAccountId =
          (await findAccount(supabase, entityId, "construction loan", "liability")) ||
          (await findAccount(supabase, entityId, "development loan", "liability"))

        description =
          event_data.description ||
          `Construction draw funded - $${amount}`
        txType = "receipt"
        break
      }
    }

    if (!debitAccountId || !creditAccountId) {
      return NextResponse.json(
        {
          error: "Account mapping not found",
          details: `Could not find required accounts for event type '${event_type}'. Ensure the entity has the standard COA configured.`,
          debit_account_found: !!debitAccountId,
          credit_account_found: !!creditAccountId,
        },
        { status: 400 }
      )
    }

    // Create double-entry journal entries
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          entity_id: entityId,
          date: txDate,
          description,
          account_id: debitAccountId,
          debit: amount,
          credit: 0,
          transaction_type: txType,
          status: "pending",
          period,
          batch_id: batchId,
          source_record_id: event_data.source_record_id || null,
          project_id: event_data.project_id || null,
          unit_id: event_data.unit_id || null,
          reference_number: event_data.reference_number || null,
        },
        {
          entity_id: entityId,
          date: txDate,
          description,
          account_id: creditAccountId,
          debit: 0,
          credit: amount,
          transaction_type: txType,
          status: "pending",
          period,
          batch_id: batchId,
          source_record_id: event_data.source_record_id || null,
          project_id: event_data.project_id || null,
          unit_id: event_data.unit_id || null,
          reference_number: event_data.reference_number || null,
        },
      ] as any)
      .select("id")

    if (txError) {
      console.error("Construction sync transaction error:", txError)
      return NextResponse.json(
        { error: "Failed to create accounting entries", details: txError.message },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "construction_sync",
        record_id: event_data.source_record_id || batchId,
        action: "synced",
        description: `Synced construction ${event_type} to accounting - $${amount}`,
        metadata: {
          event_type,
          entity_id: entityId,
          source_record_id: event_data.source_record_id,
          batch_id: batchId,
          amount,
        },
      })
    }

    return NextResponse.json(
      {
        data: {
          batch_id: batchId,
          transaction_ids: (transactions || []).map((t) => t.id),
          event_type,
          entity_id: entityId,
          amount,
          description,
          status: "pending",
        },
        idempotent: false,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Construction sync error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
