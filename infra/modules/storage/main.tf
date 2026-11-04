resource "aws_dynamodb_table" "users" {
  name = "Users"
  hash_key = "id"
  billing_mode = "PROVISIONED"
  read_capacity = 2
  write_capacity = 2

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tasks" {
  name = "Tasks"
  hash_key = "id"
  billing_mode = "PROVISIONED"
  read_capacity = 2
  write_capacity = 2

  attribute {
    name = "id"
    type = "S"
  }

   attribute {
    name = "assigneeId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }
  attribute {
    name = "dueDate"
    type = "S"
  }

  global_secondary_index {
    name            = "byAssignee"
    projection_type = "ALL"
    read_capacity   = 2
    write_capacity  = 2

    key_schema {
        attribute_name = "assigneeId"
        key_type       = "HASH"
    }
    key_schema {
        attribute_name = "dueDate"
        key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "byStatus"
    projection_type = "ALL"
    read_capacity   = 2
    write_capacity  = 2

    key_schema {
        attribute_name = "status"
        key_type = "HASH"
    }
    key_schema {
        attribute_name = "dueDate"
        key_type = "RANGE"
    }
  }
}
resource "aws_dynamodb_table" "comments" {
  name = "Comments"
  hash_key = "taskId"
  range_key = "createdAt"
  billing_mode = "PROVISIONED"
  read_capacity = 2
  write_capacity = 2

  attribute {
    name = "taskId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }
}
resource "aws_dynamodb_table" "notifications" {
  name = "Notifications"
  hash_key = "recipientId"
  range_key = "createdAt"
  billing_mode = "PROVISIONED"
  read_capacity = 2
  write_capacity = 2

  attribute {
    name = "recipientId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }
}

