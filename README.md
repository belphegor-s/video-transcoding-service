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
    ```

---

### Architecture

![architecture](/static/architecture.png)
