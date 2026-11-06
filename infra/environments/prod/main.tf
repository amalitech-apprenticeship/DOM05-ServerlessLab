module "storage" {
  source = "../../modules/storage"
  allowed_origins = var.allowed_origins
}

module "functions" {
  source = "../../modules/functions"
  tables = module.storage.tables
}

module "auth" {
  source = "../../modules/auth"
}

module "api" {
  source = "../../modules/api"

  functions_details = module.functions.functions_details

  allow_origins = var.allowed_origins
  allow_headers = var.allowed_headers
  allow_methods = var.allowed_methods
  jwt_audience = [module.auth.cognito_user_pool_client_id]
  jwt_issuer = module.auth.cognito_issuer_url
}