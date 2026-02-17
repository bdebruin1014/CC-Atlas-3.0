import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const RecordResponseSchema = z.object({
  amount_received: z.number().min(0, "Amount received must be non-negative"),
  received_date: z.string().min(1, "Received date is required"),
})

// ---------------------------------------------------------------------------
// PATCH: Record capital call response (payment received)
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = RecordResponseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Fetch the response
    const { data: response, error: fetchError } = await supabase
      .from("capital_call_responses")
      .select("*")
      .eq("id", responseId)
      .eq("capital_call_id", id)
      .single()

    if (fetchError || !response) {
      return NextResponse.json(
        { error: "Capital call response not found" },
        { status: 404 }
      )
    }

    // Determine new status
    const totalReceived = input.amount_received
    let newStatus: string
    if (totalReceived >= response.amount_called) {
      newStatus = "received"
    } else if (totalReceived > 0) {
      newStatus = "partial"
    } else {
      newStatus = "pending"
    }

    // Update the response
    const { data: updated, error: updateError } = await supabase
      .from("capital_call_responses")
      .update({
        amount_received: input.amount_received,
        received_date: input.received_date,
        status: newStatus,
      })
      .eq("id", responseId)
      .select("*")
      .single()

    if (updateError) {
      console.error("Update response error:", updateError)
      return NextResponse.json(
        { error: "Failed to update response", details: updateError.message },
        { status: 500 }
      )
    }

    // Update the investor's contributed_to_date
    if (input.amount_received > 0) {
      const { data: investor } = await supabase
        .from("investors")
        .select("contributed_to_date")
        .eq("id", response.investor_id)
        .single()

      if (investor) {
        const previousReceived = response.amount_received || 0
        const delta = input.amount_received - previousReceived
        await supabase
          .from("investors")
          .update({
            contributed_to_date: (investor.contributed_to_date || 0) + delta,
          })
          .eq("id", response.investor_id)
      }
    }

    // Check and update the capital call's overall status
    const { data: allResponses } = await supabase
      .from("capital_call_responses")
      .select("amount_called, amount_received, status")
      .eq("capital_call_id", id)

    if (allResponses) {
      const allReceived = allResponses.every((r) => r.status === "received")
      const someReceived = allResponses.some(
        (r) => r.status === "received" || r.status === "partial"
      )

      let callStatus: string
      if (allReceived) {
        callStatus = "fully_funded"
      } else if (someReceived) {
        callStatus = "partially_funded"
      } else {
        callStatus = "issued"
      }

      await supabase
        .from("capital_calls")
        .update({ status: callStatus })
        .eq("id", id)
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("Capital call response PATCH error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
