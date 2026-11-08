data "archive_file" "functions" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/functions"
  output_path = "${path.module}/build/functions.zip"
}

locals {
  roles = {
    tasks         = aws_iam_role.tasks.arn
    members       = aws_iam_role.members.arn
    notifications = aws_iam_role.notifications.arn
  }

  tasks_env = tomap({
    TASKS_TABLE_NAME = var.tables.tasks.name
    TOPIC_ARN        = var.topic_arn
  })

  members_env = tomap({
    USERS_TABLE_NAME = var.tables.users.name
    TASKS_TABLE_NAME = var.tables.tasks.name
    USER_POOL_ID     = var.user_pool_id
    TOPIC_ARN        = var.topic_arn
  })

  notifications_env = tomap({
    NOTIFICATIONS_TABLE_NAME = var.tables.notifications.name
  })

  functions = {
    list_tasks = {
      handler = "tasks/list_tasks.handler"
      role    = "tasks"
      env     = local.tasks_env
    }
    create_task = {
      handler = "tasks/create_task.handler"
      role    = "tasks"
      env     = local.tasks_env
    }
    update_task = {
      handler = "tasks/update_task.handler"
      role    = "tasks"
      env     = local.tasks_env
    }
    assign_task = {
      handler = "tasks/assign_task.handler"
      role    = "tasks"
      env     = local.tasks_env
    }
    update_status = {
      handler = "tasks/update_status.handler"
      role    = "tasks"
      env     = local.tasks_env
    }
    get_task = {
      handler = "tasks/get_task.handler"
      role    = "tasks"
      env     = local.tasks_env
    }
    delete_task = {
      handler = "tasks/delete_task.handler"
      role    = "tasks"
      env     = local.tasks_env
    }

    create_member = {
      handler = "members/create_member.handler"
      role    = "members"
      env     = local.members_env
    }
    list_members = {
      handler = "members/list_members.handler"
      role    = "members"
      env     = local.members_env
    }
    get_member = {
      handler = "members/get_member.handler"
      role    = "members"
      env     = local.members_env
    }
    update_member = {
      handler = "members/update_member.handler"
      role    = "members"
      env     = local.members_env
    }
    get_me = {
      handler = "me/get_me.handler"
      role    = "members"
      env     = local.members_env
    }
    save_notification = {
      handler = "jobs/save_notification.handler"
      role    = "notifications"
      env     = local.notifications_env
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
