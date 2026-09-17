import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getApiKeys, getWebhooks } from '@/lib/services/integrationService'
import type { ApiKey, Webhook } from '@/types/domain'

export function useApiKeys() {
  const { user } = useSession()
  const [apiKeys, setApiKeys] = useState<ApiKey[] | null>(null)

  const refetch = useCallback(() => {
    getApiKeys(user).then(setApiKeys)
  }, [user])

  useEffect(() => {
    setApiKeys(null)
    refetch()
  }, [refetch])

  return { apiKeys: apiKeys ?? [], isLoading: apiKeys === null, refetch }
}

export function useWebhooks() {
  const { user } = useSession()
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null)

  const refetch = useCallback(() => {
    getWebhooks(user).then(setWebhooks)
  }, [user])

  useEffect(() => {
    setWebhooks(null)
    refetch()
  }, [refetch])

  return { webhooks: webhooks ?? [], isLoading: webhooks === null, refetch }
}
