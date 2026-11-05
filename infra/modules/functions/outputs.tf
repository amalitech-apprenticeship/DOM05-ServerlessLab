output "list_tasks_invoke_arn" {
  value = aws_lambda_function.list_tasks.invoke_arn
}

output "list_tasks_name" {
  value = aws_lambda_function.list_tasks.function_name
}