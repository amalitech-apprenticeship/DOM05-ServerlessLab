resource "aws_cognito_user_pool" "this" {
  name = "lab5_users_pool"
  # deletion_protection = "ACTIVE"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # lifecycle {
  #   prevent_destroy = true
  # }

  admin_create_user_config {
    allow_admin_create_user_only = true
    invite_message_template {
      email_subject = "Welcome to the Team"
      email_message = "Hello, your account using the email {username} has been created, your temporary password is {####}. Please log in and change it."
      sms_message   = "Hello, your account using the email {username} has been created, your temporary password is {####}. Please log in and change it."
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 3
  }

  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD"]
  }

  schema {
    name                = "name"
    mutable             = true
    required            = true
    attribute_data_type = "String"
    string_attribute_constraints {
      min_length = 1
      max_length = 255
    }
  }
}

resource "aws_cognito_user_pool_client" "this" {
  name         = "lab5-cognito-client"
  user_pool_id = aws_cognito_user_pool.this.id

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH"]

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  access_token_validity         = 1
  id_token_validity             = 1
  auth_session_validity         = 3
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.this.id
}

resource "aws_cognito_user_group" "member" {
  name         = "member"
  user_pool_id = aws_cognito_user_pool.this.id
}
