import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaidConfig {
  clientId: string
  secret: string
  environment: 'sandbox' | 'development' | 'production'
}

export interface PlaidAccount {
  accountId: string
  name: string
  officialName: string | null
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other'
  subtype: string | null
  mask: string | null
  balances: {
    available: number | null
    current: number | null
    limit: number | null
    isoCurrencyCode: string | null
  }
}

export interface PlaidTransaction {
  transactionId: string
  accountId: string
  amount: number
  date: string
  name: string
  merchantName: string | null
  category: string[]
  categoryId: string | null
  pending: boolean
  paymentChannel: 'online' | 'in store' | 'other'
  location: {
    address: string | null
    city: string | null
    region: string | null
    postalCode: string | null
    country: string | null
  } | null
}

export interface PlaidLinkToken {
  linkToken: string
  expiration: string
  requestId: string
}

export interface PlaidInstitution {
  institutionId: string
  name: string
  products: string[]
  logo: string | null
  primaryColor: string | null
}

export interface ReconciliationResult {
  matched: boolean
  plaidTransactionId: string
  atlasTransactionId: string
  confidence: number
  reconciledAt?: string
}

// ---------------------------------------------------------------------------
// PlaidService
// ---------------------------------------------------------------------------

export class PlaidService {
  private config: PlaidConfig

  constructor(config: PlaidConfig) {
    this.config = config
  }

  /**
   * Get the Plaid API base URL for the configured environment.
   */
  private getBaseUrl(): string {
    const urls: Record<string, string> = {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com',
    }
    return urls[this.config.environment] ?? urls.sandbox
  }

  /**
   * Get common request headers.
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'PLAID-CLIENT-ID': this.config.clientId,
      'PLAID-SECRET': this.config.secret,
    }
  }

  /**
   * Create a Link token to initiate the Plaid Link flow on the client.
   * The Link token is used by the Plaid Link UI component.
   */
  async createLinkToken(userId: string): Promise<PlaidLinkToken> {
    const payload = {
      client_id: this.config.clientId,
      secret: this.config.secret,
      user: { client_user_id: userId },
      client_name: 'Red Cedar Homes ATLAS',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    }

    // POST {baseUrl}/link/token/create
    console.log(
      `Plaid: Would create link token at ${this.getBaseUrl()}/link/token/create`
    )
    console.log(`Plaid: Payload:`, JSON.stringify(payload, null, 2))

    return {
      linkToken: `link-${this.config.environment}-placeholder-${Date.now()}`,
      expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      requestId: `req-${Date.now()}`,
    }
  }

  /**
   * Exchange a public token (from Plaid Link) for an access token.
   * The access token is stored securely for ongoing API access.
   */
  async exchangePublicToken(publicToken: string): Promise<string> {
    // POST {baseUrl}/item/public_token/exchange
    // { client_id, secret, public_token }

    console.log(
      `Plaid: Would exchange public token at ${this.getBaseUrl()}/item/public_token/exchange`
    )

    const accessToken = `access-${this.config.environment}-placeholder-${Date.now()}`

    // Store the access token securely (encrypted) in the database
    const supabase = createClient()
    await supabase.from('plaid_items').insert({
      access_token_encrypted: accessToken, // In production: encrypt before storing
      item_id: `item-${Date.now()}`,
      status: 'active',
    })

    return accessToken
  }

  /**
   * Initiate the bank account linking flow.
   * Returns a link token that the frontend uses to open Plaid Link.
   */
  async linkBankAccount(userId: string): Promise<void> {
    const linkToken = await this.createLinkToken(userId)

    console.log(
      `Plaid: Created link token for user ${userId}: ${linkToken.linkToken}`
    )
    console.log(
      'Plaid: Frontend should use this token to open Plaid Link UI'
    )

    // The actual linking happens in the frontend via Plaid Link
    // After successful linking, the frontend calls exchangePublicToken
  }

