data "aws_iam_policy_document" "deadline_check_access" {
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [var.tables.tasks.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [var.topic_arn]
  }
}

resource "aws_iam_role" "deadline_check" {
  name               = "orvia-deadline-check-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "deadline_check_access" {
  name   = "deadline-check-access"
  role   = aws_iam_role.deadline_check.id
  policy = data.aws_iam_policy_document.deadline_check_access.json
}

resource "aws_iam_role_policy_attachment" "deadline_check_logs" {
  role       = aws_iam_role.deadline_check.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "deadline_check" {
  name              = "/aws/lambda/deadline-check"
  retention_in_days = 1
}

resource "aws_lambda_function" "deadline_check" {
  function_name    = "deadline-check"
  role             = aws_iam_role.deadline_check.arn
  handler          = "jobs/deadline_check.handler"
  runtime          = "nodejs22.x"
  timeout          = 10
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256

  environment {
    variables = {
      TASKS_TABLE_NAME = var.tables.tasks.name
      TOPIC_ARN        = var.topic_arn
    }
  }

  depends_on = [aws_cloudwatch_log_group.deadline_check]
}