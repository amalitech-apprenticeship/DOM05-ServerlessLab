set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (copy .env.example and fill it in)"; exit 1; }
set -a; source "$ENV_FILE"; set +a

TF_PATH="$SCRIPT_DIR/../$TF_DIR"
POOL_ID=$(terraform -chdir="$TF_PATH" output -raw cognito_user_pool_id)

if aws cognito-idp admin-get-user --region "$AWS_REGION" --user-pool-id "$POOL_ID" \
     --username "$ADMIN_EMAIL" > /dev/null 2>&1; then
  echo "User $ADMIN_EMAIL already exists, skipping creation."
else
  aws cognito-idp admin-create-user --region "$AWS_REGION" --user-pool-id "$POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true Name=name,Value="$ADMIN_NAME" \
    --message-action SUPPRESS > /dev/null
  echo "Created $ADMIN_EMAIL."
fi

aws cognito-idp admin-set-user-password --region "$AWS_REGION" --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --permanent

aws cognito-idp admin-add-user-to-group --region "$AWS_REGION" --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" --group-name admin

echo "Done: $ADMIN_EMAIL is an admin in $POOL_ID."