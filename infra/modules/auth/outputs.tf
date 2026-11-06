output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.this.id
}

output "cognito_issuer_url" {
  value = "https://${aws_cognito_user_pool.this.endpoint}"
}

output "cognito_user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}