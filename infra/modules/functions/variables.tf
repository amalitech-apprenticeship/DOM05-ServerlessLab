variable "tables" {
  type = map(object({
    name = string
    arn  = string
  }))
}