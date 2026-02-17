import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_date: z.string().optional().nullable(),
  module: z
    .enum(["opportunity", "project", "construction", "disposition", "general"])
    .default("general"),
  linked_record_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z
    .enum(["not_started", "in_progress", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  module: z
    .enum(["opportunity", "project", "construction", "disposition", "general"])
    .optional(),
  linked_record_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

const DeleteTaskSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// GET: Fetch tasks with filters
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 403 })
    }

    const params = request.nextUrl.searchParams

    // Build query
    let query = supabase
      .from("standalone_tasks")
      .select(
        `
        *,
        assigned_user:profiles!standalone_tasks_assigned_to_fkey(
          id, first_name, last_name, avatar_url
        ),
        creator:profiles!standalone_tasks_created_by_fkey(
          id, first_name, last_name
        )
      `
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })

    // Status filter
    const statuses = params.get("status")
    if (statuses) {
      query = query.in("status", statuses.split(","))
    }

    // Priority filter
    const priorities = params.get("priority")
    if (priorities) {
      query = query.in("priority", priorities.split(","))
    }

    // Module filter
    const modules = params.get("module")
    if (modules) {
      query = query.in("module", modules.split(","))
    }

    // Assignee filter
    const assignee = params.get("assigned_to")
    if (assignee) {
      if (assignee === "unassigned") {
        query = query.is("assigned_to", null)
      } else {
        query = query.eq("assigned_to", assignee)
      }
    }

    // Due date range
    const dueDateFrom = params.get("due_date_from")
    if (dueDateFrom) {
      query = query.gte("due_date", dueDateFrom)
    }
    const dueDateTo = params.get("due_date_to")
    if (dueDateTo) {
      query = query.lte("due_date", dueDateTo)
    }

    // Title search
    const search = params.get("search")
    if (search) {
      query = query.ilike("title", `%${search}%`)
    }

    // Overdue filter
    const overdue = params.get("overdue")
    if (overdue === "true") {
      const today = new Date().toISOString().split("T")[0]
      query = query
        .lt("due_date", today)
        .not("status", "in", '("completed","cancelled")')
    }

    // Linked record filter
    const linkedRecordId = params.get("linked_record_id")
    if (linkedRecordId) {
      query = query.eq("linked_record_id", linkedRecordId)
    }

    // Due today filter
    const dueToday = params.get("due_today")
    if (dueToday === "true") {
      const today = new Date().toISOString().split("T")[0]
      query = query.eq("due_date", today)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error("GET /api/tasks error:", err)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Create a new standalone task
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("standalone_tasks")
      .insert({
        ...parsed.data,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select(
        `
        *,
        assigned_user:profiles!standalone_tasks_assigned_to_fkey(
          id, first_name, last_name, avatar_url
        )
      `
      )
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/tasks error:", err)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH: Update an existing standalone task
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
    const parsed = UpdateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...updates } = parsed.data

    // Auto-set completed_at/completed_by
    const updateData: Record<string, unknown> = { ...updates }
    if (updates.status === "completed") {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = user.id
    } else if (updates.status) {
      updateData.completed_at = null
      updateData.completed_by = null
    }

    const { data, error } = await supabase
      .from("standalone_tasks")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        assigned_user:profiles!standalone_tasks_assigned_to_fkey(
          id, first_name, last_name, avatar_url
        )
      `
      )
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PATCH /api/tasks error:", err)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE: Delete a standalone task
// ---------------------------------------------------------------------------
export async function DELETE(request: Request) {
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
    const parsed = DeleteTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("standalone_tasks")
      .delete()
      .eq("id", parsed.data.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/tasks error:", err)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
