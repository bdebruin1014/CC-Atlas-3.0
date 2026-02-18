import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// GET /api/search?q=<query>
// Cross-module search across opportunities, projects, jobs, disposition
// listings, contacts, and entities. Returns max 5 per module.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({
        opportunities: [],
        projects: [],
        construction: [],
        disposition: [],
        contacts: [],
        entities: [],
      })
    }

    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pattern = `%${q}%`

    // Run all searches in parallel
    const [opps, projs, jobs, listings, contacts, ents] = await Promise.all([
      // 1. Opportunities
      supabase
        .from("opportunities")
        .select("id, name, type, current_stage, address_street, address_city")
        .or(`name.ilike.${pattern},address_street.ilike.${pattern},address_city.ilike.${pattern}`)
        .limit(5),

      // 2. Projects
      supabase
        .from("projects")
        .select("id, name, project_number, type, status, address_street")
        .or(`name.ilike.${pattern},project_number.ilike.${pattern},address_street.ilike.${pattern}`)
        .limit(5),

      // 3. Jobs (construction)
      supabase
        .from("jobs")
        .select("id, name, job_number, status")
        .or(`name.ilike.${pattern},job_number.ilike.${pattern}`)
        .limit(5),

      // 4. Disposition listings
      supabase
        .from("disposition_listings")
        .select("id, listing_number, property_address, status")
        .or(`listing_number.ilike.${pattern},property_address.ilike.${pattern}`)
        .limit(5),

      // 5. Contacts
      supabase
        .from("contacts")
        .select("id, first_name, last_name, company")
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},company.ilike.${pattern}`)
        .limit(5),

      // 6. Entities
      supabase
        .from("entities")
        .select("id, name, use_type")
        .or(`name.ilike.${pattern}`)
        .limit(5),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRows = (rows: any[] | null) => rows ?? []

    return NextResponse.json({
      opportunities: mapRows(opps.data).map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        stage: o.current_stage,
        address: [o.address_street, o.address_city].filter(Boolean).join(", "),
      })),
      projects: mapRows(projs.data).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        address: p.address_street || p.project_number,
      })),
      construction: mapRows(jobs.data).map((j) => ({
        id: j.id,
        name: j.name || j.job_number,
        status: j.status,
      })),
      disposition: mapRows(listings.data).map((l) => ({
        id: l.id,
        listing_number: l.listing_number,
        address: l.property_address,
        status: l.status,
      })),
      contacts: mapRows(contacts.data).map((c) => ({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(" "),
        company: c.company,
      })),
      entities: mapRows(ents.data).map((e) => ({
        id: e.id,
        name: e.name,
        type: e.use_type,
      })),
    })
  } catch (err) {
    console.error("Search API error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
