// Runs with bun (cdk.json: `bun src/cdk/app.ts`).
// One GiftListStack per region in REGIONS; the API key value comes from src/cli/deploy.sh
// (`-c apiKey=...`, kept in .relay/api-key).
import { App } from 'aws-cdk-lib'

import { REGIONS, stackName } from '../regions/regions'
import { GiftListStack } from './stack'

const app = new App()
const apiKeyValue: unknown = app.node.tryGetContext('apiKey')
const account: string | undefined = process.env['CDK_DEFAULT_ACCOUNT']
if (typeof apiKeyValue !== 'string' || apiKeyValue.length < 20) {
  throw new Error('Pass the API key with -c apiKey=<20+ characters> (src/cli/deploy.sh does).')
}
if (account === undefined) {
  throw new Error('Set CDK_DEFAULT_ACCOUNT (src/cli/deploy.sh does).')
}
REGIONS.map(
  ({ awsRegion, label }) =>
    new GiftListStack(app, stackName(label), {
      apiKeyValue,
      env: { account, region: awsRegion },
    }),
)
