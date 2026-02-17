import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const SyncTransactionSchema = z.object({
  transaction_ids: z.array(z.string().uuid()).min(1, "At least one transaction ID required"),
  entity_id: z.string().uuid(),
  force: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Helper: Get Akaunting API configuration
// ---------------------------------------------------------------------------
async function getAkauntingConfig(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<{
  baseUrl: string
  companyId: number
  apiKey: string
  email: string
} | null> {
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("config")
    .eq("provider", "akaunting")
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!settings?.config) {
    // Fall back to environment variables
    const baseUrl = process.env.AKAUNTING_BASE_URL
    const companyId = process.env.AKAUNTING_COMPANY_ID
    const apiKey = process.env.AKAUNTING_API_KEY
    const email = process.env.AKAUNTING_EMAIL

    if (!baseUrl || !companyId || !apiKey || !email) return null

    return {
      baseUrl,
      companyId: parseInt(companyId, 10),
      apiKey,
      email,
    }
  }

  const config = settings.config as {
    base_url?: string
    company_id?: number
    api_key?: string
    email?: string
  }

  if (!config.base_url || !config.company_id || !config.api_key || !config.email) {
    return null
  }

  return {
    baseUrl: config.base_url,
    companyId: config.company_id,
    apiKey: config.api_key,
    email: config.email,
  }
}

// ---------------------------------------------------------------------------
// Helper: Map ATLAS account type to Akaunting account type ID
// ---------------------------------------------------------------------------
function mapAccountType(atlasType: string): number {
  const mapping: Record<string, number> = {
    asset: 1,
    liability: 2,
    equity: 3,
    revenue: 4,
    expense: 5,
    contra: 6,
  }
  return mapping[atlasType] || 5
}

// ---------------------------------------------------------------------------
// POST: Sync approved transactions to Akaunting
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
    const parsed = SyncTransactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    const config = await getAkauntingConfig(supabase)
    if (!config) {
      return NextResponse.json(
        { error: "Akaunting integration not configured" },
        { status: 503 }
      )
    }

    // Fetch transactions that need syncing
    let query = supabase
      .from("transactions")
      .select(
        `
        *,
        account:chart_of_accounts!transactions_account_id_fkey(
          id, account_number, account_name, account_type
        )
      `
      )
      .eq("entity_id", input.entity_id)
      .in("id", input.transaction_ids)
      .in("status", ["approved", "posted"])

    if (!input.force) {
      query = query.eq("akaunting_synced", false)
    }

    const { data: transactions, error: txError } = await query

    if (txError) {
      return NextResponse.json(
        { error: "Failed to fetch transactions", details: txError.message },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        message: "No transactions to sync",
        synced: 0,
        skipped: input.transaction_ids.length,
      })
    }

    // Build basic auth header
    const authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiKey}`).toString("base64")}`

    const results: {
      transaction_id: string
      akaunting_id: number | null
      success: boolean
      error: string | null
    }[] = []

    // Sync each transaction to Akaunting
    for (const tx of transactions) {
      try {
        const account = tx.account as {
          account_number: string
          account_name: string
          account_type: string
        }

        // Determine if this is income (credit to revenue) or expense (debit to expense)
        const isRevenue = account.account_type === "revenue" && tx.credit > 0
        const isExpense = account.account_type === "expense" && tx.debit > 0

        let akauntingEndpoint: string
        let akauntingPayload: Record<string, unknown>

        if (isRevenue) {
          // Create revenue/income in Akaunting
          akauntingEndpoint = `${config.baseUrl}/api/${config.companyId}/revenues`
          akauntingPayload = {
            account_id: 1, // Default cash account
            paid_at: tx.date,
            amount: tx.credit,
            currency_code: "USD",
            description: tx.description || `ATLAS TX: ${tx.reference_number || tx.id}`,
            category_id: 1, // Default category
            reference: tx.reference_number || `ATLAS-${tx.id.slice(0, 8)}`,
          }
        } else if (isExpense) {
          // Create payment/expense in Akaunting
          akauntingEndpoint = `${config.baseUrl}/api/${config.companyId}/payments`
          akauntingPayload = {
            account_id: 1, // Default cash account
            paid_at: tx.date,
            amount: tx.debit,
            currency_code: "USD",
            description: tx.description || `ATLAS TX: ${tx.reference_number || tx.id}`,
            category_id: 1, // Default category
            reference: tx.reference_number || `ATLAS-${tx.id.slice(0, 8)}`,
          }
        } else {
          // General journal entry - create as a generic transaction
          akauntingEndpoint = `${config.baseUrl}/api/${config.companyId}/transactions`
          akauntingPayload = {
            type: tx.debit > 0 ? "expense" : "income",
            account_id: 1,
            paid_at: tx.date,
            amount: tx.debit > 0 ? tx.debit : tx.credit,
            currency_code: "USD",
            description: tx.description || `ATLAS TX: ${tx.reference_number || tx.id}`,
            reference: tx.reference_number || `ATLAS-${tx.id.slice(0, 8)}`,
          }
        }

        const resp = await fetch(akauntingEndpoint, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Company": config.companyId.toString(),
          },
          body: JSON.stringify(akauntingPayload),
        })

        if (!resp.ok) {
          const errText = await resp.text()
          console.error(`Akaunting sync error for tx ${tx.id}:`, errText)
          results.push({
            transaction_id: tx.id,
            akaunting_id: null,
            success: false,
            error: `HTTP ${resp.status}: ${errText.slice(0, 200)}`,
          })
          continue
        }

        const akauntingResponse = await resp.json()
        const akauntingId =
          akauntingResponse.data?.id || akauntingResponse.id || null

        // Mark transaction as synced in ATLAS
        await supabase
          .from("transactions")
          .update({ akaunting_synced: true })
          .eq("id", tx.id)

        results.push({
          transaction_id: tx.id,
          akaunting_id: akauntingId,
          success: true,
          error: null,
        })
      } catch (syncErr) {
        const message =
          syncErr instanceof Error ? syncErr.message : "Unknown sync error"
        results.push({
          transaction_id: tx.id,
          akaunting_id: null,
          success: false,
          error: message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "akaunting_sync",
        action: "synced",
        description: `Synced ${successCount} transactions to Akaunting (${failureCount} failed)`,
        metadata: {
          entity_id: input.entity_id,
          success_count: successCount,
          failure_count: failureCount,
          transaction_ids: input.transaction_ids,
        },
      })
    }

    return NextResponse.json({
      synced: successCount,
      failed: failureCount,
      results,
    })
  } catch (err) {
    console.error("Akaunting sync error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
