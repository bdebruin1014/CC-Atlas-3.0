import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const CreateFolderSchema = z.object({
  site_id: z.string().optional(),
  drive_id: z.string().optional(),
  parent_path: z.string().min(1, "Parent path is required"),
  folder_name: z.string().min(1, "Folder name is required"),
  record_type: z.string().optional(),
  record_id: z.string().uuid().optional(),
})

const UploadDocumentSchema = z.object({
  site_id: z.string().optional(),
  drive_id: z.string().optional(),
  folder_path: z.string().min(1, "Folder path is required"),
  file_name: z.string().min(1, "File name is required"),
  content_base64: z.string().min(1, "File content is required"),
  content_type: z.string().default("application/octet-stream"),
  record_type: z.string().optional(),
  record_id: z.string().uuid().optional(),
})

const ListDocumentsSchema = z.object({
  site_id: z.string().optional(),
  drive_id: z.string().optional(),
  folder_path: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Helper: Get Microsoft Graph access token
// ---------------------------------------------------------------------------
async function getGraphToken(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, orgId: string): Promise<string | null> {
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("config")
    .eq("provider", "sharepoint")
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!settings?.config) return null

  const config = settings.config as {
    tenant_id?: string
    client_id?: string
    client_secret?: string
  }

  if (!config.tenant_id || !config.client_id || !config.client_secret) {
    return null
  }

  // OAuth2 client credentials flow
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
    console.error("SharePoint token error:", await resp.text())
    return null
  }

  const data = await resp.json()
  return data.access_token || null
}

// ---------------------------------------------------------------------------
// Helper: Get default site and drive from config
// ---------------------------------------------------------------------------
async function getDefaultIds(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<{ siteId: string; driveId: string } | null> {
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("config")
    .eq("provider", "sharepoint")
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!settings?.config) return null

  const config = settings.config as {
    default_site_id?: string
    default_drive_id?: string
  }

  if (!config.default_site_id || !config.default_drive_id) return null

  return {
    siteId: config.default_site_id,
    driveId: config.default_drive_id,
  }
}

// ---------------------------------------------------------------------------
// GET: List documents in a SharePoint folder
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
    const parsed = ListDocumentsSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const orgId = user.user_metadata?.organization_id
    const token = await getGraphToken(supabase, orgId)
    if (!token) {
      return NextResponse.json(
        { error: "SharePoint integration not configured" },
        { status: 503 }
      )
    }

    const defaults = await getDefaultIds(supabase)
    const siteId = parsed.data.site_id || defaults?.siteId
    const driveId = parsed.data.drive_id || defaults?.driveId

    if (!siteId || !driveId) {
      return NextResponse.json(
        { error: "SharePoint site and drive IDs are required" },
        { status: 400 }
      )
    }

    const folderPath = encodeURIComponent(parsed.data.folder_path)
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${folderPath}:/children`

    const resp = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error("SharePoint list error:", errText)
      return NextResponse.json(
        { error: "Failed to list documents from SharePoint", details: errText },
        { status: resp.status }
      )
    }

    const data = await resp.json()
    const items = (data.value || []).map(
      (item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        created: (item.createdDateTime as string) || null,
        modified: (item.lastModifiedDateTime as string) || null,
        web_url: item.webUrl,
        is_folder: !!(item.folder as Record<string, unknown>),
        mime_type:
          (item.file as Record<string, unknown>)?.mimeType || null,
      })
    )

    return NextResponse.json({ data: items })
  } catch (err) {
    console.error("SharePoint GET error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create folder or upload document
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

    const orgId = user.user_metadata?.organization_id
    const token = await getGraphToken(supabase, orgId)
    if (!token) {
      return NextResponse.json(
        { error: "SharePoint integration not configured" },
        { status: 503 }
      )
    }

    const defaults = await getDefaultIds(supabase)
    const body = await request.json()

    // Determine action: folder creation or file upload
    const action = body.action || (body.content_base64 ? "upload" : "folder")

    if (action === "folder") {
      // ---- Create folder ----
      const parsed = CreateFolderSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data
      const siteId = input.site_id || defaults?.siteId
      const driveId = input.drive_id || defaults?.driveId

      if (!siteId || !driveId) {
        return NextResponse.json(
          { error: "SharePoint site and drive IDs are required" },
          { status: 400 }
        )
      }

      const parentPath = encodeURIComponent(input.parent_path)
      const graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${parentPath}:/children`

      const resp = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: input.folder_name,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        }),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error("SharePoint create folder error:", errText)
        return NextResponse.json(
          { error: "Failed to create folder", details: errText },
          { status: resp.status }
        )
      }

      const folder = await resp.json()

      return NextResponse.json({
        data: {
          id: folder.id,
          name: folder.name,
          web_url: folder.webUrl,
        },
      }, { status: 201 })
    } else if (action === "upload") {
      // ---- Upload document ----
      const parsed = UploadDocumentSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const input = parsed.data
      const siteId = input.site_id || defaults?.siteId
      const driveId = input.drive_id || defaults?.driveId

      if (!siteId || !driveId) {
        return NextResponse.json(
          { error: "SharePoint site and drive IDs are required" },
          { status: 400 }
        )
      }

      const filePath = encodeURIComponent(
        `${input.folder_path}/${input.file_name}`
      )
      const graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${filePath}:/content`

      // Decode base64 content
      const buffer = Buffer.from(input.content_base64, "base64")

      const resp = await fetch(graphUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": input.content_type,
        },
        body: buffer,
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error("SharePoint upload error:", errText)
        return NextResponse.json(
          { error: "Failed to upload document", details: errText },
          { status: resp.status }
        )
      }

      const file = await resp.json()

      // Save document record in ATLAS
      if (input.record_type && input.record_id) {
        await supabase.from("documents").insert({
          record_type: input.record_type,
          record_id: input.record_id,
          name: input.file_name,
          file_type: input.content_type,
          file_size_bytes: buffer.length,
          sharepoint_url: file.webUrl,
          sharepoint_folder: input.folder_path,
          uploaded_by: user.id,
        })
      }

      return NextResponse.json({
        data: {
          id: file.id,
          name: file.name,
          size: file.size,
          web_url: file.webUrl,
        },
      }, { status: 201 })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'folder' or 'upload'." },
      { status: 400 }
    )
  } catch (err) {
    console.error("SharePoint POST error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
