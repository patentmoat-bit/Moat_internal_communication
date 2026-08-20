import { GlobalExceptionHandler } from "@/lib/errors";
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { MOCK_PATENTS } from "@/lib/mockData"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: alerts } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ notifications: [] })
    }

    const notifications: Array<{
      alertId: string
      alertName: string
      type: string
      newMatches: number
      topMatches: Array<{ title: string; publicationNumber: string; summary: string }>
    }> = []

    for (const alert of alerts) {
      const criteria = alert.criteria || {}
      const keywords: string[] = criteria.keywords || []
      const assignees: string[] = criteria.assignees || []
      const ipcCodes: string[] = criteria.ipcCodes || []

      const matches = MOCK_PATENTS.filter((p) => {
        let matched = keywords.length === 0
        for (const kw of keywords) {
          if (
            p.title.toLowerCase().includes(kw.toLowerCase()) ||
            p.abstract.toLowerCase().includes(kw.toLowerCase()) ||
            p.assignee.toLowerCase().includes(kw.toLowerCase())
          ) {
            matched = true
            break
          }
        }
        if (assignees.length > 0) {
          matched =
            matched &&
            assignees.some((a: string) => p.assignee.toLowerCase().includes(a.toLowerCase()))
        }
        if (ipcCodes.length > 0) {
          matched =
            matched &&
            ipcCodes.some((ipc: string) =>
              p.ipc_classifications.some((pic) => pic.includes(ipc))
            )
        }
        return matched
      })

      if (matches.length > 0) {
        const top3 = matches.slice(0, 3).map((p) => ({
          title: p.title,
          publicationNumber: p.patent_number,
          summary: p.abstract.substring(0, 120) + "...",
        }))
        notifications.push({
          alertId: alert.id,
          alertName: alert.name,
          type: alert.alert_type,
          newMatches: matches.length,
          topMatches: top3,
        })

        await supabase
          .from("alerts")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", alert.id)
      }
    }

    return NextResponse.json({ notifications })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
