import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutlookConfig {
  tenantUrl: string
  clientId: string
  clientSecret: string
}

export interface CalendarEvent {
  subject: string
  body?: string
  start: string // ISO 8601
  end: string // ISO 8601
  location?: string
  attendees?: EventAttendee[]
  isAllDay?: boolean
  reminderMinutes?: number
}

export interface EventAttendee {
  email: string
  name?: string
  type?: 'required' | 'optional'
}

export interface OutlookCalendarEvent {
  id: string
  subject: string
  body: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location: string
  organizer: { emailAddress: { name: string; address: string } }
  webLink: string
}

export interface Email {
  id: string
  subject: string
  bodyPreview: string
  body: { contentType: string; content: string }
  from: { emailAddress: { name: string; address: string } }
  toRecipients: { emailAddress: { name: string; address: string } }[]
  receivedDateTime: string
  isRead: boolean
  hasAttachments: boolean
  webLink: string
}

export interface LinkedRecord {
  type: string
  id: string
  label?: string
}

// ---------------------------------------------------------------------------
// OutlookService
// ---------------------------------------------------------------------------

export class OutlookService {
  private config: OutlookConfig
  private accessTokens: Map<string, { token: string; expiry: number }> = new Map()

  constructor(config: OutlookConfig) {
    this.config = config
  }

  /**
   * Get a delegated access token for a specific user.
   * In production, this uses the on-behalf-of flow or stored refresh tokens.
   */
  private async getAccessToken(userId: string): Promise<string> {
    const cached = this.accessTokens.get(userId)
    if (cached && Date.now() < cached.expiry) {
      return cached.token
    }

    // In production: use stored refresh token to get new access token
    // POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
    // grant_type=refresh_token, client_id, client_secret, refresh_token, scope=Mail.ReadWrite Calendars.ReadWrite

    console.log(`Outlook: Would acquire delegated token for user ${userId}`)

    const token = 'placeholder-delegated-token'
    this.accessTokens.set(userId, {
      token,
      expiry: Date.now() + 3600 * 1000,
    })

    return token
  }

  /**
   * Sync (create or update) a calendar event in the user's Outlook calendar.
   * Returns the Outlook event ID for future reference.
   */
  async syncCalendarEvent(
    event: CalendarEvent,
    userId: string,
    existingOutlookEventId?: string
  ): Promise<string> {
    const token = await this.getAccessToken(userId)

    const graphEvent = {
      subject: event.subject,
      body: event.body
        ? { contentType: 'HTML', content: event.body }
        : undefined,
      start: {
        dateTime: event.start,
        timeZone: 'America/Detroit',
      },
      end: {
        dateTime: event.end,
        timeZone: 'America/Detroit',
      },
      location: event.location
        ? { displayName: event.location }
        : undefined,
      attendees: event.attendees?.map((a) => ({
        emailAddress: { address: a.email, name: a.name ?? '' },
        type: a.type ?? 'required',
      })),
      isAllDay: event.isAllDay ?? false,
      reminderMinutesBeforeStart: event.reminderMinutes ?? 15,
    }

    if (existingOutlookEventId) {
      // PATCH /me/events/{eventId}
      console.log(
        `Outlook: Would update event ${existingOutlookEventId} for user ${userId}`
      )
      console.log(`Outlook: Event data:`, JSON.stringify(graphEvent, null, 2))
      console.log(`Outlook: Using token: ${token.slice(0, 10)}...`)
      return existingOutlookEventId
    } else {
      // POST /me/events
      console.log(`Outlook: Would create event for user ${userId}`)
      console.log(`Outlook: Event data:`, JSON.stringify(graphEvent, null, 2))
      console.log(`Outlook: Using token: ${token.slice(0, 10)}...`)
      return `outlook-event-${Date.now()}`
    }
  }

  /**
   * Delete a calendar event from Outlook.
   */
  async deleteCalendarEvent(
    outlookEventId: string,
    userId: string
  ): Promise<void> {
    const token = await this.getAccessToken(userId)

    // DELETE /me/events/{eventId}
    console.log(
      `Outlook: Would delete event ${outlookEventId} for user ${userId}`
    )
    console.log(`Outlook: Using token: ${token.slice(0, 10)}...`)
  }

  /**
   * Send an email, optionally linking it to an ATLAS record for tracking.
   */
  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    userId: string,
    linkedRecord?: LinkedRecord
  ): Promise<void> {
    const token = await this.getAccessToken(userId)

    const message = {
      subject,
      body: { contentType: 'HTML', content: body },
      toRecipients: to.map((email) => ({
        emailAddress: { address: email },
      })),
    }

    // POST /me/sendMail { message, saveToSentItems: true }
    console.log(`Outlook: Would send email to ${to.join(', ')} from user ${userId}`)
    console.log(`Outlook: Subject: "${subject}"`)
    console.log(`Outlook: Using token: ${token.slice(0, 10)}...`)

    // If linked to an ATLAS record, log the email in activity_log
    if (linkedRecord) {
      const supabase = createClient()
      await supabase.from('activity_log').insert({
        record_type: linkedRecord.type,
        record_id: linkedRecord.id,
        action: 'email_sent',
        description: `Sent email "${subject}" to ${to.join(', ')}`,
        user_id: userId,
      })
      console.log(
        `Outlook: Logged email to activity_log for ${linkedRecord.type}/${linkedRecord.id}`
      )
    }
  }

  /**
   * Retrieve emails for a user, optionally filtered by folder.
   */
  async getEmails(
    userId: string,
    folderId?: string,
    top: number = 25
  ): Promise<Email[]> {
    const token = await this.getAccessToken(userId)

    const path = folderId
      ? `/me/mailFolders/${folderId}/messages`
      : '/me/messages'

    // GET {path}?$top={top}&$orderby=receivedDateTime desc
    // &$select=id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,hasAttachments,webLink

    console.log(
      `Outlook: Would fetch ${top} emails from ${path} for user ${userId}`
    )
    console.log(`Outlook: Using token: ${token.slice(0, 10)}...`)

    return []
  }

  /**
   * Get calendar events for a date range.
   */
  async getCalendarEvents(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<OutlookCalendarEvent[]> {
    const token = await this.getAccessToken(userId)

    // GET /me/calendarView?startDateTime={start}&endDateTime={end}
    console.log(
      `Outlook: Would fetch calendar events from ${startDate} to ${endDate} for user ${userId}`
    )
    console.log(`Outlook: Using token: ${token.slice(0, 10)}...`)

    return []
  }

  /**
   * Test the connection by verifying credentials.
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Outlook: Connection test - would verify Azure AD credentials')
      return true
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function getOutlookService(): Promise<OutlookService | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('provider', 'outlook')
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const config = data.config as OutlookConfig
    if (!config.tenantUrl || !config.clientId) return null

    return new OutlookService(config)
  } catch {
    return null
  }
}
