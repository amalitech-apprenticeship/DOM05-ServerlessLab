module "storage" {
  source = "../../modules/storage"
  allowed_origins = var.allowed_origins
}

module "functions" {
  source = "../../modules/functions"
  tables = module.storage.tables
  user_pool_arn = module.auth.cognito_user_pool_arn
  user_pool_id = module.auth.cognito_user_pool_id
  topic_arn = module.events.topic_arn
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

module "events" {
  source      = "../../modules/events"
  admin_email = var.admin_email
  deadline_check_function = module.functions.deadline_check_function

  save_notification_function = {
    name = module.functions.functions_details["save_notification"].name
    arn  = module.functions.functions_details["save_notification"].arn
  }
}