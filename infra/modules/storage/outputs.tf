output "tables" {
  value = {
    users         = { name = aws_dynamodb_table.users.name,         arn = aws_dynamodb_table.users.arn }
    tasks         = { name = aws_dynamodb_table.tasks.name,         arn = aws_dynamodb_table.tasks.arn }
    comments      = { name = aws_dynamodb_table.comments.name,      arn = aws_dynamodb_table.comments.arn }
    notifications = { name = aws_dynamodb_table.notifications.name, arn = aws_dynamodb_table.notifications.arn }
  }
}

output "attachments_bucket" {
  value = {
    name = aws_s3_bucket.attachments.bucket
    arn  = aws_s3_bucket.attachments.arn
  }
}

