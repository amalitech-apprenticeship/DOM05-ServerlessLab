resource "aws_sns_topic" "notifications" {
  name = "orvia-task-notifications"
}

resource "aws_sns_topic_subscription" "save_notification" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = var.save_notification_function.arn
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.save_notification_function.name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.notifications.arn
}

resource "aws_sns_topic_subscription" "admin_email" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "email"
  endpoint  = var.admin_email

  filter_policy = jsonencode({
    recipientId = ["admin"]
  })
}