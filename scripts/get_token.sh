SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE (copy .env.example and fill it in)"
  return 1 2>/dev/null || exit 1
fi
set -a; source "$ENV_FILE"; set +a

TF_PATH="$SCRIPT_DIR/../$TF_DIR"
LOGIN_EMAIL="${1:-$ADMIN_EMAIL}"
LOGIN_PASSWORD="${2:-$ADMIN_PASSWORD}"

if ! CLIENT_ID=$(terraform -chdir="$TF_PATH" output -raw cognito_user_pool_client_id); then
  echo "Could not read client_id from Terraform outputs."
  return 1 2>/dev/null || exit 1
fi

if ! TOKEN=$(aws cognito-idp initiate-auth --region "$AWS_REGION" --client-id "$CLIENT_ID" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME="$LOGIN_EMAIL",PASSWORD="$LOGIN_PASSWORD" \
    --query 'AuthenticationResult.IdToken' --output text); then
  echo "Login failed for $LOGIN_EMAIL."
  return 1 2>/dev/null || exit 1
fi

API_URL=$(terraform -chdir="$TF_PATH" output -raw api_gateway_invoke_url 2>/dev/null)
API_URL="${API_URL%/}"
export TOKEN API_URL

echo "Logged in as $LOGIN_EMAIL. TOKEN exported (valid for about 1 hour)."
[ -n "$API_URL" ] && echo "Try: curl -i -H \"Authorization: \$TOKEN\" \"\$API_URL/tasks\""