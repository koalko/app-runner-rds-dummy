# AppRunner/RDS/FCK-NAT Deployment

Working with `eu-west-2` (London).

## VPC

Create a VPC `test-vpc` (VPC and more) with default CIDR, 3 private and 3 public subnets.

## RDS

Create an RDS subnet group `test-db-subnet-group`, select `test-vpc` and 3 private subnets.

Create an RDS database `test-db` in `test-vpc/test-db-subnet-group` with a new `test-db-sg` security group.

## Bastion (optional)

Create a EC2 instance `test-bastion` in any public subnet of `test-vpc` with new key pair `test-key-pair`, new security group `test-bastion-sg` with SSH rule for local IP; and connect this instance to RDS instance.

Move the private key to `~/.ssh` for convenience and adjust its permissions via:

```sh
chmod 400 ~/.ssh/test-key-pair.pem
```

Connect to bastion instance via:

```sh
ssh -i ~/.ssh/test-key-pair.pem ec2-user@<bastion-ip>
```

Install PostgreSQL client. Check connection to DB via:

```sh
psql -h <db-host> -U postgres
```

Close the bastion connection.

## Build the test project

Clone the [app-runner-rds-dummy](https://github.com/koalko/app-runner-rds-dummy) repository.

Create a private ECR repository `test/app`. Press `View push commands` button and execute them one by one in the `app-runner-rds-dummy` application directory. You might need to specify the platform during the image build step:

```sh
docker build -t test/app --platform linux/amd64 .
```

## AppRunner Service

Create the AppRunner service `test-app` using newly pushed ECR container image. Set auto scaling to min 1, max 2 to avoid overspending. Health check is HTTP-based, on `/`. Incoming traffic: public; outgoing traffic: via `test-vpc`, specify all private subnets, pick the security group which has **enabled any outgoing traffic**. Important environment variables:

```sh
APP_PING_RATE_MS=10000
APP_PORT=8080
PG_HOST=<rds_database_hostname>
PG_PORT=5432
PG_USER=postgres
PG_DATABASE=postgres
PG_PASSWORD=<rds_database_password>
```

## NAT

Launch a EC2 instance `test-nat` in public subnet (search the image by `568608671756` or `fck-nat-al2023-hvm` in community images). Use the same key pair as before. In network settings use `test-vpc`, any public subnet. Use a newly created security group `test-nat-sg`, which allow SSH traffic from "My IP" and allow all traffic from VPC (`10.0.0.0/16`).

Go to `test-nat` instance's Network Interfaces and edit bound eni. Disable source/dest. check.

For all private route tables in the `test-vpc` add routes with `0.0.0.0/0` destination and instance `test-nat` target.
