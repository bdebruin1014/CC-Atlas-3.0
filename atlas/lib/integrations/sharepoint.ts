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
// Module Folder Templates — Default sub-folder structures per module type
// ---------------------------------------------------------------------------

export type ModuleType =
  | 'opportunity'
  | 'project'
  | 'job'
  | 'disposition'
  | 'entity'

/**
 * Default SharePoint folder templates for all 5 primary modules.
 * Each key maps to a record sub-type (or '_default' for the base template).
 * Used by autoCreateModuleFolders() when no DB template is found.
 */
export const MODULE_FOLDER_TEMPLATES: Record<
  ModuleType,
  Record<string, string[]>
> = {
  // ---- Opportunities ----
  opportunity: {
    scattered_lot: [
      '01. Property Info',
      '01. Property Info/Plat & Survey',
      '01. Property Info/Zoning',
      '01. Property Info/Title',
      '02. Due Diligence',
      '02. Due Diligence/Soil & Environmental',
      '02. Due Diligence/Utilities',
      '02. Due Diligence/Inspections',
      '03. Deal Analysis',
      '04. Offers & Contracts',
      '05. Correspondence',
      '06. Photos',
    ],
    lot_development: [
      '01. Property Info',
      '01. Property Info/Plat & Survey',
      '01. Property Info/Title',
      '02. Due Diligence',
      '02. Due Diligence/Environmental',
      '02. Due Diligence/Geotechnical',
      '02. Due Diligence/Utilities',
      '03. Feasibility',
      '03. Feasibility/Proforma',
      '03. Feasibility/Zoning & Entitlements',
      '04. Deal Analysis',
      '05. Offers & Contracts',
      '06. Engineering',
      '07. Correspondence',
      '08. Photos',
    ],
    community_development: [
      '01. Property Info',
      '01. Property Info/Plat & Survey',
      '01. Property Info/Title',
      '02. Due Diligence',
      '03. Feasibility',
      '03. Feasibility/Proforma',
      '03. Feasibility/Market Research',
      '04. Deal Analysis',
      '05. Offers & Contracts',
      '06. Planning',
      '07. Correspondence',
      '08. Photos',
    ],
    _default: [
      '01. Property Info',
      '02. Due Diligence',
      '03. Deal Analysis',
      '04. Offers & Contracts',
      '05. Correspondence',
      '06. Photos',
    ],
  },

  // ---- Projects ----
  project: {
    custom_home: [
      '01. Acquisition',
      '01. Acquisition/Contract',
      '01. Acquisition/Title',
      '01. Acquisition/Survey',
      '02. Permitting',
      '03. Plans & Specs',
      '04. Contracts',
      '05. Construction',
      '05. Construction/Photos',
      '05. Construction/Inspections',
      '06. Financial',
      '06. Financial/Draw Requests',
      '06. Financial/Invoices',
      '07. Correspondence',
      '08. Warranty',
    ],
    remodel: [
      '01. Acquisition',
      '02. Permitting',
      '03. Plans & Specs',
      '04. Contracts',
      '05. Construction',
      '05. Construction/Photos',
      '05. Construction/Before & After',
      '06. Financial',
      '07. Correspondence',
    ],
    land_development: [
      '01. Acquisition',
      '01. Acquisition/Contract',
      '01. Acquisition/Title',
      '02. Engineering',
      '02. Engineering/Site Plans',
      '02. Engineering/Utilities',
      '03. Permitting',
      '04. Environmental',
      '05. Financial',
      '06. Legal',
      '07. Correspondence',
    ],
    commercial: [
      '01. Acquisition',
      '02. Permitting',
      '03. Plans & Specs',
      '04. Contracts',
      '05. Construction',
      '05. Construction/Photos',
      '05. Construction/Tenant Improvements',
      '06. Financial',
      '07. Legal',
      '08. Correspondence',
    ],
    _default: [
      '01. Acquisition',
      '02. Permitting',
      '03. Plans & Specs',
      '04. Contracts',
      '05. Construction',
      '06. Financial',
      '07. Correspondence',
      '08. Warranty',
    ],
  },

  // ---- Construction Jobs ----
  job: {
    _default: [
      '01. Contract & Scope',
      '02. Permitting',
      '03. Plans & Specs',
      '04. Subcontracts & POs',
      '05. Change Orders',
      '06. Inspections',
      '07. Draw Requests',
      '08. Invoices & Lien Waivers',
      '09. Daily Logs',
      '10. Photos',
      '11. Punch List',
      '12. Closeout & Warranty',
      '13. Correspondence',
    ],
  },

  // ---- Disposition Listings ----
  disposition: {
    _default: [
      '01. Listing',
      '01. Listing/Marketing Materials',
      '01. Listing/Photos & Virtual Tour',
      '01. Listing/MLS Documents',
      '02. Showings & Offers',
      '03. Contract & Addenda',
      '04. Due Diligence',
      '04. Due Diligence/Inspections',
      '04. Due Diligence/Appraisal',
      '04. Due Diligence/Repair Requests',
      '05. Title & Closing',
      '05. Title & Closing/Title Commitment',
      '05. Title & Closing/Survey',
      '05. Title & Closing/Settlement Statement',
      '06. Financial',
      '06. Financial/Commission Statements',
      '06. Financial/Seller Proceeds',
      '07. Correspondence',
    ],
  },

  // ---- Accounting Entities ----
  entity: {
    spe: [
      '01. Formation',
      '01. Formation/Operating Agreement',
      '01. Formation/Articles of Organization',
      '01. Formation/EIN',
      '02. Banking',
      '02. Banking/Statements',
      '02. Banking/Reconciliations',
      '03. Tax',
      '03. Tax/Returns',
      '03. Tax/K-1s',
      '04. Investor Documents',
      '04. Investor Documents/Capital Call Notices',
      '04. Investor Documents/Distribution Notices',
      '04. Investor Documents/Quarterly Reports',
      '05. Insurance',
      '06. Legal',
      '07. Audits & Reviews',
    ],
    operating_company: [
      '01. Formation',
      '01. Formation/Operating Agreement',
      '01. Formation/Articles',
      '01. Formation/EIN',
      '02. Banking',
      '02. Banking/Statements',
      '02. Banking/Reconciliations',
      '03. Tax',
      '03. Tax/Returns',
      '04. Payroll',
      '05. Insurance',
      '05. Insurance/GL',
      '05. Insurance/WC',
      '05. Insurance/Builders Risk',
      '06. Legal',
      '07. Audits & Reviews',
      '08. Vendor W-9s & 1099s',
    ],
    holding_company: [
      '01. Formation',
      '01. Formation/Operating Agreement',
      '01. Formation/Articles',
      '01. Formation/EIN',
      '02. Banking',
      '02. Banking/Statements',
      '03. Tax',
      '03. Tax/Returns',
      '04. Intercompany',
      '05. Insurance',
      '06. Legal',
    ],
    fund_syndication: [
      '01. Formation',
      '01. Formation/PPM',
      '01. Formation/Operating Agreement',
      '01. Formation/Subscription Agreements',
      '01. Formation/EIN',
      '02. Banking',
      '02. Banking/Statements',
      '03. Tax',
      '03. Tax/Returns',
      '03. Tax/K-1s',
      '04. Investor Documents',
      '04. Investor Documents/Capital Call Notices',
      '04. Investor Documents/Distribution Notices',
      '04. Investor Documents/Quarterly Reports',
      '05. Insurance',
      '06. Legal',
      '07. Audits & Reviews',
    ],
    _default: [
      '01. Formation',
      '02. Banking',
      '03. Tax',
      '04. Insurance',
      '05. Legal',
    ],
  },
}

