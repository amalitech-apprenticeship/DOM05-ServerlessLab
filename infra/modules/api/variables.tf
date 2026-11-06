variable "allow_origins" {
  type = list(string)
}

variable "allow_methods" {
  type = list(string)
}

variable "allow_headers" {
  type = list(string)
}

variable "jwt_audience" {
  type = list(string)
}

variable "jwt_issuer" {
  type = string
}

variable "functions_details" {
  type = map(object({
    name = string
    invoke_arn = string
  }))
}