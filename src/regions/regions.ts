// Runs with bun.
// The AWS regions the gift panel is read from (one API Gateway each, see src/cdk/) and how the CDK
// outputs file maps back to them.
interface Region {
  readonly awsRegion: string
  readonly label: string
}

export const REGIONS: readonly Region[] = [
  { awsRegion: 'ap-northeast-1', label: 'JP' },
  { awsRegion: 'us-east-1', label: 'US' },
  { awsRegion: 'eu-west-2', label: 'GB' },
  { awsRegion: 'ap-southeast-1', label: 'SG' },
]
const STACK_PREFIX: string = 'TikTokGiftList-'
const OUTPUT_ENDPOINT: string = 'Endpoint'

export const stackName = (label: string): string => `${STACK_PREFIX}${label}`

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const endpointOf = (outputs: unknown, label: string): string | null => {
  const stack = isRecord(outputs) ? outputs[stackName(label)] : null
  const endpoint = isRecord(stack) ? stack[OUTPUT_ENDPOINT] : null
  return typeof endpoint === 'string' && endpoint.startsWith('https://') ? endpoint : null
}

// label -> gateway stage URL, from `cdk deploy --outputs-file`, in REGIONS order.
export const parseEndpoints = (outputs: unknown): ReadonlyMap<string, string> =>
  new Map(
    REGIONS.flatMap(({ label }): [string, string][] => {
      const endpoint = endpointOf(outputs, label)
      return endpoint === null ? [] : [[label, endpoint]]
    }),
  )

export { OUTPUT_ENDPOINT }
export type { Region }
