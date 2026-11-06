data "archive_file" "functions" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/functions"
  output_path = "${path.module}/build/functions.zip"
}

resource "aws_lambda_function" "list_tasks" {
  function_name = "list-tasks"
  role = aws_iam_role.tasks.arn
  handler = "tasks/list_tasks.handler"
  runtime = "nodejs22.x"

  source_code_hash = data.archive_file.functions.output_base64sha256
  filename = data.archive_file.functions.output_path

  environment {
    variables = {
      TASKS_TABLE_NAME = var.tables.tasks.name
    }
  }

}