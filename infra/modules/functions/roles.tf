data "aws_iam_policy_document" "assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "tasks_access_dynamo" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem"
    ]
    resources = [var.tables.tasks.arn, "${var.tables.tasks.arn}/index/*"]
  }
}

resource "aws_iam_role" "tasks" {
  name               = "orvia-tasks-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "tasks_access" {
  name   = "tasks-access"
  role   = aws_iam_role.tasks.id
  policy = data.aws_iam_policy_document.tasks_access_dynamo.json
}

resource "aws_iam_role_policy_attachment" "tasks_log" {
  role       = aws_iam_role.tasks.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
