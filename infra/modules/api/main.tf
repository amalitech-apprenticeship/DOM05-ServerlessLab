locals {
  routes = {
    list_tasks = "GET /tasks"
  }
}


resource "aws_apigatewayv2_api" "this" {
  name = "orvia-lab5-apigateway"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allow_origins
    allow_methods = var.allow_methods
    allow_headers = var.allow_headers
    max_age = 3600
  }
}

resource "aws_apigatewayv2_authorizer" "this" {
  api_id = aws_apigatewayv2_api.this.id
  name = "orvia-lab5-api-authorizer"
  authorizer_type = "JWT"
  identity_sources = [ "$request.header.Authorization" ]

  jwt_configuration {
    audience = var.jwt_audience
    issuer = var.jwt_issuer
  }
}

resource "aws_apigatewayv2_integration" "this" {
  for_each = local.routes

  api_id = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"
  payload_format_version = "2.0"
  integration_uri = var.functions_details[each.key].invoke_arn
}

resource "aws_apigatewayv2_route" "this" {
  for_each = local.routes

  api_id = aws_apigatewayv2_api.this.id
  route_key = each.value
  target = "integrations/${aws_apigatewayv2_integration.this[each.key].id}"
  authorization_type = "JWT"
  authorizer_id = aws_apigatewayv2_authorizer.this.id
}

resource "aws_lambda_permission" "allow_apigateway" {
  for_each = local.routes

  statement_id = "AllowAPIGatewayInvoke"
  action = "lambda:InvokeFunction"
  function_name = var.functions_details[each.key].name
  principal = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "this" {
  api_id = aws_apigatewayv2_api.this.id
  name = "$default"
  auto_deploy = true
}
