output "cognito_user_pool_id" {
  value = module.auth.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  value = module.auth.cognito_user_pool_client_id
}

output "api_gateway_invoke_url" {
  value = module.api.api_gateway_invoke_url
}