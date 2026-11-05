module "storage" {
  source = "../../modules/storage"
  allowed_origins = var.allowed_origins
}

module "functions" {
  source = "../../modules/functions"
  tables = module.storage.tables
}