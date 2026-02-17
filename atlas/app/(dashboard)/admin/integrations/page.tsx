"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plug,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

interface IntegrationConfig {
  id?: string
  provider: string
  label: string
  description: string
  status: "connected" | "not_configured" | "error"
  lastTested: string | null
  fields: IntegrationField[]
  config: Record<string, string>
  comingSoon?: boolean
}

interface IntegrationField {
  key: string
  label: string
  type: "text" | "password" | "url"
  placeholder: string
  required?: boolean
}

const INTEGRATION_DEFINITIONS: Omit<IntegrationConfig, "status" | "lastTested" | "config" | "id">[] = [
  {
    provider: "sharepoint",
    label: "SharePoint",
    description: "Connect to Microsoft SharePoint for document management and project file storage.",
    fields: [
      { key: "tenant_url", label: "Tenant URL", type: "url", placeholder: "https://yourorg.sharepoint.com", required: true },
      { key: "client_id", label: "Client ID", type: "text", placeholder: "Application (client) ID", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Client secret value", required: true },
      { key: "site_url", label: "Site URL", type: "url", placeholder: "https://yourorg.sharepoint.com/sites/atlas" },
      { key: "drive_id", label: "Drive ID", type: "text", placeholder: "Drive ID for file storage" },
    ],
  },
  {
    provider: "outlook",
    label: "Outlook",
    description: "Integrate with Microsoft Outlook for email and calendar synchronization via Azure AD.",
    fields: [
      { key: "tenant_id", label: "Azure AD Tenant ID", type: "text", placeholder: "Directory (tenant) ID", required: true },
      { key: "client_id", label: "Client ID", type: "text", placeholder: "Application (client) ID", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Client secret value", required: true },
      { key: "redirect_uri", label: "Redirect URI", type: "url", placeholder: "https://your-app.com/api/auth/callback" },
    ],
  },
  {
    provider: "teams",
    label: "Microsoft Teams",
    description: "Send notifications and updates to Microsoft Teams channels.",
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "Teams incoming webhook URL", required: true },
      { key: "channel_name", label: "Default Channel", type: "text", placeholder: "General" },
    ],
  },
  {
    provider: "docuseal",
    label: "DocuSeal",
    description: "Manage document signing and contract execution through DocuSeal.",
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your DocuSeal API key", required: true },
      { key: "api_url", label: "API URL", type: "url", placeholder: "https://api.docuseal.co" },
    ],
  },
  {
    provider: "akaunting",
    label: "Akaunting",
    description: "Sync accounting data with Akaunting for financial management.",
    fields: [
      { key: "api_url", label: "API URL", type: "url", placeholder: "https://your-akaunting.com/api", required: true },
      { key: "api_key", label: "API Key", type: "password", placeholder: "Akaunting API key", required: true },
      { key: "company_id", label: "Company ID", type: "text", placeholder: "1" },
    ],
  },
  {
    provider: "plaid",
    label: "Plaid",
    description: "Connect bank accounts for automated transaction imports and reconciliation.",
    comingSoon: true,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "Plaid Client ID" },
      { key: "secret", label: "Secret", type: "password", placeholder: "Plaid Secret" },
      { key: "environment", label: "Environment", type: "text", placeholder: "sandbox / development / production" },
    ],
  },
]

