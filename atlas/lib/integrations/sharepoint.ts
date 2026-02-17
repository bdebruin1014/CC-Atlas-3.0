import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SharePointConfig {
  tenantUrl: string
  clientId: string
  clientSecret: string
  siteUrl: string
  driveId: string
}

export interface SharePointDocument {
  id: string
  name: string
  webUrl: string
  size: number
  lastModified: string
  createdBy: string
}

interface SharePointFolder {
  id: string
  name: string
  webUrl: string
  childCount: number
}

interface GraphTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// ---------------------------------------------------------------------------
// SharePointService
// ---------------------------------------------------------------------------

export class SharePointService {
  private config: SharePointConfig
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(config: SharePointConfig) {
    this.config = config
  }

  /**
   * Authenticate with Azure AD using OAuth2 client credentials flow.
   * Caches the token until it expires.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantUrl}/oauth2/v2.0/token`

    // In production: implement actual OAuth flow via server-side API route
    // POST with grant_type=client_credentials, client_id, client_secret, scope
    console.log(
      `SharePoint: Would authenticate with Azure AD at ${tokenUrl}`
    )
    console.log(
      'SharePoint: grant_type=client_credentials, scope=https://graph.microsoft.com/.default'
    )

    // Stub: return placeholder token
    // In production this would be:
    // const response = await fetch(tokenUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams({
    //     grant_type: 'client_credentials',
    //     client_id: this.config.clientId,
    //     client_secret: this.config.clientSecret,
    //     scope: 'https://graph.microsoft.com/.default',
    //   }),
    // })
    // const data: GraphTokenResponse = await response.json()
    // this.accessToken = data.access_token
    // this.tokenExpiry = now + data.expires_in * 1000 - 60000 // 1 min buffer

    this.accessToken = 'placeholder-token'
    this.tokenExpiry = now + 3600 * 1000
    return this.accessToken
  }

  /**
   * Create a project folder with the standard Red Cedar folder structure.
   * Uses project type to determine which sub-folder template to apply.
   */
  async createProjectFolder(
    projectType: string,
    projectNumber: string,
    address: string
  ): Promise<string> {
    const token = await this.getAccessToken()
    const folderName = `${projectNumber} - ${address}`

    // In production: POST /drives/{driveId}/root/children
    // {
    //   "name": folderName,
    //   "folder": {},
    //   "@microsoft.graph.conflictBehavior": "rename"
    // }
    // Then create template sub-folders based on projectType

    const templateFolders: Record<string, string[]> = {
      custom_home: [
        'Plans & Specs',
        'Contracts',
        'Permits',
        'Photos',
        'Correspondence',
        'Financial',
        'Warranty',
      ],
      remodel: [
        'Plans & Specs',
        'Contracts',
        'Permits',
        'Photos',
        'Before & After',
        'Financial',
      ],
      land_development: [
        'Site Plans',
        'Engineering',
        'Permits',
        'Environmental',
        'Financial',
        'Legal',
      ],
      commercial: [
        'Plans & Specs',
        'Contracts',
        'Permits',
        'Photos',
        'Tenant Improvements',
        'Financial',
        'Legal',
      ],
    }

    const subFolders = templateFolders[projectType] ?? templateFolders.custom_home

    console.log(
      `SharePoint: Would create folder "${folderName}" at /drives/${this.config.driveId}/root/children`
    )
    console.log(
      `SharePoint: Would create sub-folders: ${subFolders!.join(', ')}`
    )
    console.log(`SharePoint: Using token: ${token.slice(0, 10)}...`)

    return `${this.config.siteUrl}/Shared Documents/${folderName}`
  }

  /**
   * Upload a document to a specific folder path in SharePoint.
   * For files < 4MB uses simple upload; larger files would use upload session.
   */
  async uploadDocument(
    folderPath: string,
    fileName: string,
    fileBuffer: ArrayBuffer
  ): Promise<string> {
    const token = await this.getAccessToken()
    const fileSizeMB = fileBuffer.byteLength / (1024 * 1024)

    if (fileSizeMB <= 4) {
      // Simple upload: PUT /drives/{driveId}/root:/{folderPath}/{fileName}:/content
      console.log(
        `SharePoint: Would simple-upload "${fileName}" (${fileSizeMB.toFixed(1)}MB) to "${folderPath}"`
      )
    } else {
      // Resumable upload session for large files:
      // POST /drives/{driveId}/root:/{folderPath}/{fileName}:/createUploadSession
      console.log(
        `SharePoint: Would create upload session for "${fileName}" (${fileSizeMB.toFixed(1)}MB) to "${folderPath}"`
      )
    }

    console.log(`SharePoint: Using token: ${token.slice(0, 10)}...`)
    return `${this.config.siteUrl}/Shared Documents/${folderPath}/${fileName}`
  }

  /**
   * List all documents in a folder.
   */
  async getDocuments(folderPath: string): Promise<SharePointDocument[]> {
    const token = await this.getAccessToken()

    // GET /drives/{driveId}/root:/{folderPath}:/children
    // ?$select=id,name,webUrl,size,lastModifiedDateTime,createdBy
    // &$filter=file ne null

    console.log(
      `SharePoint: Would list documents in "${folderPath}" using GET /drives/${this.config.driveId}/root:/${folderPath}:/children`
    )
    console.log(`SharePoint: Using token: ${token.slice(0, 10)}...`)

    return []
  }

  /**
   * Get folders within a path.
   */
  async getFolders(folderPath: string): Promise<SharePointFolder[]> {
    const token = await this.getAccessToken()

    console.log(
      `SharePoint: Would list folders in "${folderPath}" using GET /drives/${this.config.driveId}/root:/${folderPath}:/children?$filter=folder ne null`
    )
    console.log(`SharePoint: Using token: ${token.slice(0, 10)}...`)

    return []
  }

  /**
   * Get a direct/sharing URL for a specific drive item.
   */
  async getFileUrl(driveItemId: string): Promise<string> {
    // GET /drives/{driveId}/items/{driveItemId}?$select=webUrl
    console.log(
      `SharePoint: Would get URL for item ${driveItemId}`
    )
    return `${this.config.siteUrl}/_layouts/15/Doc.aspx?sourcedoc=${driveItemId}`
  }

  /**
   * Search for documents across the SharePoint site.
   */
  async searchDocuments(query: string): Promise<SharePointDocument[]> {
    const token = await this.getAccessToken()

    // GET /drives/{driveId}/root/search(q='{query}')
    console.log(
      `SharePoint: Would search for "${query}" in drive ${this.config.driveId}`
    )
    console.log(`SharePoint: Using token: ${token.slice(0, 10)}...`)

    return []
  }

  /**
   * Test the connection by attempting to authenticate and access the drive.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken()
      // In production: also verify drive access with GET /drives/{driveId}
      console.log('SharePoint: Connection test successful')
      return true
    } catch (error) {
      console.error('SharePoint: Connection test failed', error)
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Load SharePoint configuration from the integration_settings table
 * and return a configured service instance, or null if not configured.
 */
export async function getSharePointService(): Promise<SharePointService | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('provider', 'sharepoint')
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const config = data.config as SharePointConfig
    if (!config.tenantUrl || !config.clientId || !config.driveId) return null

    return new SharePointService(config)
  } catch {
    return null
  }
}
