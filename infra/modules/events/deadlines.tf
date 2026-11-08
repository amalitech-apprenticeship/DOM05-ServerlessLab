data "aws_iam_policy_document" "sfn_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "deadlines_access" {
  statement {
    effect  = "Allow"
    actions = ["lambda:InvokeFunction"]
    resources = [
      var.deadline_check_function.arn,
      "${var.deadline_check_function.arn}:*",
    ]
  }
}

resource "aws_iam_role" "deadlines" {
  name               = "orvia-deadlines-sfn"
  assume_role_policy = data.aws_iam_policy_document.sfn_assume_role.json
}

resource "aws_iam_role_policy" "deadlines_access" {
  name   = "deadlines-access"
  role   = aws_iam_role.deadlines.id
  policy = data.aws_iam_policy_document.deadlines_access.json
}

locals {
  lambda_retry = [{
    ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException", "Lambda.TooManyRequestsException"]
    IntervalSeconds = 2
    MaxAttempts     = 3
    BackoffRate     = 2
  }]
}

resource "aws_sfn_state_machine" "deadlines" {
  name     = "orvia-task-deadlines"
  role_arn = aws_iam_role.deadlines.arn
  type     = "STANDARD"

  definition = jsonencode({
    Comment = "Reminder 24h before a task's deadline, then an overdue alert after it"
    StartAt = "ShouldRemind"
    States = {
      ShouldRemind = {
        Type    = "Choice"
        Choices = [{ Variable = "$.skipReminder", BooleanEquals = true, Next = "WaitForDeadline" }]
        Default = "WaitForReminder"
      }
      WaitForReminder = {
        Type          = "Wait"
        TimestampPath = "$.remindAt"
        Next          = "SendReminder"
      }
      SendReminder = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = var.deadline_check_function.arn
          Payload = {
            "taskId.$"     = "$.taskId"
            "assigneeId.$" = "$.assigneeId"
            "dueDate.$"    = "$.dueDate"
            kind           = "reminder"
          }
        }
        ResultPath = null
        Retry      = local.lambda_retry
        Next       = "WaitForDeadline"
      }
      WaitForDeadline = {
        Type          = "Wait"
        TimestampPath = "$.dueAt"
        Next          = "SendOverdue"
      }
      SendOverdue = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = var.deadline_check_function.arn
          Payload = {
            "taskId.$"     = "$.taskId"
            "assigneeId.$" = "$.assigneeId"
            "dueDate.$"    = "$.dueDate"
            kind           = "overdue"
          }
        }
        ResultPath = null
        Retry      = local.lambda_retry
        End        = true
      }
    }
  })
}