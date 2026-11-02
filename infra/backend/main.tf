terraform {
  required_providers {
    aws ={
        source = "hashicorp/aws"
        version = "~> 6.0"
    }
    random = {
        source = "hashicorp/random"
        version = "~> 3.9"
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

resource "random_string" "this" {
  length = 12
  upper = false
  lower = true
  special = false
}

resource "aws_s3_bucket" "this" {
  bucket = "lab-five-${random_string.this.result}"
  object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    default_retention {
      days = 7
    }
  }
}