output "functions_details" {
  value = {
    for key, fn in aws_lambda_function.this : key => {
      name       = fn.function_name
      invoke_arn = fn.invoke_arn
    }
  }
}