output "topic_arn" {
  value = aws_sns_topic.notifications.arn
}
output "state_machine_arn" {
  value = aws_sfn_state_machine.deadlines.arn
}