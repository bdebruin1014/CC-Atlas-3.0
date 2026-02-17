import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// GET: Aggregate stats for all listings linked to a project
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    // Fetch all listings for this project
    const { data: listings, error } = await supabase
      .from("disposition_listings")
      .select("id, status, list_price, original_list_price, listing_date, dom")
      .eq("project_id", projectId)

    if (error) throw error

    const all = listings ?? []
    const total_units = all.length

    const contracted = all.filter(
      (l) => l.status === "under_contract" || l.status === "pending_closing"
    ).length

    const sold = all.filter((l) => l.status === "closed").length
    const remaining = total_units - sold - contracted

    // Revenue calculations
    const total_revenue = all
      .filter((l) => l.status === "closed")
      .reduce((sum, l) => sum + (l.list_price ?? 0), 0)

    const pending_revenue = all
      .filter(
        (l) => l.status === "under_contract" || l.status === "pending_closing"
      )
      .reduce((sum, l) => sum + (l.list_price ?? 0), 0)

    // Average DOM for closed/under_contract listings
    const listingsWithDom = all.filter(
      (l) =>
        l.dom !== null &&
        (l.status === "closed" ||
          l.status === "under_contract" ||
          l.status === "pending_closing")
    )
    const avg_dom =
      listingsWithDom.length > 0
        ? Math.round(
            listingsWithDom.reduce((sum, l) => sum + (l.dom ?? 0), 0) /
              listingsWithDom.length
          )
        : 0

    // Average sale vs list price percentage
    const closedWithPrices = all.filter(
      (l) =>
        l.status === "closed" &&
        l.list_price !== null &&
        l.original_list_price !== null &&
        l.original_list_price > 0
    )
    const avg_sale_vs_list_pct =
      closedWithPrices.length > 0
        ? Math.round(
            (closedWithPrices.reduce(
              (sum, l) => sum + (l.list_price! / l.original_list_price!) * 100,
              0
            ) /
              closedWithPrices.length) *
              100
          ) / 100
        : 0

    // Absorption rate: sold per month
    const listingsWithDates = all.filter(
      (l) => l.listing_date !== null
    )
    let absorption_rate = 0
    if (listingsWithDates.length > 0 && sold > 0) {
      const dates = listingsWithDates.map(
        (l) => new Date(l.listing_date!).getTime()
      )
      const earliest = Math.min(...dates)
      const monthsElapsed = Math.max(
        1,
        (Date.now() - earliest) / (1000 * 60 * 60 * 24 * 30)
      )
      absorption_rate = Math.round((sold / monthsElapsed) * 100) / 100
    }

    // Fetch total concessions from all closed offers
    const closedListingIds = all
      .filter((l) => l.status === "closed")
      .map((l) => l.id)

    let concession_total = 0
    if (closedListingIds.length > 0) {
      const { data: offers } = await supabase
        .from("disposition_offers")
        .select("closing_cost_assistance, other_concessions")
        .in("listing_id", closedListingIds)
        .eq("status", "accepted")

      concession_total = (offers ?? []).reduce(
        (sum, o) =>
          sum +
          (o.closing_cost_assistance ?? 0) +
          (o.other_concessions ?? 0),
        0
      )
    }

    return NextResponse.json({
      data: {
        total_units,
        contracted,
        sold,
        remaining,
        total_revenue,
        pending_revenue,
        avg_dom,
        avg_sale_vs_list_pct,
        absorption_rate,
        concession_total,
      },
    })
  } catch (err) {
    console.error(
      "GET /api/disposition/community/[projectId] error:",
      err
    )
    return NextResponse.json(
      { error: "Failed to fetch community stats" },
      { status: 500 }
    )
  }
}
