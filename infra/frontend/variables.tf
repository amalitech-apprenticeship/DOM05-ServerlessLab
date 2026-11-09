variable "repository_url" {
  type        = string
  description = "e.g. https://github.com/you/DOM05-ServerlessLab"
}

variable "github_token" {
  type      = string
  sensitive = true
}

variable "branch_name" {
  type    = string
  default = "main"
}

variable "api_url" {
  type = string
}

variable "user_pool_id" {
  type = string
}

variable "user_pool_client_id" {
  type = string
}