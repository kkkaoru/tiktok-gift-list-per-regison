#!/usr/bin/env bash
# Deploys (or with --delete removes) one API Gateway per region in src/regions.ts (src/cdk/), with the
# AWS CLI profile in AWS_PROFILE. Bootstraps CDK in a region only when it is not yet.
#   AWS_PROFILE=personal bash src/cli/deploy.sh            # deploy / update
#   AWS_PROFILE=personal bash src/cli/deploy.sh --delete   # remove the gateways
# Keeps the API key and the gateway URLs in .relay/ (gitignored); never prints the key.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/.relay"
: "${AWS_PROFILE:?Set AWS_PROFILE to the AWS CLI profile to deploy with}"
export AWS_PROFILE
# The CDK CLI cannot read `aws login` sessions: hand it the profile's temporary credentials.
eval "$(aws configure export-credentials --format env)"
CDK_DEFAULT_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
export CDK_DEFAULT_ACCOUNT
cd "$ROOT"
mkdir -p "$OUT"
umask 077
[[ -s "$OUT/api-key" ]] || openssl rand -hex 24 > "$OUT/api-key"
API_KEY="$(cat "$OUT/api-key")"

if [[ "${1:-}" == "--delete" ]]; then
  bunx cdk destroy --all --force -c apiKey="$API_KEY"
  rm -f "$OUT/outputs.json"
  exit 0
fi

REGIONS="$(bun -e "import { REGIONS } from './src/regions/regions'; console.log(REGIONS.map((r) => r.awsRegion).join(' '))")"
for region in $REGIONS; do
  if ! aws cloudformation describe-stacks --region "$region" --stack-name CDKToolkit > /dev/null 2>&1; then
    bunx cdk bootstrap "aws://$CDK_DEFAULT_ACCOUNT/$region" -c apiKey="$API_KEY"
  fi
done
bunx cdk deploy --all --require-approval never -c apiKey="$API_KEY" \
  --outputs-file "$OUT/outputs.json"
echo "Gateways: $OUT/outputs.json"
