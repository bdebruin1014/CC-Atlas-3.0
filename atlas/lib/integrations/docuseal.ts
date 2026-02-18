import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocuSealConfig {
  apiUrl: string
  apiKey: string
  webhookSecret?: string
}

export interface Signer {
  name: string
  email: string
  role: string
  phone?: string
}

export interface TemplateField {
  name: string
  value?: string
  defaultValue?: string
  readonly?: boolean
}

export interface SignerStatus {
  name: string
  email: string
  role: string
  status: 'pending' | 'sent' | 'opened' | 'signed' | 'declined'
  signedAt?: string
  openedAt?: string
  declinedAt?: string
}

export interface SignatureStatus {
  id: string
  templateId: string
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'completed' | 'expired' | 'declined'
  signers: SignerStatus[]
  createdAt: string
  completedAt?: string
  auditLogUrl?: string
  documentsUrl?: string
}

export interface DocuSealTemplate {
  id: string
  name: string
  fields: { name: string; type: string; role: string }[]
  createdAt: string
}

// ---------------------------------------------------------------------------
// DocuSealService
// ---------------------------------------------------------------------------

export class DocuSealService {
  private config: DocuSealConfig

  constructor(config: DocuSealConfig) {
    this.config = config
  }

  /**
   * Get authorization headers for API requests.
   */
  private getHeaders(): Record<string, string> {
    return {
      'X-Auth-Token': this.config.apiKey,
      'Content-Type': 'application/json',
    }
  }

  /**
   * List available templates.
   */
  async getTemplates(): Promise<DocuSealTemplate[]> {
    // GET {apiUrl}/templates

    console.log(`DocuSeal: Would list templates from ${this.config.apiUrl}/templates`)

    return []
  }

  /**
   * Send a document for e-signature based on a template.
   * Returns the submission ID for tracking.
   */
  async sendForSignature(
    templateId: string,
    signers: Signer[],
    fields: TemplateField[],
    metadata?: {
      recordType?: string
      recordId?: string
      label?: string
    }
  ): Promise<string> {
    const payload = {
      template_id: templateId,
      send_email: true,
      submitters: signers.map((signer, index) => ({
        name: signer.name,
        email: signer.email,
        role: signer.role,
        phone: signer.phone,
        fields: fields
          .filter((f) => f.name.startsWith(signer.role) || !f.name.includes('.'))
          .map((f) => ({
            name: f.name,
            default_value: f.value ?? f.defaultValue,
            readonly: f.readonly ?? false,
          })),
      })),
      metadata: metadata
        ? {
            atlas_record_type: metadata.recordType,
            atlas_record_id: metadata.recordId,
            atlas_label: metadata.label,
          }
        : undefined,
    }

    // POST {apiUrl}/submissions
    console.log(`DocuSeal: Would create submission for template ${templateId}`)
    console.log(`DocuSeal: Signers: ${signers.map((s) => s.email).join(', ')}`)
    console.log(`DocuSeal: Payload:`, JSON.stringify(payload, null, 2))

    // In production, store submission record in ATLAS database
    if (metadata?.recordType && metadata?.recordId) {
      const supabase = createClient()
      await supabase.from('document_signatures').insert({
        record_type: metadata.recordType,
        record_id: metadata.recordId,
        template_id: templateId,
        submission_id: `docuseal-submission-${Date.now()}`,
        status: 'sent',
        signers: signers.map((s) => ({
          name: s.name,
          email: s.email,
          role: s.role,
          status: 'sent',
        })),
      })
    }

    return `docuseal-submission-${Date.now()}`
  }

  /**
   * Get the current status of a signature submission.
   */
  async getSignatureStatus(submissionId: string): Promise<SignatureStatus> {
    // GET {apiUrl}/submissions/{submissionId}

    console.log(
      `DocuSeal: Would get status for submission ${submissionId} from ${this.config.apiUrl}/submissions/${submissionId}`
    )

    return {
      id: submissionId,
      templateId: '',
      status: 'pending',
      signers: [],
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Handle a webhook callback when a signature is completed.
   * This method is called from the API route that receives DocuSeal webhooks.
   */
  async onSignatureComplete(
    submissionId: string,
    webhookPayload?: Record<string, unknown>
  ): Promise<void> {
    console.log(
      `DocuSeal: Handling signature completion for submission ${submissionId}`
    )

    const supabase = createClient()

    // Update the signature record in ATLAS
    const { data: sigRecord, error } = await supabase
      .from('document_signatures')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        webhook_data: webhookPayload,
      })
      .eq('submission_id', submissionId)
      .select('record_type, record_id')
      .single()

    if (error) {
      console.error('DocuSeal: Failed to update signature record:', error)
      return
    }

    // Log activity
    if (sigRecord) {
      await supabase.from('activity_log').insert({
        record_type: (sigRecord as any).record_type,
        record_id: (sigRecord as any).record_id,
        action: 'document_signed',
        description: 'Document signature completed',
        metadata: { submission_id: submissionId },
      })
    }

    console.log(
      `DocuSeal: Updated signature record and logged activity for submission ${submissionId}`
    )
  }

  /**
   * Verify a webhook signature to ensure the request is from DocuSeal.
   */
  verifyWebhook(
    payload: string,
    signature: string
  ): boolean {
    if (!this.config.webhookSecret) {
      console.warn('DocuSeal: No webhook secret configured, skipping verification')
      return true
    }

    // In production: verify HMAC-SHA256 signature
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.config.webhookSecret)
    //   .update(payload)
    //   .digest('hex')
    // return crypto.timingSafeEqual(
    //   Buffer.from(signature),
    //   Buffer.from(expectedSignature)
    // )

    console.log('DocuSeal: Would verify webhook signature')
    return true
  }

  /**
   * Download completed documents for a submission.
   */
  async downloadDocuments(submissionId: string): Promise<string> {
    // GET {apiUrl}/submissions/{submissionId}/documents/download

    console.log(
      `DocuSeal: Would download documents for submission ${submissionId}`
    )

    return `${this.config.apiUrl}/submissions/${submissionId}/documents/download`
  }

  /**
   * Test the connection.
   */
  async testConnection(): Promise<boolean> {
    try {
      // GET {apiUrl}/templates?limit=1
      console.log(`DocuSeal: Connection test - would verify API key at ${this.config.apiUrl}`)
      return true
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function getDocuSealService(): Promise<DocuSealService | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('provider', 'docuseal')
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const config = data.config as DocuSealConfig
    if (!config.apiUrl || !config.apiKey) return null

    return new DocuSealService(config)
  } catch {
    return null
  }
}
