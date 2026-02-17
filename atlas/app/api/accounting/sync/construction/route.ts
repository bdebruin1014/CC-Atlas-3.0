import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const ConstructionSyncSchema = z.object({
  event_type: z.enum([
    "invoice_approved",
    "payment_issued",
    "draw_funded",
    "retainage_released",
    "change_order_approved",
  ]),
  event_data: z.record(z.unknown()),
  source_record_id: z.string().uuid("source_record_id is required"),
})

// ---------------------------------------------------------------------------
// Helper: Resolve entity from job -> project -> entity chain
// ---------------------------------------------------------------------------
async function resolveEntityFromJob(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  jobId: string
): Promise<{ entity_id: string; project_id: string | null } | null> {
  // Try jobs -> project -> entity
  const { data: job } = await supabase
    .from("jobs")
    .select("id, project_id")
    .eq("id", jobId)
    .single()

  if (!job?.project_id) return null

  const { data: project } = await supabase
    .from("projects")
    .select("id, entity_id")
    .eq("id", job.project_id)
    .single()

  if (!project?.entity_id) return null

  return { entity_id: project.entity_id, project_id: project.id }
}

// ---------------------------------------------------------------------------
// Helper: Find or create an account by pattern
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
    .eq("account_type", accountType)
    .ilike("account_name", `%${namePattern}%`)
    .eq("is_active", true)
    .limit(1)
    .single()

  return data?.id || null
}

