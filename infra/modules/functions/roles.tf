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

# ----------------- TASKS ROLES --------------------------------
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

# --------------------- MEMBERS ROLES ----------------------------------

data "aws_iam_policy_document" "members_access" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminDisableUser",
      "cognito-idp:AdminEnableUser",
      "cognito-idp:AdminUserGlobalSignOut"
    ]
    resources = [var.user_pool_arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Scan"
    ]
    resources = [var.tables.users.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem"
    ]
    resources = [
      var.tables.tasks.arn,
      "${var.tables.tasks.arn}/index/*"
    ]
  }
}

resource "aws_iam_role" "members" {
  name               = "orvia-members-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "members_access" {
  name   = "members-access"
  role   = aws_iam_role.members.id
  policy = data.aws_iam_policy_document.members_access.json
}

resource "aws_iam_role_policy_attachment" "members_logs" {
  role       = aws_iam_role.members.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

