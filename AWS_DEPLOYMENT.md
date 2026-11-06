# Deploy ONEQUEUE on AWS

## Current deployment: one EC2 server, no extra cost (Free plan)

ONEQUEUE runs on the existing EC2 instance **ONEQUEUE** (`i-05aca6bf529984848`, t3.micro, Ubuntu 26.04, **us-east-1**). The public IP is `32.200.156.245`, and the app is served at **https://32-200-156-245.sslip.io**. Caddy provides a free Let's Encrypt certificate and forwards traffic to the Node app on port 8080. Node runs as the `onequeue` systemd service, and Caddy as the `caddy` service. It uses no load balancer, Secrets Manager or NAT gateway, so the cost is covered by Free-plan credits.

**Deploy or update:** in Git Bash from the project folder, run:

```
sh deploy/aws-ec2/deploy.sh
```

The script builds the client, uploads the app and the Supabase keys from `server/.env` (saved on the server as `/opt/onequeue/.env.production`, readable only by root and the app), and restarts the service. It uses `~/Downloads/onequeue.pem`. SSH (port 22) is open only from the IP address `119.94.196.196`. If your home IP changes, add the new one to security group `launch-wizard-7`.

**Automatic updates (on):** the server checks GitHub `main` every minute. When there is a new commit, it installs, runs the server tests, builds, restarts the app, and rolls back if `/api/health` fails. So a `git push` to `main` is live in about 1–3 minutes, and teammates only need to refresh the page. It never runs database migrations: run new `supabase/migrations` files in Supabase *before* pushing code that needs them. One-time setup (already done): `sh deploy/aws-ec2/enable-auto-update.sh`. Watch it: `ssh -i ~/Downloads/onequeue.pem ubuntu@32.200.156.245 "sudo journalctl -u onequeue-autoupdate -n 50"`. If a commit fails, the old version stays live; push a fix to try again.

**Logs:** `ssh -i ~/Downloads/onequeue.pem ubuntu@32.200.156.245 "sudo journalctl -u onequeue -n 100"`

**After the first deploy with real keys:** in Supabase, go to **Authentication → URL Configuration**. Set **Site URL** to `https://32-200-156-245.sslip.io`, and add `https://32-200-156-245.sslip.io/reset-password` to **Redirect URLs**.

If the instance is stopped and started, its public IP changes, and with it the sslip.io address. Re-run the deploy with `SERVER_IP=<new ip>`, then update the Supabase URLs.

---

## Alternative: ECS Express Mode (paid, about $20–40/month)

Use Amazon ECS Express Mode for a new AWS account. AWS App Runner stopped accepting new customers on April 30, 2026; AWS now recommends ECS Express Mode for new containerized web services ([availability notice](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)). Express Mode provisions an ECS Fargate service, HTTPS load balancer, scaling, logging, and an application URL around the container image.

ONEQUEUE runs as one container. The image builds the Vite client, then Express serves the client and `/api` from the same HTTPS origin.

## 1. Prepare Supabase

1. In Supabase, apply `supabase/schema.sql`, then run every migration in `supabase/migrations` in filename order. The department and reporting migrations are additive.
2. Create/confirm your Supabase project URL, anon key, and service-role key. Do not put the service-role key in the Vite client or source control.
3. Add the future ECS service URL and its `/reset-password` route to the Supabase Auth redirect allow list after ECS creates the URL.
4. If using Resend, verify your sending domain and create `RESEND_API_KEY` and `NOTIFICATION_FROM` values.

## 2. Build and push the container image

Install/configure Docker and AWS CLI, sign in to the target AWS account, and choose a Region supported by ECS Express Mode. In PowerShell, replace `<region>` with your AWS Region:

```powershell
$region = "<region>"
$accountId = aws sts get-caller-identity --query Account --output text
$registry = "$accountId.dkr.ecr.$region.amazonaws.com"
aws ecr create-repository --repository-name onequeue --region $region
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $registry
docker build -t onequeue .
docker tag onequeue:latest "$registry/onequeue:latest"
docker push "$registry/onequeue:latest"
```

The Docker build uses the root npm workspaces and packages the built client with the API. `.dockerignore` excludes local `.env` files, dependency folders, and the nested `itp2` submodule.

## 3. Create an ECS Express Mode service

1. Open the Amazon ECS console and choose **Express mode**. Create a service using the ECR image URI `$registry/onequeue:latest`.
2. Set container port `8080`, health check path `/api/health`, and a suitable service name. Use the console’s IAM role setup to create/select the task execution and infrastructure roles.
3. Add runtime secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from AWS Secrets Manager. Give the task execution role permission to read only those secrets.
4. Add `RESEND_API_KEY` and `NOTIFICATION_FROM` if email should be sent. The server always accepts requests from its own URL, so `CLIENT_ORIGIN` is only needed if a client on a *different* domain (for example a custom frontend domain) calls the API.
5. Create the service and wait for it to become active. ECS provides an HTTPS application URL. Add that URL and `/reset-password` to Supabase Auth’s redirect allow list.
6. Verify `/api/health`, register/log in, create a customer queue, check Registrar/Finance/SAO separation, call/start/complete a queue, and verify realtime notifications and report screens.

Keep ECS tasks on a network path that can reach the public Supabase and Resend APIs. Express Mode’s default deployment creates the necessary load balancer and networking; if you customize the VPC/subnets, ensure outbound internet access is available to the tasks.

Official AWS guides: [ECS Express Mode overview](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html), [create the first service in the console](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-first-run.html), and [create a container image for ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html).

## Update a deployment

Build and push a new image tag to ECR, then update the ECS Express Mode service to use that tag. Apply database migrations before deploying code that depends on them. Review ECS deployment status and CloudWatch logs after the update.

## Deployment status for this workspace

The source is prepared for ECS Express Mode, but no AWS resources have been created from this environment. AWS CLI and Docker are not installed, there is no AWS account session available here, and local Supabase settings are placeholders. Apply the migrations and configure the AWS account secrets before using the deployed service.
