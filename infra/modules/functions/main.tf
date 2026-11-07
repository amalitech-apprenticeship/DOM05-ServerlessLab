data "archive_file" "functions" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/functions"
  output_path = "${path.module}/build/functions.zip"
}

locals {
  roles = {
    tasks = aws_iam_role.tasks.arn
  }

  functions = {
    list_tasks = {
      handler = "tasks/list_tasks.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
    create_task = {
      handler = "tasks/create_task.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
    update_task = {
      handler = "tasks/update_task.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
    assign_task = {
      handler = "tasks/assign_task.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
    update_status = {
      handler = "tasks/update_status.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
    get_task = {
      handler = "tasks/get_task.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
    delete_task = {
      handler = "tasks/delete_task.handler"
      role    = "tasks"
      env     = tomap({ TASKS_TABLE_NAME = var.tables.tasks.name })
    }
  }
}

resource "aws_cloudwatch_log_group" "this" {
  for_each          = local.functions
  name              = "/aws/lambda/${replace(each.key, "_", "-")}"
  retention_in_days = 1
}

resource "aws_lambda_function" "this" {
  for_each = local.functions

  function_name    = replace(each.key, "_", "-")
  role             = local.roles[each.value.role]
  handler          = each.value.handler
  runtime          = "nodejs22.x"
  timeout          = 10
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256

  environment {
    variables = each.value.env
  }

  depends_on = [aws_cloudwatch_log_group.this]
}