/**
 * Resolve the folder template for a given module and sub-type.
 * Checks the DB sharepoint_folder_templates table first,
 * then falls back to the built-in MODULE_FOLDER_TEMPLATES constant.
 */
export async function resolveFolderTemplate(
  module: ModuleType,
  subType?: string | null
): Promise<string[]> {
  // 1) Try loading from DB
  try {
    const supabase = createClient()
    const typeLookup = subType || '_default'
    const { data } = await supabase
      .from('sharepoint_folder_templates')
      .select('folder_structure')
      .eq('project_type', `${module}:${typeLookup}`)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    if (data?.folder_structure && Array.isArray(data.folder_structure)) {
      return data.folder_structure as string[]
    }
  } catch {
    // DB lookup failed — fall through to built-in template
  }

  // 2) Built-in template
  const moduleTemplates = MODULE_FOLDER_TEMPLATES[module]
  const key = subType && moduleTemplates[subType] ? subType : '_default'
  return moduleTemplates[key] ?? moduleTemplates._default ?? []
}

/**
 * Build the root folder name for a module record.
 * Convention: "<PREFIX> <Record Number> - <Label>"
 */
export function buildFolderName(
  module: ModuleType,
  recordNumber: string,
  label: string
): string {
  const prefix: Record<ModuleType, string> = {
    opportunity: 'OPP',
    project: 'PRJ',
    job: 'JOB',
    disposition: 'DSP',
    entity: 'ENT',
  }

  const num = recordNumber || 'NEW'
  return `${prefix[module]} ${num} - ${label}`.replace(/[<>:"/\\|?*]/g, '_')
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
   * @deprecated Use createModuleFolder() with MODULE_FOLDER_TEMPLATES instead.
   */
  async createProjectFolder(
    projectType: string,
    projectNumber: string,
    address: string
  ): Promise<string> {
    const folderName = `${projectNumber} - ${address}`
    const template = await resolveFolderTemplate('project', projectType)
    return this.createModuleFolder(folderName, template)
  }

  /**
   * Create a module folder with its full sub-folder tree.
   * Accepts a root folder name and the list of sub-folder paths to create.
   */
  async createModuleFolder(
    folderName: string,
    subFolders: string[]
  ): Promise<string> {
    const token = await this.getAccessToken()

    // In production: POST /drives/{driveId}/root/children
    // {
    //   "name": folderName,
    //   "folder": {},
    //   "@microsoft.graph.conflictBehavior": "rename"
    // }
    // Then create each sub-folder path (Graph API supports nested creation
    // via PATCH /root:/{path}:/children for intermediate directories)

    console.log(
      `SharePoint: Would create folder "${folderName}" at /drives/${this.config.driveId}/root/children`
    )
    console.log(
      `SharePoint: Would create ${subFolders.length} sub-folders: ${subFolders.join(', ')}`
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

// ---------------------------------------------------------------------------
// Auto-create helper for API routes
// ---------------------------------------------------------------------------

/**
 * Auto-create a SharePoint folder structure for a newly created record.
 * Called from API POST routes after record creation. Best-effort / non-fatal.
 *
 * Returns the root folder URL on success, or null if SharePoint is not
 * configured or the operation fails.
 */
export async function autoCreateModuleFolders(opts: {
  module: ModuleType
  subType?: string | null
  recordNumber: string
  label: string
  recordId: string
}): Promise<string | null> {
  try {
    const service = await getSharePointService()
    if (!service) return null

    const folderName = buildFolderName(opts.module, opts.recordNumber, opts.label)
    const template = await resolveFolderTemplate(opts.module, opts.subType)

    // Create root folder + sub-folders
    const rootUrl = await service.createModuleFolder(folderName, template)
    return rootUrl
  } catch (err) {
    console.error(`SharePoint: auto-create folders failed for ${opts.module}/${opts.recordId}:`, err)
    return null
  }
}
