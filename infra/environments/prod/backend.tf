terraform {
  backend "s3" {
    bucket = "lab-five-o0einaw4ol2p"
    key = "state/prod"
    region = "eu-west-1"
    use_lockfile = true
  }
}