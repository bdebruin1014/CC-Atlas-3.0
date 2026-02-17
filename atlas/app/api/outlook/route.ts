import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const SendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one recipient required"),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  body_type: z.enum(["text", "html"]).default("html"),
  importance: z.enum(["low", "normal", "high"]).default("normal"),
  save_to_sent: z.boolean().default(true),
})

const SyncCalendarSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
  start_datetime: z.string().min(1, "Start date is required"),
  end_datetime: z.string().min(1, "End date is required"),
  is_all_day: z.boolean().default(false),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  calendar_event_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// Helper: Get Microsoft Graph token for delegated access
// ---------------------------------------------------------------------------
async function getGraphToken(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<string | null> {
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("config")
    .eq("provider", "outlook")
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!settings?.config) return null

  const config = settings.config as {
    tenant_id?: string
    client_id?: string
    client_secret?: string
    user_principal_name?: string
  }

  if (!config.tenant_id || !config.client_id || !config.client_secret) {
    return null
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`
  const params = new URLSearchParams({
    client_id: config.client_id,
    client_secret: config.client_secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  })

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!resp.ok) {
    console.error("Outlook token error:", await resp.text())
    return null
  }

  const data = await resp.json()
  return data.access_token || null
}

// ---------------------------------------------------------------------------
// Helper: Get the user principal name (email) for Graph API calls
// ---------------------------------------------------------------------------
async function getUserPrincipal(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<string | null> {
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("config")
    .eq("provider", "outlook")
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!settings?.config) return null
  const config = settings.config as { user_principal_name?: string }
  return config.user_principal_name || null
}

// ---------------------------------------------------------------------------
// POST: Send email or sync calendar event
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
    const action = body.action as string

    const token = await getGraphToken(supabase)
    if (!token) {
      return NextResponse.json(
        { error: "Outlook integration not configured" },
        { status: 503 }
      )
    }

    const userPrincipal = await getUserPrincipal(supabase)
    if (!userPrincipal) {
      return NextResponse.json(
        { error: "Outlook user principal not configured" },
        { status: 503 }
      )
    }

    if (action === "send") {
      // ---- Send email ----
      const parsed = SendEmailSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data

      const message: Record<string, unknown> = {
        subject: input.subject,
        body: {
          contentType: input.body_type === "html" ? "HTML" : "Text",
          content: input.body,
        },
        toRecipients: input.to.map((email) => ({
          emailAddress: { address: email },
        })),
        importance: input.importance,
      }

      if (input.cc && input.cc.length > 0) {
        message.ccRecipients = input.cc.map((email) => ({
          emailAddress: { address: email },
        }))
      }

      if (input.bcc && input.bcc.length > 0) {
        message.bccRecipients = input.bcc.map((email) => ({
          emailAddress: { address: email },
        }))
      }

      const graphUrl = `https://graph.microsoft.com/v1.0/users/${userPrincipal}/sendMail`

      const resp = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          saveToSentItems: input.save_to_sent,
        }),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error("Outlook send email error:", errText)
        return NextResponse.json(
          { error: "Failed to send email", details: errText },
          { status: resp.status }
        )
      }

      // Log activity
      const orgId = user.user_metadata?.organization_id
      if (orgId) {
        await supabase.from("activity_log").insert({
          organization_id: orgId,
          user_id: user.id,
          record_type: "email",
          action: "sent",
          description: `Email sent to ${input.to.join(", ")}: ${input.subject}`,
        })
      }

      return NextResponse.json(
        { message: "Email sent successfully" },
        { status: 200 }
      )
    } else if (action === "calendar") {
      // ---- Sync calendar event ----
      const parsed = SyncCalendarSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data

      const event: Record<string, unknown> = {
        subject: input.subject,
        body: input.body
          ? { contentType: "HTML", content: input.body }
          : undefined,
        start: {
          dateTime: input.start_datetime,
          timeZone: "America/New_York",
        },
        end: {
          dateTime: input.end_datetime,
          timeZone: "America/New_York",
        },
        isAllDay: input.is_all_day,
      }

      if (input.location) {
        event.location = { displayName: input.location }
      }

      if (input.attendees && input.attendees.length > 0) {
        event.attendees = input.attendees.map((email) => ({
          emailAddress: { address: email },
          type: "required",
        }))
      }

      const graphUrl = `https://graph.microsoft.com/v1.0/users/${userPrincipal}/events`

      const resp = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error("Outlook calendar error:", errText)
        return NextResponse.json(
          { error: "Failed to create calendar event", details: errText },
          { status: resp.status }
        )
      }

      const createdEvent = await resp.json()

      // If linked to an ATLAS calendar event, store the Outlook event ID
      if (input.calendar_event_id) {
        await supabase
          .from("calendar_events")
          .update({ outlook_event_id: createdEvent.id })
          .eq("id", input.calendar_event_id)
      }

      return NextResponse.json(
        {
          data: {
            outlook_event_id: createdEvent.id,
            web_link: createdEvent.webLink,
          },
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'send' or 'calendar'." },
      { status: 400 }
    )
  } catch (err) {
    console.error("Outlook POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
