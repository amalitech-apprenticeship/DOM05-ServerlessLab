resource "aws_amplify_app" "this" {
  name         = "orvia-frontend"
  repository   = var.repository_url
  access_token = var.github_token
  platform     = "WEB"

  build_spec = <<-YAML
    version: 1
    applications:
      - appRoot: frontend
        frontend:
          phases:
            preBuild:
              commands:
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: dist
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
  YAML

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
  }

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }
}

resource "aws_amplify_branch" "this" {
  app_id            = aws_amplify_app.this.id
  branch_name       = var.branch_name
  stage             = "PRODUCTION"
  enable_auto_build = true

  environment_variables = {
    VITE_API_MODE             = "http"
    VITE_API_BASE_URL         = var.api_url
    VITE_COGNITO_USER_POOL_ID = var.user_pool_id
    VITE_COGNITO_CLIENT_ID    = var.user_pool_client_id
    VITE_MAX_ATTACHMENT_MB    = "10"
  }
}