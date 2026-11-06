output "functions_details" {
    value = {
        list_tasks = {
            name = aws_lambda_function.list_tasks.function_name, 
            invoke_arn = aws_lambda_function.list_tasks.invoke_arn
        }
    }
}