// ---------------------------------------------------------------------------
// POST: Sync construction event to accounting
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

    const { event_type, event_data, source_record_id } = parsed.data

    // Check for existing sync to prevent duplicates
    const { data: existingSync } = await supabase
      .from("transactions")
      .select("id")
      .eq("source_record_id", source_record_id)
      .eq("source_type", "construction")
      .limit(1)
      .single()

    if (existingSync) {
      return NextResponse.json(
        {
          error: "Duplicate sync",
          details: `Construction event ${source_record_id} has already been synced to accounting.`,
          existing_transaction_id: existingSync.id,
        },
        { status: 409 }
      )
    }

    // Resolve entity from event data
    const jobId = event_data.job_id as string | undefined
    const projectId = event_data.project_id as string | undefined
    let entityId = event_data.entity_id as string | undefined

    if (!entityId && jobId) {
      const resolved = await resolveEntityFromJob(supabase, jobId)
      if (resolved) {
        entityId = resolved.entity_id
      }
    }

    if (!entityId && projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("entity_id")
        .eq("id", projectId)
        .single()

      if (project?.entity_id) {
        entityId = project.entity_id
      }
    }

    if (!entityId) {
      return NextResponse.json(
        {
          error: "Cannot determine entity",
          details: "Could not resolve entity from job/project chain. Provide entity_id in event_data.",
        },
        { status: 400 }
      )
    }

    const batchId = crypto.randomUUID()
    const eventDate = (event_data.date as string) || new Date().toISOString().split("T")[0]
    const period = eventDate.slice(0, 7)
    const amount = event_data.amount as number

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount", details: "event_data.amount must be a positive number." },
        { status: 400 }
      )
    }

    let debitAccountId: string | null = null
    let creditAccountId: string | null = null
    let description = ""

    // Determine accounts based on event type
    switch (event_type) {
      case "invoice_approved": {
        // Debit: Construction in Progress (asset)
        // Credit: Accounts Payable (liability)
        debitAccountId = await findAccount(supabase, entityId, "construction in progress", "asset")
          || await findAccount(supabase, entityId, "CIP", "asset")
          || await findAccount(supabase, entityId, "construction cost", "asset")
        creditAccountId = await findAccount(supabase, entityId, "accounts payable", "liability")
          || await findAccount(supabase, entityId, "AP", "liability")

        const vendorName = (event_data.vendor_name as string) || "Vendor"
        const invoiceNumber = (event_data.invoice_number as string) || ""
        description = `Construction invoice approved - ${vendorName}${invoiceNumber ? ` #${invoiceNumber}` : ""} - $${amount}`
        break
      }

      case "payment_issued": {
        // Debit: Accounts Payable (liability)
        // Credit: Cash (asset)
        debitAccountId = await findAccount(supabase, entityId, "accounts payable", "liability")
          || await findAccount(supabase, entityId, "AP", "liability")
        creditAccountId = await findAccount(supabase, entityId, "cash", "asset")
          || await findAccount(supabase, entityId, "operating", "asset")

        const payeeName = (event_data.payee_name as string) || "Payee"
        const checkNumber = (event_data.check_number as string) || ""
        description = `Construction payment issued - ${payeeName}${checkNumber ? ` check #${checkNumber}` : ""} - $${amount}`
        break
      }

      case "draw_funded": {
        // Debit: Cash (asset)
        // Credit: Construction Loan (liability)
        debitAccountId = await findAccount(supabase, entityId, "cash", "asset")
          || await findAccount(supabase, entityId, "operating", "asset")
        creditAccountId = await findAccount(supabase, entityId, "construction loan", "liability")
          || await findAccount(supabase, entityId, "loan", "liability")

        const drawNumber = (event_data.draw_number as string | number) || ""
        description = `Construction draw funded${drawNumber ? ` #${drawNumber}` : ""} - $${amount}`
        break
      }

      case "retainage_released": {
        // Debit: Retainage Payable (liability)
        // Credit: Cash (asset)
        debitAccountId = await findAccount(supabase, entityId, "retainage", "liability")
          || await findAccount(supabase, entityId, "retention", "liability")
        creditAccountId = await findAccount(supabase, entityId, "cash", "asset")
          || await findAccount(supabase, entityId, "operating", "asset")

        const retainageVendor = (event_data.vendor_name as string) || "Vendor"
        description = `Retainage released - ${retainageVendor} - $${amount}`
        break
      }

      case "change_order_approved": {
        // Debit: Construction in Progress (asset)
        // Credit: Accounts Payable or Contingency (liability)
        debitAccountId = await findAccount(supabase, entityId, "construction in progress", "asset")
          || await findAccount(supabase, entityId, "CIP", "asset")
          || await findAccount(supabase, entityId, "construction cost", "asset")
        creditAccountId = await findAccount(supabase, entityId, "contingency", "liability")
          || await findAccount(supabase, entityId, "accounts payable", "liability")
          || await findAccount(supabase, entityId, "AP", "liability")

        const coNumber = (event_data.change_order_number as string) || ""
        description = `Change order approved${coNumber ? ` #${coNumber}` : ""} - $${amount}`
        break
      }
    }

    if (!debitAccountId || !creditAccountId) {
      return NextResponse.json(
        {
          error: "Missing accounts",
          details: `Could not find required accounts for event type '${event_type}'. Ensure the chart of accounts has appropriate accounts configured.`,
          debit_account_found: !!debitAccountId,
          credit_account_found: !!creditAccountId,
        },
        { status: 400 }
      )
    }

    // Create double-entry transactions
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          entity_id: entityId,
          date: eventDate,
          description,
          account_id: debitAccountId,
          debit: amount,
          credit: 0,
          transaction_type: "journal_entry",
          status: "pending",
          period,
          batch_id: batchId,
          source_type: "construction",
          source_record_id,
          project_id: projectId || null,
        },
        {
          entity_id: entityId,
          date: eventDate,
          description,
          account_id: creditAccountId,
          debit: 0,
          credit: amount,
          transaction_type: "journal_entry",
          status: "pending",
          period,
          batch_id: batchId,
          source_type: "construction",
          source_record_id,
          project_id: projectId || null,
        },
      ])
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
        record_id: source_record_id,
        action: "synced",
        description: `Synced construction ${event_type} to accounting - $${amount}`,
        metadata: {
          event_type,
          entity_id: entityId,
          source_record_id,
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
