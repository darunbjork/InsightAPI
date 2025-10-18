# Postman Collection for InsightAPI

This file contains a collection of cURL commands for the InsightAPI endpoints. You can import this file into Postman.

**Note:** Replace placeholders like `<YOUR_TOKEN>`, `<POST_ID>`, `<COMMENT_ID>`, etc., with actual values.

---

## Authentication

### Register a new user

```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
-H "Content-Type: application/json" \
-d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
}'
```

### Login a user

```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
-H "Content-Type: application/json" \
-d '{
    "email": "test@example.com",
    "password": "password123"
}'
```

### Refresh access token

```bash
curl -X GET http://localhost:5001/api/v1/auth/refresh \
-H "Cookie: refreshToken=<YOUR_REFRESH_TOKEN>"
```

### Logout a user

```bash
curl -X POST http://localhost:5001/api/v1/auth/logout \
-H "Cookie: refreshToken=<YOUR_REFRESH_TOKEN>"
```

### Update user profile

```bash
curl -X PUT http://localhost:5001/api/v1/auth/profile \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "username": "newusername"
}'
```

### Update user avatar

```bash
curl -X PUT http://localhost:5001/api/v1/auth/avatar \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-F "avatar=@/path/to/your/image.jpg"
```

---

## Posts

### Get all posts

```bash
curl -X GET http://localhost:5001/api/v1/posts
```

### Create a new post

```bash
curl -X POST http://localhost:5001/api/v1/posts \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "title": "My First Post",
    "content": "This is the content of my first post."
}'
```

### Get a single post

```bash
curl -X GET http://localhost:5001/api/v1/posts/<POST_ID>
```

### Update a post

```bash
curl -X PUT http://localhost:5001/api/v1/posts/<POST_ID> \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "title": "Updated Title",
    "content": "Updated content."
}'
```

### Delete a post

```bash
curl -X DELETE http://localhost:5001/api/v1/posts/<POST_ID> \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>"
```

---

## Comments

### Get all comments for a post

```bash
curl -X GET http://localhost:5001/api/v1/comments/post/<POST_ID>
```

### Create a new comment on a post

```bash
curl -X POST http://localhost:5001/api/v1/comments/post/<POST_ID> \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "content": "This is a comment on the post."
}'
```

### Update a comment

```bash
curl -X PUT http://localhost:5001/api/v1/comments/<COMMENT_ID> \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "content": "Updated comment content."
}'
```

### Delete a comment

```bash
curl -X DELETE http://localhost:5001/api/v1/comments/<COMMENT_ID> \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>"
```

---

## Likes

### Like a resource (Post or Comment)

```bash
curl -X POST http://localhost:5001/api/v1/likes \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "resourceId": "<POST_ID_OR_COMMENT_ID>",
    "onModel": "Post"
}'
```

*Replace "onModel": "Post" with "onModel": "Comment" to like a comment.*

### Unlike a resource (Post or Comment)

```bash
curl -X DELETE http://localhost:5001/api/v1/likes \
-H "Content-Type: application/json" \
-H "Cookie: accessToken=<YOUR_ACCESS_TOKEN>" \
-d '{
    "resourceId": "<POST_ID_OR_COMMENT_ID>",
    "onModel": "Post"
}'
```

*Replace "onModel": "Post" with "onModel": "Comment" to unlike a comment.*