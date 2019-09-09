provider "aws" {
  profile = "default"
  region = "eu-west-3"
}

resource "aws_vpc" "screenshot_vpc" {
  cidr_block       = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "screenshot-vpc"
  }
}

resource "aws_subnet" "screenshot_subnet_public" {
  vpc_id     = aws_vpc.screenshot_vpc.id
  cidr_block = "10.0.1.0/24"
  tags = {
    Name = "screenshot-subnet-public"
  }
}

resource "aws_subnet" "screenshot_subnet_private" {
  vpc_id     = aws_vpc.screenshot_vpc.id
  cidr_block = "10.0.0.0/24"
  tags = {
    Name = "screenshot-subnet-private"
  }
}

resource "aws_internet_gateway" "screenshot_ig" {
  vpc_id = aws_vpc.screenshot_vpc.id

  tags = {
    Name = "screenshot-ig"
  }
}

resource "aws_default_route_table" "screenshot_rt" {
  default_route_table_id = aws_vpc.screenshot_vpc.default_route_table_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.screenshot_ig.id
  }

  tags = {
    Name = "screnshot-rt"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_agent" {
  role       = aws_iam_role.ecs_agent.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_agent" {
  name = "screenshot-ecs-agent"
  role = aws_iam_role.ecs_agent.name
}

resource "aws_security_group" "allow_http" {
  name        = "screenshot-sg"
  description = "Allow HTTP inbound traffic"
  vpc_id      = aws_vpc.screenshot_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }


  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

}

resource "aws_launch_configuration" "screenshot_launch_configuration" {
  name_prefix   = "screenshot-lc-"
  image_id = data.aws_ami.ecs_optimized.id
  instance_type = "t3.medium"
  security_groups = [aws_security_group.allow_http.id]
  iam_instance_profile = aws_iam_instance_profile.ecs_agent.name
  user_data = "#!/bin/bash\necho ECS_CLUSTER=${aws_ecs_cluster.screenshot_cluster.name} >> /etc/ecs/ecs.config;\necho ECS_BACKEND_HOST= >> /etc/ecs/ecs.config;"
  associate_public_ip_address = true
  key_name = "custhome"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "screenshot_autoscaling_group" {
  name                 = "screenshot-ag"
  min_size         = 0
  max_size         = 1
  desired_capacity = 1
  vpc_zone_identifier = [aws_subnet.screenshot_subnet_private.id, aws_subnet.screenshot_subnet_public.id]
  launch_configuration = aws_launch_configuration.screenshot_launch_configuration.name
  health_check_grace_period = 300

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_ecs_cluster" "screenshot_cluster" {
  name = "screenshot-cluster"
}

resource "aws_ecs_service" "screenshot_service" {
  name = "screenshot-service"
  cluster = aws_ecs_cluster.screenshot_cluster.id
  task_definition = aws_ecs_task_definition.screenshot_task.arn
  desired_count = 1
  launch_type = "EC2"
}

resource "aws_ecs_task_definition" "screenshot_task" {
  family = "screenshot-task"
  container_definitions = file("task-definitions/screenshot.json")
}

data "aws_ami" "ecs_optimized" {
  owners = ["amazon"]
  filter {
    name = "name"
    values = ["amzn2-ami-ecs-hvm-2.0.20190815-x86_64-ebs"]
  }
}

data "template_file" "user_data" {
  template = file("${path.module}/user_data.yaml")
}

# Define the role.
resource "aws_iam_role" "ecs_agent" {
  name               = "terra-ecs-agent"
  assume_role_policy = data.aws_iam_policy_document.ecs_agent.json
}

# Allow EC2 service to assume this role.
data "aws_iam_policy_document" "ecs_agent" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}
