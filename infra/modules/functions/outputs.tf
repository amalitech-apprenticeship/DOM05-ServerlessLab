output "functions_details" {
  value = {
    for key, fn in aws_lambda_function.this : key => {
      name       = fn.function_name
      invoke_arn = fn.invoke_arn
      arn        = fn.arn
    }
  }
}
output "deadline_check_function" {
  value = {
    name = aws_lambda_function.deadline_check.function_name
    arn  = aws_lambda_function.deadline_check.arn
  }
}