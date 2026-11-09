output "app_id" {
  value = aws_amplify_app.this.id
}

output "url" {
  value = "https://${var.branch_name}.${aws_amplify_app.this.default_domain}"
}