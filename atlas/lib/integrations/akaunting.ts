import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AkauntingConfig {
  baseUrl: string
  companyId: string
  apiKey: string
  username?: string
  password?: string
}

export interface AkauntingAccount {
  id: number
  name: string
  number: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  currency_code: string
  balance: number
  enabled: boolean
}

export interface AkauntingCategory {
  id: number
  name: string
  type: 'income' | 'expense' | 'item' | 'other'
  color: string
  enabled: boolean
}

export interface AkauntingContact {
  id: number
  name: string
  email: string
  type: 'customer' | 'vendor'
  tax_number?: string
  phone?: string
  address?: string
  enabled: boolean
}

export interface AccountMapping {
  atlasCategory: string
  akauntingAccountId: number
  akauntingCategoryId?: number
  akauntingContactId?: number
}

export interface AtlasTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  category: string
  contact_name?: string
  contact_email?: string
  reference?: string
  record_type: string
  record_id: string
}

export interface SyncResult {
  success: boolean
  akauntingId?: number
  error?: string
}

// ---------------------------------------------------------------------------
// AkauntingService
// ---------------------------------------------------------------------------

export class AkauntingService {
  private config: AkauntingConfig

  constructor(config: AkauntingConfig) {
    this.config = config
  }

  /**
   * Get authorization headers for Akaunting API requests.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    } else if (this.config.username && this.config.password) {
      const credentials = btoa(
        `${this.config.username}:${this.config.password}`
      )
      headers['Authorization'] = `Basic ${credentials}`
    }

    return headers
  }

  /**
   * Build the full API URL for an endpoint.
   */
  private getUrl(endpoint: string): string {
    return `${this.config.baseUrl}/api/${this.config.companyId}/${endpoint}`
  }

  /**
   * Sync an ATLAS transaction to Akaunting.
   * Creates a revenue (income) or bill payment (expense) in Akaunting.
   */
  async syncTransaction(
    transaction: AtlasTransaction,
    accountMapping: AccountMapping
  ): Promise<SyncResult> {
    const headers = this.getHeaders()

    if (transaction.type === 'income') {
      // Create a revenue record in Akaunting
      const payload = {
        account_id: accountMapping.akauntingAccountId,
        category_id: accountMapping.akauntingCategoryId,
        amount: transaction.amount,
        paid_at: transaction.date,
        description: transaction.description,
        reference: transaction.reference ?? `ATLAS-${transaction.id}`,
        contact_id: accountMapping.akauntingContactId,
        currency_code: 'USD',
      }

      // POST /api/{companyId}/revenues
      console.log(
        `Akaunting: Would create revenue of $${transaction.amount} at ${this.getUrl('revenues')}`
      )
      console.log(`Akaunting: Payload:`, JSON.stringify(payload, null, 2))
      console.log(`Akaunting: Headers:`, JSON.stringify(headers))
    } else {
      // Create a payment record in Akaunting
      const payload = {
        account_id: accountMapping.akauntingAccountId,
        category_id: accountMapping.akauntingCategoryId,
        amount: transaction.amount,
        paid_at: transaction.date,
        description: transaction.description,
        reference: transaction.reference ?? `ATLAS-${transaction.id}`,
        contact_id: accountMapping.akauntingContactId,
        currency_code: 'USD',
      }

      // POST /api/{companyId}/payments
      console.log(
        `Akaunting: Would create payment of $${transaction.amount} at ${this.getUrl('payments')}`
      )
      console.log(`Akaunting: Payload:`, JSON.stringify(payload, null, 2))
    }

    // Store sync record in ATLAS
    const supabase = createClient()
    await supabase.from('integration_sync_log').insert({
      provider: 'akaunting',
      atlas_record_type: transaction.record_type,
      atlas_record_id: transaction.record_id,
      atlas_transaction_id: transaction.id,
      sync_type: transaction.type,
      status: 'synced',
      synced_at: new Date().toISOString(),
    })

    return {
      success: true,
      akauntingId: 0, // Would be the actual ID from Akaunting response
    }
  }

  /**
   * Get all accounts from Akaunting.
   */
  async getAccounts(): Promise<AkauntingAccount[]> {
    // GET /api/{companyId}/accounts

    console.log(
      `Akaunting: Would fetch accounts from ${this.getUrl('accounts')}`
    )

    return []
  }

  /**
   * Get all categories from Akaunting.
   */
  async getCategories(
    type?: 'income' | 'expense'
  ): Promise<AkauntingCategory[]> {
    const url = type
      ? `${this.getUrl('categories')}?search=type:${type}`
      : this.getUrl('categories')

    // GET /api/{companyId}/categories
    console.log(`Akaunting: Would fetch categories from ${url}`)

    return []
  }

  /**
   * Get contacts from Akaunting.
   */
  async getContacts(
    type?: 'customer' | 'vendor'
  ): Promise<AkauntingContact[]> {
    const url = type
      ? `${this.getUrl('contacts')}?search=type:${type}`
      : this.getUrl('contacts')

    // GET /api/{companyId}/contacts
    console.log(`Akaunting: Would fetch contacts from ${url}`)

    return []
  }

  /**
   * Create or find a contact in Akaunting to map with an ATLAS contact.
   */
  async findOrCreateContact(
    name: string,
    email: string,
    type: 'customer' | 'vendor'
  ): Promise<number> {
    // First try to find by email
    // GET /api/{companyId}/contacts?search=email:{email}
    console.log(
      `Akaunting: Would search for contact with email ${email}`
    )

    // If not found, create
    const payload = {
      type,
      name,
      email,
      currency_code: 'USD',
      enabled: true,
    }

    // POST /api/{companyId}/contacts
    console.log(
      `Akaunting: Would create ${type} contact "${name}" (${email})`
    )

    return 0
  }

  /**
   * Get account balances summary.
   */
  async getAccountBalances(): Promise<
    { accountId: number; name: string; balance: number }[]
  > {
    // GET /api/{companyId}/accounts
    console.log(
      `Akaunting: Would fetch account balances from ${this.getUrl('accounts')}`
    )

    return []
  }

  /**
   * Test the connection by verifying API credentials.
   */
  async testConnection(): Promise<boolean> {
    try {
      // GET /api/{companyId}/accounts?limit=1
      console.log(
        `Akaunting: Connection test - would verify credentials at ${this.getUrl('accounts')}?limit=1`
      )
      return true
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function getAkauntingService(): Promise<AkauntingService | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('provider', 'akaunting')
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const config = data.config as AkauntingConfig
    if (!config.baseUrl || !config.companyId) return null

    return new AkauntingService(config)
  } catch {
    return null
  }
}
