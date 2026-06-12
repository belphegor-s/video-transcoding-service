### Setup

- You'll need `docker` and `nodejs` (preferably v20 LTS)
- Install deps. via `npm i` in `/lambdas` and `/server`
- `.env` format -
  - _`/lambdas/.env`_
    ```env
    REDIS_USERNAME=""
    REDIS_PASSWORD=""
    REDIS_HOST=""
    DATABASE_URI=""
    S3_REGION=""
    S3_BUCKET_NAME=""
    ACCESS_KEY_ID=""
    SECRET_ACCESS_KEY=""
    SUBNET_1=""
    SUBNET_2=""
    SUBNET_3=""
    SECURITY_GROUP=""
    ECS_ARN=""
    ```
  - _`/server/.env`_
    ```env
    JWT_ACCESS_TOKEN_SECRET=""
    JWT_REFRESH_TOKEN_SECRET=""
    S3_REGION=""
    S3_BUCKET_NAME=""
    AWS_ACCESS_KEY_ID=""
    AWS_SECRET_ACCESS_KEY=""
    DATABASE_URI=""
    REDIS_USERNAME=""
    REDIS_PASSWORD=""
    REDIS_HOST=""
    PORT="9191"
    CLOUDFRONT_URL=""
    CLOUDFRONT_PUBLIC_KEY_ID=""
    CLOUDFRONT_PRIVATE_KEY="" # raw or base64 PEM; falls back to keys/private_key.pem locally
    RESEND_API_KEY=""
    CLIENT_APP_URL="http://localhost:3000" # frontend URL — drives CORS + email links
    ```
  - _`/web/.env`_ (frontend)
    ```env
    NEXT_PUBLIC_API_BASE_URL="http://localhost:9191/api/v1"
    ```

---

### Deployment

- **Frontend** (`/web`, Next.js) and **API** (`/server`, Express) deploy as two apps on Coolify,
  each built from its own `Dockerfile`. Production: web → `transcode.procd.cc`, API →
  `api.transcode.procd.cc`.
- The transcoding worker (`/transcoding-img`) runs on ECS Fargate; the trigger lives in `/lambdas`.

---

### Architecture

![architecture](/static/architecture.png)
