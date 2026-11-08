variable "tables" {
  type = map(object({
    name = string
    arn  = string
  }))
}

variable "user_pool_arn" {
  type = string
}

variable "user_pool_id" {
  type = string
}

variable "topic_arn" {
  type = string
}

variable "state_machine_arn" {
  type = string
}