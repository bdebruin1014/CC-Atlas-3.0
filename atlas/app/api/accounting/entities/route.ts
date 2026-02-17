import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const EntityFilterSchema = z.object({
  use_type: z
    .enum(["operating_company", "holding_company", "spe", "fund_syndication", "other"])
    .optional(),
  status: z.enum(["active", "dissolved"]).optional(),
  parent_entity_id: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const CreateEntitySchema = z.object({
  name: z.string().min(1, "Name is required"),
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
})

// ---------------------------------------------------------------------------
// Default COA templates by use_type
// ---------------------------------------------------------------------------
const DEFAULT_COA_TEMPLATES: Record<
  string,
  { account_number: string; account_name: string; account_type: string; normal_balance: string; description: string }[]
> = {
  spe: [
    { account_number: "1000", account_name: "Cash - Operating", account_type: "asset", normal_balance: "debit", description: "Primary operating bank account." },
    { account_number: "1010", account_name: "Cash - Escrow", account_type: "asset", normal_balance: "debit", description: "Escrow account for deposits and closing funds." },
    { account_number: "1100", account_name: "Accounts Receivable", account_type: "asset", normal_balance: "debit", description: "Amounts due from buyers and draw requests pending." },
    { account_number: "1200", account_name: "Prepaid Expenses", account_type: "asset", normal_balance: "debit", description: "Prepaid insurance, taxes, and other prepaid expenses." },
    { account_number: "1300", account_name: "Land", account_type: "asset", normal_balance: "debit", description: "Cost of land acquired including closing costs." },
    { account_number: "1400", account_name: "Construction in Progress", account_type: "asset", normal_balance: "debit", description: "Accumulated costs for units under construction." },
    { account_number: "1500", account_name: "Finished Lots", account_type: "asset", normal_balance: "debit", description: "Cost of developed lots ready for construction." },
    { account_number: "1600", account_name: "Completed Homes", account_type: "asset", normal_balance: "debit", description: "Fully constructed homes available for sale." },
    { account_number: "2000", account_name: "Accounts Payable", account_type: "liability", normal_balance: "credit", description: "Amounts owed to vendors and suppliers." },
    { account_number: "2100", account_name: "Accrued Expenses", account_type: "liability", normal_balance: "credit", description: "Accrued but unpaid expenses." },
    { account_number: "2200", account_name: "Construction Loan", account_type: "liability", normal_balance: "credit", description: "Outstanding construction financing balance." },
    { account_number: "2300", account_name: "Development Loan", account_type: "liability", normal_balance: "credit", description: "Outstanding land development financing." },
    { account_number: "2500", account_name: "Accrued Interest", account_type: "liability", normal_balance: "credit", description: "Interest accrued but not yet paid." },
    { account_number: "3000", account_name: "Member Capital - Managing Member", account_type: "equity", normal_balance: "credit", description: "Capital contributed by managing member." },
    { account_number: "3100", account_name: "Member Capital - Investors", account_type: "equity", normal_balance: "credit", description: "Capital contributed by investor members." },
    { account_number: "3200", account_name: "Retained Earnings", account_type: "equity", normal_balance: "credit", description: "Cumulative net income retained." },
    { account_number: "3300", account_name: "Distributions", account_type: "equity", normal_balance: "debit", description: "Amounts distributed to members (contra-equity)." },
    { account_number: "4000", account_name: "Home Sales Revenue", account_type: "revenue", normal_balance: "credit", description: "Gross revenue from sale of completed homes." },
    { account_number: "4100", account_name: "Lot Sales Revenue", account_type: "revenue", normal_balance: "credit", description: "Revenue from sale of finished lots." },
    { account_number: "4400", account_name: "Interest Income", account_type: "revenue", normal_balance: "credit", description: "Interest earned on bank accounts." },
    { account_number: "4500", account_name: "Other Revenue", account_type: "revenue", normal_balance: "credit", description: "Miscellaneous revenue." },
    { account_number: "5000", account_name: "Land Cost", account_type: "expense", normal_balance: "debit", description: "Cost of land allocated to sold units." },
    { account_number: "5100", account_name: "Hard Costs", account_type: "expense", normal_balance: "debit", description: "Direct construction costs." },
    { account_number: "5200", account_name: "Soft Costs", account_type: "expense", normal_balance: "debit", description: "Permit fees, impact fees, professional fees." },
    { account_number: "5300", account_name: "Financing Costs", account_type: "expense", normal_balance: "debit", description: "Interest expense and loan fees." },
    { account_number: "5400", account_name: "Selling Costs", account_type: "expense", normal_balance: "debit", description: "Commissions, concessions, marketing." },
    { account_number: "6000", account_name: "Property Management", account_type: "expense", normal_balance: "debit", description: "Property management fees." },
    { account_number: "6400", account_name: "Marketing", account_type: "expense", normal_balance: "debit", description: "Marketing and advertising expenses." },
    { account_number: "6500", account_name: "Miscellaneous", account_type: "expense", normal_balance: "debit", description: "Miscellaneous operating expenses." },
  ],
  operating_company: [
    { account_number: "1000", account_name: "Cash - Operating", account_type: "asset", normal_balance: "debit", description: "Primary operating bank account." },
    { account_number: "1100", account_name: "Accounts Receivable", account_type: "asset", normal_balance: "debit", description: "Amounts due from clients." },
    { account_number: "1200", account_name: "Prepaid Expenses", account_type: "asset", normal_balance: "debit", description: "Prepaid expenses." },
    { account_number: "1500", account_name: "Fixed Assets", account_type: "asset", normal_balance: "debit", description: "Equipment, vehicles, and other fixed assets." },
    { account_number: "2000", account_name: "Accounts Payable", account_type: "liability", normal_balance: "credit", description: "Amounts owed to vendors." },
    { account_number: "2100", account_name: "Accrued Expenses", account_type: "liability", normal_balance: "credit", description: "Accrued but unpaid expenses." },
    { account_number: "2500", account_name: "Notes Payable", account_type: "liability", normal_balance: "credit", description: "Outstanding notes and loans." },
    { account_number: "3000", account_name: "Owner Equity", account_type: "equity", normal_balance: "credit", description: "Owner capital contributions." },
    { account_number: "3200", account_name: "Retained Earnings", account_type: "equity", normal_balance: "credit", description: "Cumulative net income retained." },
    { account_number: "3300", account_name: "Distributions", account_type: "equity", normal_balance: "debit", description: "Owner distributions (contra-equity)." },
    { account_number: "4000", account_name: "Builder Fee Revenue", account_type: "revenue", normal_balance: "credit", description: "Builder fee and management fee income." },
    { account_number: "4100", account_name: "Development Fee Revenue", account_type: "revenue", normal_balance: "credit", description: "Development management fee income." },
    { account_number: "4500", account_name: "Other Revenue", account_type: "revenue", normal_balance: "credit", description: "Miscellaneous revenue." },
    { account_number: "5000", account_name: "Payroll", account_type: "expense", normal_balance: "debit", description: "Salaries, wages, and payroll taxes." },
    { account_number: "5100", account_name: "Office Expenses", account_type: "expense", normal_balance: "debit", description: "Office supplies, rent, utilities." },
    { account_number: "5200", account_name: "Insurance", account_type: "expense", normal_balance: "debit", description: "Insurance premiums." },
    { account_number: "5300", account_name: "Professional Fees", account_type: "expense", normal_balance: "debit", description: "Legal, accounting, and consulting fees." },
    { account_number: "5400", account_name: "Marketing", account_type: "expense", normal_balance: "debit", description: "Marketing and advertising." },
    { account_number: "5500", account_name: "Vehicle Expense", account_type: "expense", normal_balance: "debit", description: "Vehicle lease, fuel, maintenance." },
    { account_number: "6500", account_name: "Miscellaneous", account_type: "expense", normal_balance: "debit", description: "Miscellaneous operating expenses." },
  ],
}

// Fallback COA for any other use_type
const DEFAULT_COA_FALLBACK = DEFAULT_COA_TEMPLATES.operating_company

// ---------------------------------------------------------------------------
// GET: List entities with hierarchy
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
    const parsed = EntityFilterSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    let query = supabase
      .from("entities")
      .select(
        `
        *,
        parent_entity:entities!entities_parent_entity_id_fkey(id, name),
        chart_of_accounts(id),
        fiscal_periods!inner(id, period, status)
      `,
        { count: "exact" }
      )
      .order("name", { ascending: true })
      .range(filters.offset, filters.offset + filters.limit - 1)

    // For non-dissolved, filter is_active; for dissolved, filter !is_active
    if (filters.status === "active") {
      query = query.eq("is_active", true)
    } else if (filters.status === "dissolved") {
      query = query.eq("is_active", false)
    }

    if (filters.use_type) {
      query = query.eq("use_type", filters.use_type)
    }
    if (filters.parent_entity_id) {
      query = query.eq("parent_entity_id", filters.parent_entity_id)
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,ein.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      // Retry without inner join on fiscal_periods (entity may have none)
      let retryQuery = supabase
        .from("entities")
        .select(
          `
          *,
          parent_entity:entities!entities_parent_entity_id_fkey(id, name),
          chart_of_accounts(id),
          fiscal_periods(id, period, status)
        `,
          { count: "exact" }
        )
        .order("name", { ascending: true })
        .range(filters.offset, filters.offset + filters.limit - 1)

      if (filters.status === "active") {
        retryQuery = retryQuery.eq("is_active", true)
      } else if (filters.status === "dissolved") {
        retryQuery = retryQuery.eq("is_active", false)
      }
      if (filters.use_type) {
        retryQuery = retryQuery.eq("use_type", filters.use_type)
      }
      if (filters.parent_entity_id) {
        retryQuery = retryQuery.eq("parent_entity_id", filters.parent_entity_id)
      }
      if (filters.search) {
        retryQuery = retryQuery.or(
          `name.ilike.%${filters.search}%,ein.ilike.%${filters.search}%`
        )
      }

      const { data: retryData, error: retryError, count: retryCount } = await retryQuery

      if (retryError) {
        console.error("Entities fetch error:", retryError)
        return NextResponse.json(
          { error: "Failed to fetch entities" },
          { status: 500 }
        )
      }

      const enriched = (retryData || []).map((entity: Record<string, unknown>) => {
        const accounts = entity.chart_of_accounts as { id: string }[] | null
        const periods = entity.fiscal_periods as { id: string; period: string; status: string }[] | null
        const openPeriods = (periods || []).filter((p) => p.status === "open")
        return {
          ...entity,
          account_count: (accounts || []).length,
          open_period: openPeriods.length > 0 ? openPeriods[0] : null,
        }
      })

      return NextResponse.json({
        data: enriched,
        total: retryCount || 0,
        limit: filters.limit,
        offset: filters.offset,
      })
    }

    const enriched = (data || []).map((entity: Record<string, unknown>) => {
      const accounts = entity.chart_of_accounts as { id: string }[] | null
      const periods = entity.fiscal_periods as { id: string; period: string; status: string }[] | null
      const openPeriods = (periods || []).filter((p) => p.status === "open")
      return {
        ...entity,
        account_count: (accounts || []).length,
        open_period: openPeriods.length > 0 ? openPeriods[0] : null,
      }
    })

    return NextResponse.json({
      data: enriched,
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (err) {
    console.error("Entities GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create entity with auto-COA and initial fiscal period
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
    const parsed = CreateEntitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const orgId = user.user_metadata?.organization_id
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Create the entity
    const { data: entity, error: createError } = await supabase
      .from("entities")
      .insert({
        organization_id: orgId,
        name: input.name,
        use_type: input.use_type || null,
        legal_type: input.legal_type || null,
        ein: input.ein || null,
        state_of_formation: input.state_of_formation || null,
        formation_date: input.formation_date || null,
        parent_entity_id: input.parent_entity_id || null,
        registered_agent: input.registered_agent || null,
        is_active: true,
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Create entity error:", createError)
      return NextResponse.json(
        { error: "Failed to create entity", details: createError.message },
        { status: 500 }
      )
    }

    // Try to clone COA from a template entity first
    let coaSeeded = false
    const { data: templateAccounts } = await supabase
      .from("chart_of_accounts")
      .select("account_number, account_name, account_type, normal_balance, description, is_active")
      .eq("entity_id", orgId) // Look for template entity matching org default
      .eq("is_active", true)
      .limit(1)

    // If no template entity COA found, look for any SPE template entity
    if (!templateAccounts || templateAccounts.length === 0) {
      const { data: templateEntity } = await supabase
        .from("entities")
        .select("id")
        .ilike("name", "%template%")
        .eq("organization_id", orgId)
        .limit(1)
        .single()

      if (templateEntity) {
        const { data: cloneAccounts } = await supabase
          .from("chart_of_accounts")
          .select("account_number, account_name, account_type, normal_balance, description, is_active, parent_account_id")
          .eq("entity_id", templateEntity.id)

        if (cloneAccounts && cloneAccounts.length > 0) {
          // Insert cloned accounts (without parent refs first, then update parents)
          const coaPayloads = cloneAccounts.map((acct) => ({
            entity_id: entity.id,
            account_number: acct.account_number,
            account_name: acct.account_name,
            account_type: acct.account_type,
            normal_balance: acct.normal_balance,
            description: acct.description,
            is_active: acct.is_active,
          }))

          const { error: coaError } = await supabase
            .from("chart_of_accounts")
            .insert(coaPayloads)

          if (!coaError) {
            coaSeeded = true
          }
        }
      }
    }

    // If no template was cloned, seed from default COA templates
    if (!coaSeeded) {
      const useType = input.use_type || "operating_company"
      const template = DEFAULT_COA_TEMPLATES[useType] || DEFAULT_COA_FALLBACK

      const coaPayloads = template.map((acct) => ({
        entity_id: entity.id,
        account_number: acct.account_number,
        account_name: acct.account_name,
        account_type: acct.account_type,
        normal_balance: acct.normal_balance,
        description: acct.description,
        is_active: true,
      }))

      const { error: coaError } = await supabase
        .from("chart_of_accounts")
        .insert(coaPayloads)

      if (coaError) {
        console.error("Seed COA error:", coaError)
        // Non-fatal: entity was created, COA seeding failed
      }
    }

    // Create initial fiscal period (current month)
    const now = new Date()
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`

    const { error: periodError } = await supabase
      .from("fiscal_periods")
      .insert({
        entity_id: entity.id,
        period: currentPeriod,
        status: "open",
      })

    if (periodError) {
      console.error("Create initial fiscal period error:", periodError)
    }

    // Activity log
    await supabase.from("activity_log").insert({
      organization_id: orgId,
      user_id: user.id,
      record_type: "entity",
      record_id: entity.id,
      action: "created",
      description: `Created entity: ${entity.name}`,
      metadata: {
        use_type: input.use_type,
        legal_type: input.legal_type,
        coa_seeded: true,
        initial_period: currentPeriod,
      },
    })

    return NextResponse.json({ data: entity }, { status: 201 })
  } catch (err) {
    console.error("Entities POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
