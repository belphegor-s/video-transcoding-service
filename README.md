### Setup

-   You'll need `docker` and `nodejs` (preferably v16 LTS)
-   Install deps. via `npm i` in `/lambdas` and `/server`
-   `.env` format -
    -   _`/lambdas/.env`_
        ```env
        REDIS_HOST=""
        REDIS_PASSWORD=""
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
    -   _`/server/.env`_
        ```env
        JWT_ACCESS_TOKEN_SECRET=""
        JWT_REFRESH_TOKEN_SECRET=""
        S3_REGION=""
        S3_BUCKET_NAME=""
        AWS_ACCESS_KEY_ID=""
        AWS_SECRET_ACCESS_KEY=""
        DATABASE_URI=""
        ```

---

### Architecture

![architecture](/static/architecture.png)


[<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://app.getpostman.com/run-collection/23374137-42f374b8-62cc-4681-b459-16b1a71ca592?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D23374137-42f374b8-62cc-4681-b459-16b1a71ca592%26entityType%3Dcollection%26workspaceId%3D0b26b058-e6f1-48f1-a315-a45408b531f7)