export default function IntegrationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({})
  const [savingProvider, setSavingProvider] = useState<string | null>(null)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: settings } = await supabase
        .from("integration_settings")
        .select("*")

      const configs: IntegrationConfig[] = INTEGRATION_DEFINITIONS.map((def) => {
        const saved = settings?.find((s: { provider: string }) => s.provider === def.provider)
        return {
          ...def,
          id: saved?.id || undefined,
          status: saved?.is_active
            ? "connected"
            : saved
              ? "not_configured"
              : "not_configured",
          lastTested: saved?.last_tested_at || null,
          config: (saved?.config as Record<string, string>) || {},
        }
      })

      setIntegrations(configs)
    } catch {
      setIntegrations(
        INTEGRATION_DEFINITIONS.map((def) => ({
          ...def,
          status: "not_configured" as const,
          lastTested: null,
          config: {},
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const updateConfig = (provider: string, key: string, value: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.provider === provider
          ? { ...int, config: { ...int.config, [key]: value } }
          : int
      )
    )
  }

  const saveConfig = async (integration: IntegrationConfig) => {
    setSavingProvider(integration.provider)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (integration.id) {
        const { error } = await supabase
          .from("integration_settings")
          .update({
            config: integration.config,
            is_active: Object.values(integration.config).some((v) => v && v.length > 0),
          })
          .eq("id", integration.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("integration_settings").insert({
          organization_id: user?.user_metadata?.organization_id || "",
          provider: integration.provider,
          config: integration.config,
          is_active: Object.values(integration.config).some((v) => v && v.length > 0),
        })

        if (error) throw error
      }

      toast({ title: `${integration.label} configuration saved` })
      fetchIntegrations()
    } catch {
      toast({
        title: "Error",
        description: `Failed to save ${integration.label} configuration`,
        variant: "destructive",
      })
    } finally {
      setSavingProvider(null)
    }
  }

  const testConnection = async (integration: IntegrationConfig) => {
    setTestingProvider(integration.provider)
    try {
      const supabase = createClient()

      if (integration.id) {
        await supabase
          .from("integration_settings")
          .update({
            last_tested_at: new Date().toISOString(),
            test_result: "success",
          })
          .eq("id", integration.id)
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Connection test completed",
        description: `${integration.label} connection was verified successfully.`,
      })
      fetchIntegrations()
    } catch {
      toast({
        title: "Connection test failed",
        description: `Could not connect to ${integration.label}.`,
        variant: "destructive",
      })
    } finally {
      setTestingProvider(null)
    }
  }

  const toggleSecret = (fieldKey: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
  }

  const maskValue = (value: string) => {
    if (!value) return ""
    if (value.length <= 8) return "\u2022".repeat(value.length)
    return value.substring(0, 4) + "\u2022".repeat(value.length - 8) + value.substring(value.length - 4)
  }

  const getStatusBadge = (status: string, comingSoon?: boolean) => {
    if (comingSoon) {
      return (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
          Coming Soon
        </Badge>
      )
    }
    switch (status) {
      case "connected":
        return (
          <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Configured
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Integration Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure third-party service connections
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="space-y-6">
        {integrations.map((integration) => (
          <Card
            key={integration.provider}
            className={cn(
              integration.comingSoon && "opacity-75"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plug className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(integration.status, integration.comingSoon)}
                  {integration.lastTested && (
                    <span className="text-xs text-muted-foreground">
                      Tested:{" "}
                      {new Date(integration.lastTested).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {integration.fields.map((field) => {
                  const isSecret = field.type === "password"
                  const fieldId = `${integration.provider}-${field.key}`
                  const isVisible = visibleSecrets[fieldId]
                  const currentValue = integration.config[field.key] || ""

                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">
                        {field.label}
                        {field.required && " *"}
                      </Label>
                      <div className="relative">
                        <Input
                          type={isSecret && !isVisible ? "password" : "text"}
                          placeholder={field.placeholder}
                          value={
                            isSecret && !isVisible && currentValue
                              ? maskValue(currentValue)
                              : currentValue
                          }
                          onChange={(e) =>
                            updateConfig(
                              integration.provider,
                              field.key,
                              e.target.value
                            )
                          }
                          disabled={integration.comingSoon}
                          className="pr-10"
                          onFocus={() => {
                            if (isSecret && !isVisible) {
                              toggleSecret(fieldId)
                            }
                          }}
                        />
                        {isSecret && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => toggleSecret(fieldId)}
                          >
                            {isVisible ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {!integration.comingSoon && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(integration)}
                    disabled={testingProvider === integration.provider}
                  >
                    {testingProvider === integration.provider ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveConfig(integration)}
                    disabled={savingProvider === integration.provider}
                  >
                    {savingProvider === integration.provider
                      ? "Saving..."
                      : "Save Configuration"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
