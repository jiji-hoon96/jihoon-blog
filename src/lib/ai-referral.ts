export type AiReferralSource =
  | 'chatgpt'
  | 'claude'
  | 'perplexity'
  | 'copilot'
  | 'gemini'

type AiReferralInput = {
  utmSource?: string | null
  referrer?: string | null
}

const UTM_SOURCES: Record<string, AiReferralSource> = {
  chatgpt: 'chatgpt',
  'chatgpt.com': 'chatgpt',
  claude: 'claude',
  'claude.ai': 'claude',
  perplexity: 'perplexity',
  'perplexity.ai': 'perplexity',
  copilot: 'copilot',
  'copilot.microsoft.com': 'copilot',
  gemini: 'gemini',
  'gemini.google.com': 'gemini',
}

const REFERRER_HOSTS: Array<[string, AiReferralSource]> = [
  ['chatgpt.com', 'chatgpt'],
  ['claude.ai', 'claude'],
  ['perplexity.ai', 'perplexity'],
  ['copilot.microsoft.com', 'copilot'],
  ['gemini.google.com', 'gemini'],
]

function matchesHost(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`)
}

export function classifyAiReferral(
  input: AiReferralInput,
): AiReferralSource | undefined {
  const utmSource = input.utmSource?.trim().toLowerCase()
  if (utmSource && UTM_SOURCES[utmSource]) {
    return UTM_SOURCES[utmSource]
  }

  if (!input.referrer) return undefined

  try {
    const hostname = new URL(input.referrer).hostname.toLowerCase()
    return REFERRER_HOSTS.find(([host]) => matchesHost(hostname, host))?.[1]
  } catch {
    return undefined
  }
}
