// Runs with bun (bunx cdk synth / deploy).
// One regional API Gateway (REST, HTTP proxy) per AWS region: TikTok sees the request coming from
// that region's AWS IP, so the gift list comes back as TikTok serves it there. It forwards only
// the two TikTok endpoints the fetch needs (GATEWAY_ROUTES), and every call needs the API key.
import { CfnOutput, Stack } from 'aws-cdk-lib'
import type { StackProps } from 'aws-cdk-lib'
import { EndpointType, HttpIntegration, Period, RestApi } from 'aws-cdk-lib/aws-apigateway'
import type { Construct } from 'constructs'

import { OUTPUT_ENDPOINT } from '../regions/regions'
import { GATEWAY_ROUTES } from '../tiktok/tiktok'

interface GiftListStackProps extends StackProps {
  readonly apiKeyValue: string
}

const STAGE_NAME: string = 'proxy'
const GET: string = 'GET'
const RATE_LIMIT: number = 5
const BURST_LIMIT: number = 10
// One person's fetches: a few panels per run.
const DAILY_QUOTA: number = 1000

// HTTP proxy: the query string and headers pass through to the fixed TikTok URL.
const integration = (url: string): HttpIntegration =>
  new HttpIntegration(url, { httpMethod: GET, proxy: true })

export class GiftListStack extends Stack {
  constructor(scope: Construct, id: string, props: GiftListStackProps) {
    super(scope, id, props)
    const api = new RestApi(this, 'TikTokGateway', {
      deployOptions: { stageName: STAGE_NAME },
      endpointConfiguration: { types: [EndpointType.REGIONAL] },
      restApiName: `tiktok-gift-list-${this.region}`,
    })
    ;[...GATEWAY_ROUTES].map(([url, route]) =>
      api.root.addResource(route).addMethod(GET, integration(url), { apiKeyRequired: true }),
    )
    const plan = api.addUsagePlan('UsagePlan', {
      apiStages: [{ stage: api.deploymentStage }],
      quota: { limit: DAILY_QUOTA, period: Period.DAY },
      throttle: { burstLimit: BURST_LIMIT, rateLimit: RATE_LIMIT },
    })
    plan.addApiKey(api.addApiKey('ApiKey', { value: props.apiKeyValue }))
    new CfnOutput(this, OUTPUT_ENDPOINT, { value: api.url })
  }
}

export type { GiftListStackProps }
