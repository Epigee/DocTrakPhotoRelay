export interface UploadUrlContext {
  wsUrl: string
  userId: string
  configuration: string
  appSessionId?: string
  app: string
  targetApp?: string
  targetUserId?: string
  targetConfiguration?: string
  site?: string
  context?: string
  formGuid?: string
  mongooseUrl?: string
  messageType: string
  ackTimeoutMs: number
}

interface PartialContext {
  [key: string]: string | number | undefined
}

const DEFAULT_APP = 'DTEXTERNALAPP'
const DEFAULT_MESSAGE_TYPE = 'DocTrakMobileImageUpload'
const DEFAULT_ACK_TIMEOUT = 15000

export function parseUploadUrlContext(sourceUrl?: string): UploadUrlContext {
  const url = new URL(sourceUrl ?? window.location.href)
  const tokenPayload = parseContextToken(url.searchParams.get('ctx'))
  const merged = mergeContexts(tokenPayload, queryToContext(url.searchParams))

  const wsUrl = getValue(merged, ['wsUrl', 'socketUrl', 'url'])
  const userId = getValue(merged, ['userId', 'UserID', 'USERID'])
  const configuration = getValue(merged, ['configuration', 'Configuration', 'CONFIGURATION'])

  if (!wsUrl) {
    throw new Error('Missing required wsUrl query parameter.')
  }
  if (!userId) {
    throw new Error('Missing required userId query parameter.')
  }
  if (!configuration) {
    throw new Error('Missing required configuration query parameter.')
  }

  return {
    wsUrl,
    userId,
    configuration,
    appSessionId: getValue(merged, ['appSessionId', 'appsessionid', 'APPSESSIONID']),
    app: getValue(merged, ['app', 'APP']) ?? DEFAULT_APP,
    targetApp: getValue(merged, ['targetApp', 'toApp', 'TOAPP']) ?? undefined,
    targetUserId: getValue(merged, ['targetUserId', 'toUserId', 'TOUSERID']) ?? undefined,
    targetConfiguration: getValue(merged, ['targetConfiguration', 'toConfiguration', 'toConfig', 'TOCONFIGURATION']) ?? undefined,
    site: getValue(merged, ['site', 'Site']),
    context: getValue(merged, ['context', 'Context']),
    formGuid: getValue(merged, ['formGuid', 'FormGUID']),
    mongooseUrl: getValue(merged, ['mongooseUrl', 'MongooseURL']),
    messageType: getValue(merged, ['messageType']) ?? DEFAULT_MESSAGE_TYPE,
    ackTimeoutMs: parseNumber(getValue(merged, ['ackTimeoutMs']), DEFAULT_ACK_TIMEOUT),
  }
}

function parseContextToken(encoded: string | null): PartialContext {
  if (!encoded) {
    return {}
  }

  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding)

  try {
    const json = atob(padded)
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Token payload was not an object.')
    }
    return parsed as PartialContext
  } catch {
    throw new Error('Invalid ctx token payload.')
  }
}

function queryToContext(searchParams: URLSearchParams): PartialContext {
  const context: PartialContext = {}
  searchParams.forEach((value, key) => {
    context[key] = value
  })
  return context
}

function mergeContexts(base: PartialContext, override: PartialContext): PartialContext {
  return { ...base, ...override }
}

function getValue(source: PartialContext, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
