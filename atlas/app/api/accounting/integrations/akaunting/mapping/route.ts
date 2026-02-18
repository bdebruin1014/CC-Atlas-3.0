import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const UpdateMappingSchema = z.object({
  mappings: z
    .array(
      z.object({
        atlas_account_id: z.string().uuid("atlas_account_id must be a valid UUID"),
        akaunting_account_id: z
          .number()
          .int()
          .positive("akaunting_account_id must be a positive integer"),
      })
    )
    .min(1, "At least one mapping is required"),
})

// ---------------------------------------------------------------------------
// GET: Account mapping table from integration_settings
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

    // Fetch integration settings for Akaunting
    const { data: settings, error: settingsError } = await supabase
      .from("integration_settings")
      .select("id, config, is_active, updated_at")
      .eq("provider", "akaunting")
      .limit(1)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({
        data: {
          is_configured: false,
          mappings: [],
          total: 0,
        },
      })
    }

    const config = settings.config as {
      account_mappings?: Array<{
        atlas_account_id: string
        akaunting_account_id: number
      }>
    } | null

    const mappings = config?.account_mappings || []

    // Enrich mappings with ATLAS account details
    if (mappings.length > 0) {
      const atlasAccountIds = mappings.map((m) => m.atlas_account_id)

      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name, account_type, entity_id")
        .in("id", atlasAccountIds)

      const accountMap: Record<
        string,
        { account_number: string; account_name: string; account_type: string; entity_id: string }
      > = {}
      if (accounts) {
        for (const acct of accounts) {
          accountMap[acct.id] = {
            account_number: acct.account_number,
            account_name: acct.account_name,
            account_type: acct.account_type as string,
            entity_id: acct.entity_id,
          }
        }
      }

      const enrichedMappings = mappings.map((m) => ({
        atlas_account_id: m.atlas_account_id,
        akaunting_account_id: m.akaunting_account_id,
        atlas_account: accountMap[m.atlas_account_id] || null,
      }))

      return NextResponse.json({
        data: {
          is_configured: settings.is_active,
          settings_id: settings.id,
          updated_at: settings.updated_at,
          mappings: enrichedMappings,
          total: enrichedMappings.length,
        },
      })
    }

    return NextResponse.json({
      data: {
        is_configured: settings.is_active,
        settings_id: settings.id,
        updated_at: settings.updated_at,
        mappings: [],
        total: 0,
      },
    })
  } catch (err) {
    console.error("Akaunting mapping GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PUT: Update account mappings
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
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
    const parsed = UpdateMappingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { mappings } = parsed.data

    // Validate that all atlas_account_ids exist
    const atlasAccountIds = mappings.map((m) => m.atlas_account_id)
    const { data: existingAccounts } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .in("id", atlasAccountIds)

    const existingIds = new Set((existingAccounts || []).map((a) => a.id))
    const missingIds = atlasAccountIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid atlas_account_id(s)",
          details: `The following account IDs do not exist: ${missingIds.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Fetch existing integration settings
    const { data: settings } = await supabase
      .from("integration_settings")
      .select("id, config")
      .eq("provider", "akaunting")
      .limit(1)
      .single()

    if (!settings) {
      // Create integration settings if they don't exist
      const { data: newSettings, error: createError } = await supabase
        .from("integration_settings")
        .insert({
          provider: "akaunting",
          is_active: true,
          config: {
            account_mappings: mappings.map((m) => ({
              atlas_account_id: m.atlas_account_id,
              akaunting_account_id: m.akaunting_account_id,
            })),
          },
        })
        .select("id, config, updated_at")
        .single()

      if (createError) {
        console.error("Create integration settings error:", createError)
        return NextResponse.json(
          { error: "Failed to create integration settings", details: createError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: {
          settings_id: newSettings?.id,
          mappings_updated: mappings.length,
          updated_at: newSettings?.updated_at,
        },
      })
    }

    // Update existing settings with new mappings
    const existingConfig = (settings.config || {}) as Record<string, unknown>
    const updatedConfig = {
      ...existingConfig,
      account_mappings: mappings.map((m) => ({
        atlas_account_id: m.atlas_account_id,
        akaunting_account_id: m.akaunting_account_id,
      })),
    }

    const { data: updated, error: updateError } = await supabase
      .from("integration_settings")
      .update({ config: updatedConfig })
      .eq("id", settings.id)
      .select("id, updated_at")
      .single()

    if (updateError) {
      console.error("Update integration settings error:", updateError)
      return NextResponse.json(
        { error: "Failed to update mappings", details: updateError.message },
        { status: 500 }
      )
    }

    // Activity log
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      await supabase.from("activity_log").insert({
        organization_id: orgId,
        user_id: user.id,
        record_type: "akaunting_mapping",
        action: "updated",
        description: `Updated ${mappings.length} Akaunting account mapping(s)`,
        metadata: {
          mappings_count: mappings.length,
          settings_id: settings.id,
        },
      })
    }

    return NextResponse.json({
      data: {
        settings_id: updated?.id,
        mappings_updated: mappings.length,
        updated_at: updated?.updated_at,
      },
    })
  } catch (err) {
    console.error("Akaunting mapping PUT error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
