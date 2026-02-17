import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const SendForSignatureSchema = z.object({
  template_id: z.number().int().positive(),
  signers: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.string().optional(),
      })
    )
    .min(1, "At least one signer required"),
  send_email: z.boolean().default(true),
  message: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
  // ATLAS record linking
  record_type: z.string().optional(),
  record_id: z.string().uuid().optional(),
})

const CheckStatusSchema = z.object({
  submission_id: z.coerce.number().int().positive(),
})

const WebhookPayloadSchema = z.object({
  event_type: z.string(),
  timestamp: z.string(),
  data: z.object({
    id: z.number(),
    status: z.string(),
    submitters: z.array(
      z.object({
        id: z.number(),
        email: z.string(),
        status: z.string(),
        completed_at: z.string().nullable().optional(),
      })
    ).optional(),
  }),
})

// ---------------------------------------------------------------------------
// Helper: Get DocuSeal API configuration
// ---------------------------------------------------------------------------
async function getDocuSealConfig(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<{ apiKey: string; baseUrl: string } | null> {
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("config")
    .eq("provider", "docuseal" as string)
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!settings?.config) {
    // Fall back to environment variables
    const apiKey = process.env.DOCUSEAL_API_KEY
    const baseUrl = process.env.DOCUSEAL_API_URL || "https://api.docuseal.co"
    if (!apiKey) return null
    return { apiKey, baseUrl }
  }

  const config = settings.config as {
    api_key?: string
    base_url?: string
  }

  if (!config.api_key) return null

  return {
    apiKey: config.api_key,
    baseUrl: config.base_url || "https://api.docuseal.co",
  }
}

// ---------------------------------------------------------------------------
// POST: Send for signature or handle webhook
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const action = body.action as string

    // ---- Webhook handler (no auth required) ----
    if (action === "webhook") {
      const parsed = WebhookPayloadSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid webhook payload" },
          { status: 400 }
        )
      }

      const webhook = parsed.data

      // Handle completion events
      if (
        webhook.event_type === "submission.completed" ||
        webhook.event_type === "form.completed"
      ) {
        // Find linked document by submission ID
        const { data: docs } = await supabase
          .from("documents")
          .select("id, record_type, record_id")
          .eq(
            "storage_path",
            `docuseal:${webhook.data.id}`
          )
          .limit(1)

        if (docs && docs.length > 0) {
          const doc = docs[0]

          // Log activity
          await supabase.from("activity_log").insert({
            organization_id:
              (
                await supabase
                  .from("organizations")
                  .select("id")
                  .limit(1)
                  .single()
              ).data?.id || null,
            record_type: doc.record_type,
            record_id: doc.record_id,
            action: "signature_completed",
            description: `Document signature completed (submission ${webhook.data.id})`,
            metadata: {
              submission_id: webhook.data.id,
              status: webhook.data.status,
            },
          })
        }
      }

      return NextResponse.json({ received: true })
    }

    // ---- Authenticated actions ----
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await getDocuSealConfig(supabase)
    if (!config) {
      return NextResponse.json(
        { error: "DocuSeal integration not configured" },
        { status: 503 }
      )
    }

    if (action === "send") {
      // ---- Send for signature ----
      const parsed = SendForSignatureSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data

      // Build DocuSeal API payload
      const submissionPayload: Record<string, unknown> = {
        template_id: input.template_id,
        send_email: input.send_email,
        submitters: input.signers.map((s) => ({
          name: s.name,
          email: s.email,
          role: s.role || "Signer",
        })),
      }

      if (input.message) {
        submissionPayload.message = { body: input.message }
      }

      if (input.fields) {
        submissionPayload.fields = Object.entries(input.fields).map(
          ([name, value]) => ({
            name,
            default_value: value,
            readonly: true,
          })
        )
      }

      const resp = await fetch(`${config.baseUrl}/submissions`, {
        method: "POST",
        headers: {
          Authorization: `Token ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error("DocuSeal send error:", errText)
        return NextResponse.json(
          { error: "Failed to send for signature", details: errText },
          { status: resp.status }
        )
      }

      const submission = await resp.json()

      // Save document record linking to ATLAS
      if (input.record_type && input.record_id) {
        await supabase.from("documents").insert({
          record_type: input.record_type,
          record_id: input.record_id,
          name: `DocuSeal Submission #${submission.id || submission[0]?.submission_id}`,
          file_type: "application/pdf",
          storage_path: `docuseal:${submission.id || submission[0]?.submission_id}`,
          uploaded_by: user.id,
        })
      }

      // Activity log
      const orgId = user.user_metadata?.organization_id
      if (orgId) {
        await supabase.from("activity_log").insert({
          organization_id: orgId,
          user_id: user.id,
          record_type: input.record_type || "document",
          record_id: input.record_id,
          action: "sent_for_signature",
          description: `Sent document for signature to ${input.signers.map((s) => s.email).join(", ")}`,
          metadata: {
            template_id: input.template_id,
            submission_id: submission.id || submission[0]?.submission_id,
          },
        })
      }

      return NextResponse.json({ data: submission }, { status: 201 })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'send' or 'webhook'." },
      { status: 400 }
    )
  } catch (err) {
    console.error("DocuSeal POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// GET: Check signature status
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
    const parsed = CheckStatusSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const config = await getDocuSealConfig(supabase)
    if (!config) {
      return NextResponse.json(
        { error: "DocuSeal integration not configured" },
        { status: 503 }
      )
    }

    const resp = await fetch(
      `${config.baseUrl}/submissions/${parsed.data.submission_id}`,
      {
        headers: {
          Authorization: `Token ${config.apiKey}`,
        },
      }
    )

    if (!resp.ok) {
      const errText = await resp.text()
      console.error("DocuSeal status error:", errText)
      return NextResponse.json(
        { error: "Failed to check status", details: errText },
        { status: resp.status }
      )
    }

    const submission = await resp.json()

    return NextResponse.json({
      data: {
        id: submission.id,
        status: submission.status,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        submitters: submission.submitters?.map(
          (s: Record<string, unknown>) => ({
            email: s.email,
            status: s.status,
            completed_at: s.completed_at,
          })
        ),
        documents: submission.documents?.map(
          (d: Record<string, unknown>) => ({
            name: d.name,
            url: d.url,
          })
        ),
      },
    })
  } catch (err) {
    console.error("DocuSeal GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