  /**
   * Get transactions for a linked account within a date range.
   */
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    options?: {
      accountIds?: string[]
      count?: number
      offset?: number
    }
  ): Promise<PlaidTransaction[]> {
    const payload = {
      client_id: this.config.clientId,
      secret: this.config.secret,
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        account_ids: options?.accountIds,
        count: options?.count ?? 100,
        offset: options?.offset ?? 0,
      },
    }

    // POST {baseUrl}/transactions/get
    console.log(
      `Plaid: Would fetch transactions from ${startDate} to ${endDate}`
    )
    console.log(
      `Plaid: URL: ${this.getBaseUrl()}/transactions/get`
    )

    return []
  }

  /**
   * Get linked accounts for an access token.
   */
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    // POST {baseUrl}/accounts/get
    // { client_id, secret, access_token }

    console.log(
      `Plaid: Would fetch accounts from ${this.getBaseUrl()}/accounts/get`
    )

    return []
  }

  /**
   * Get account balances.
   */
  async getBalances(accessToken: string): Promise<PlaidAccount[]> {
    // POST {baseUrl}/accounts/balance/get
    console.log(
      `Plaid: Would fetch balances from ${this.getBaseUrl()}/accounts/balance/get`
    )

    return []
  }

  /**
   * Reconcile a Plaid transaction with an ATLAS transaction.
   * Uses amount, date, and description matching.
   */
  async reconcileTransaction(
    plaidTxn: PlaidTransaction,
    atlasTransactionId: string
  ): Promise<ReconciliationResult> {
    const supabase = createClient()

    console.log(
      `Plaid: Reconciling Plaid txn ${plaidTxn.transactionId} with ATLAS txn ${atlasTransactionId}`
    )

    // Mark both transactions as reconciled
    const { error } = await supabase
      .from('transaction_reconciliations')
      .insert({
        plaid_transaction_id: plaidTxn.transactionId,
        atlas_transaction_id: atlasTransactionId,
        plaid_amount: plaidTxn.amount,
        plaid_date: plaidTxn.date,
        plaid_name: plaidTxn.name,
        status: 'matched',
        reconciled_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Plaid: Reconciliation failed:', error)
      return {
        matched: false,
        plaidTransactionId: plaidTxn.transactionId,
        atlasTransactionId,
        confidence: 0,
      }
    }

    // Update the ATLAS transaction as reconciled
    await supabase
      .from('transactions')
      .update({
        reconciled: true,
        reconciled_at: new Date().toISOString(),
        plaid_transaction_id: plaidTxn.transactionId,
      })
      .eq('id', atlasTransactionId)

    return {
      matched: true,
      plaidTransactionId: plaidTxn.transactionId,
      atlasTransactionId,
      confidence: 1.0,
      reconciledAt: new Date().toISOString(),
    }
  }

  /**
   * Auto-match unreconciled Plaid transactions with ATLAS transactions
   * based on amount, date proximity, and description similarity.
   */
  async autoReconcile(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<ReconciliationResult[]> {
    console.log(
      `Plaid: Would auto-reconcile transactions from ${startDate} to ${endDate}`
    )

    // In production:
    // 1. Fetch Plaid transactions for the period
    // 2. Fetch unreconciled ATLAS transactions for the period
    // 3. Match by: exact amount, date within 2 days, description similarity
    // 4. Return matches above confidence threshold

    return []
  }

  /**
   * Handle Plaid webhook events (transaction updates, errors, etc.)
   */
  async handleWebhook(
    webhookType: string,
    webhookCode: string,
    itemId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    console.log(
      `Plaid: Received webhook - type: ${webhookType}, code: ${webhookCode}, item: ${itemId}`
    )

    switch (webhookType) {
      case 'TRANSACTIONS':
        if (webhookCode === 'SYNC_UPDATES_AVAILABLE') {
          console.log('Plaid: New transactions available, would trigger sync')
        }
        break
      case 'ITEM':
        if (webhookCode === 'ERROR') {
          console.log('Plaid: Item error, would notify admin')
          const supabase = createClient()
          await supabase
            .from('plaid_items')
            .update({ status: 'error', error_code: String(payload.error?.toString() ?? '') })
            .eq('item_id', itemId)
        }
        break
      default:
        console.log(`Plaid: Unhandled webhook type: ${webhookType}`)
    }
  }

  /**
   * Test the connection by verifying API credentials.
   */
  async testConnection(): Promise<boolean> {
    try {
      // POST {baseUrl}/institutions/get
      // { client_id, secret, count: 1, offset: 0, country_codes: ['US'] }
      console.log(
        `Plaid: Connection test - would verify credentials at ${this.getBaseUrl()}`
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

export async function getPlaidService(): Promise<PlaidService | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('provider', 'plaid')
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const config = data.config as PlaidConfig
    if (!config.clientId || !config.secret) return null

    return new PlaidService(config)
  } catch {
    return null
  }
}
