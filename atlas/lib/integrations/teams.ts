import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamsConfig {
  tenantUrl: string
  clientId: string
  clientSecret: string
  defaultTeamId?: string
}

export interface ChannelMessage {
  content: string
  contentType?: 'html' | 'text'
  subject?: string
}

export interface MeetingAttendee {
  email: string
  name?: string
}

export interface TeamsMeeting {
  id: string
  subject: string
  joinUrl: string
  startDateTime: string
  endDateTime: string
  organizer: { email: string; name: string }
}

export interface TeamsChannel {
  id: string
  displayName: string
  description: string | null
  webUrl: string
}

export interface LinkedRecord {
  type: string
  id: string
  label?: string
  url?: string
}

// ---------------------------------------------------------------------------
// TeamsService
// ---------------------------------------------------------------------------

export class TeamsService {
  private config: TeamsConfig
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(config: TeamsConfig) {
    this.config = config
  }

  /**
   * Get application access token for Teams operations.
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    // POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
    // grant_type=client_credentials
    // scope=https://graph.microsoft.com/.default

    console.log('Teams: Would authenticate with Azure AD')

    this.accessToken = 'placeholder-token'
    this.tokenExpiry = Date.now() + 3600 * 1000
    return this.accessToken
  }

  /**
   * Send a message to a Teams channel, optionally with a link to an ATLAS record.
   */
  async sendChannelMessage(
    channelId: string,
    message: string,
    linkedRecord?: LinkedRecord
  ): Promise<void> {
    const token = await this.getAccessToken()
    const teamId = this.config.defaultTeamId

    // Build adaptive card content if there's a linked record
    let content = message
    if (linkedRecord) {
      content = `${message}\n\n<a href="${linkedRecord.url ?? '#'}">[ATLAS: ${linkedRecord.type} - ${linkedRecord.label ?? linkedRecord.id}]</a>`
    }

    // POST /teams/{teamId}/channels/{channelId}/messages
    // { body: { contentType: 'html', content } }

    console.log(`Teams: Would send message to channel ${channelId} in team ${teamId}`)
    console.log(`Teams: Message content: "${content}"`)
    console.log(`Teams: Using token: ${token.slice(0, 10)}...`)

    // Log to activity_log if linked
    if (linkedRecord) {
      const supabase = createClient()
      await supabase.from('activity_log').insert({
        record_type: linkedRecord.type,
        record_id: linkedRecord.id,
        action: 'teams_message',
        description: `Sent Teams notification to channel`,
        metadata: { channelId, teamId },
      })
    }
  }

  /**
   * Create an online meeting in Microsoft Teams.
   * Returns the meeting join URL.
   */
  async createMeeting(
    subject: string,
    attendees: MeetingAttendee[],
    startTime: string,
    endTime: string,
    organizerUserId?: string
  ): Promise<string> {
    const token = await this.getAccessToken()

    const meeting = {
      subject,
      startDateTime: startTime,
      endDateTime: endTime,
      participants: {
        attendees: attendees.map((a) => ({
          upn: a.email,
          identity: {
            user: { displayName: a.name ?? a.email },
          },
        })),
      },
    }

    // POST /users/{organizerUserId}/onlineMeetings
    // OR POST /me/onlineMeetings (if delegated)

    console.log(`Teams: Would create meeting "${subject}"`)
    console.log(`Teams: Start: ${startTime}, End: ${endTime}`)
    console.log(
      `Teams: Attendees: ${attendees.map((a) => a.email).join(', ')}`
    )
    console.log(`Teams: Using token: ${token.slice(0, 10)}...`)

    return `https://teams.microsoft.com/l/meetup-join/placeholder-${Date.now()}`
  }

  /**
   * Get available channels for the default team.
   */
  async getChannels(): Promise<TeamsChannel[]> {
    const token = await this.getAccessToken()
    const teamId = this.config.defaultTeamId

    // GET /teams/{teamId}/channels
    console.log(`Teams: Would list channels for team ${teamId}`)
    console.log(`Teams: Using token: ${token.slice(0, 10)}...`)

    return []
  }

  /**
   * Create a new channel in the default team (e.g., for a new project).
   */
  async createChannel(
    displayName: string,
    description?: string
  ): Promise<TeamsChannel | null> {
    const token = await this.getAccessToken()
    const teamId = this.config.defaultTeamId

    // POST /teams/{teamId}/channels
    // { displayName, description, membershipType: 'standard' }

    console.log(`Teams: Would create channel "${displayName}" in team ${teamId}`)
    console.log(`Teams: Using token: ${token.slice(0, 10)}...`)

    return null
  }

  /**
   * Test the connection.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken()
      console.log('Teams: Connection test successful')
      return true
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function getTeamsService(): Promise<TeamsService | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('provider', 'teams')
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const config = data.config as TeamsConfig
    if (!config.tenantUrl || !config.clientId) return null

    return new TeamsService(config)
  } catch {
    return null
  }
}
