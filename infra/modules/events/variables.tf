variable "admin_email" {
  type = string
}

variable "save_notification_function" {
  type = object({
    name = string
    arn  = string
  })
}