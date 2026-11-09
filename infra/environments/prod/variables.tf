variable "allowed_origins" {
  type = list(string)
}

variable "allowed_methods" {
  type = list(string)
}

variable "allowed_headers" {
  type = list(string)
}

variable "admin_email" {
  type = string
}

variable "repository_url" {
  type        = string
}

variable "github_token" {
  type      = string
  sensitive = true
}