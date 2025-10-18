# InsightAPI

## 🌟 Overview

The **InsightAPI** is a high-performance, production-ready backend built with the **MERN stack (MongoDB, Express, Node.js)**. It serves as the foundation for a modern, interactive social media platform, featuring robust authentication, post management, and dynamic user interactions like comments and polymorphic likes.

This project was developed with a strong focus on **security, scalability, and maintainability**, implementing industry best practices such as atomic counting, data denormalization, robust validation, and API documentation.

## 🚀 Live Deployment (Render)

The API is deployed on Render and is publicly accessible at the following URLs:

*   **Base URL:** `https://insight-api-production.onrender.com`
*   **Health Check:** `https://insight-api-production.onrender.com/health`
*   **API Endpoints:** `https://insight-api-production.onrender.com/api/v1`

## ✨ Key Features & Architectural Highlights

| Feature Area | Implementation Detail | Best Practice Applied |
| :--- | :--- | :--- |
| **Authentication** | Secure **JWT** strategy using **`HttpOnly` Cookies** for CSRF mitigation. Full lifecycle support (register, login, refresh, logout). | Secure Token Strategy |
| **Data Integrity** | **Joi** schema validation for all incoming requests (body, params, query) at the API boundary. | Input Validation & Data Integrity |
| **Interactions** | **Comments** and **Polymorphic Likes** on both posts and comments using a single `Like` model. | Code Reuse & Polymorphism |
| **Scalability** | **Atomic Counting (`$inc`)** for `commentCount` and `likeCount` to prevent race conditions during concurrent updates. **Offset Pagination** for efficient feed retrieval. | Atomic Operations & Denormalization |
| **File Storage** | Placeholder for local file storage, easily swappable with a cloud provider like Cloudflare R2 or AWS S3. | Cloud Storage Abstraction |
| **Security** | Comprehensive error handling, **Rate Limiting** (DoS mitigation), and strict security headers via **Helmet** (HSTS, etc.). | Security-by-Design |
| **Observability** | Centralized **Winston Logger** with request tracing (unique request ID per transaction). | Observability & Auditing |
| **Developer Experience**| Interactive API documentation using **Swagger UI / OpenAPI 3.0** accessible at `/api-docs`. | Documentation & DX |

## 🛠️ Technology Stack

  * **Runtime:** Node.js
  * **Framework:** Express.js
  * **Database:** MongoDB / Mongoose ODM
  * **Testing:** Jest & Supertest, utilizing `mongodb-memory-server` for integration tests.
  * **Security:** JSON Web Tokens (JWT), Helmet, `HttpOnly` Cookies, Rate Limiter.
  * **Utilities:** Joi (Validation), Multer (File Uploads), Winston (Logging), AWS SDK.

## 💻 Local Development Setup

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

You need to have **Docker** and **Docker Compose** installed.

### Installation & Run

1.  **Clone the Repository:**

    ```bash
    git clone [YOUR_REPO_URL] insightapi
    cd insightapi
    ```

2.  **Start the Services (API and MongoDB):**

    ```bash
    docker-compose up --build
    ```

3.  **Access the Local API:**

      * **Application is running on:** `http://localhost:5001`
      * **API Endpoints are at:** `http://localhost:5001/api/v1`
      * **Interactive Documentation (Swagger UI):** `http://localhost:5001/api-docs`

-----

## ✅ Testing

The project uses **Jest** for integration testing, connected to a dedicated in-memory MongoDB instance for isolation and speed.

To run the full test suite:

```bash
npm test
```

## 📄 API Documentation

All available routes, required parameters, and response schemas are documented using the **OpenAPI 3.0 Specification**.

Access the interactive documentation at:
**`http://localhost:5001/api-docs`**

## 💡 Deployment Notes (Production Readiness)

Before moving this API to production, please ensure the following critical services are configured:

1.  **Database:** Replace the development MongoDB with a managed service (e.g., **MongoDB Atlas**).
2.  **File Storage:** The application currently uses the local filesystem for file uploads, which is ephemeral on hosts like Render. For production, you must switch to a cloud provider. The app is pre-configured to support **Cloudflare R2** by setting the following environment variables:
    *   `R2_ACCESS_KEY_ID`
    *   `R2_SECRET_ACCESS_KEY`
    *   `R2_ACCOUNT_ID`
    *   `R2_BUCKET_NAME`
    *   `R2_PUBLIC_URL`
3.  **Rate Limiter:** Replace the in-memory rate limiter with a scalable solution like **Redis** for coordination across multiple instances.
4.  **HSTS:** Ensure HTTPS is enforced by your load balancer or hosting provider for HSTS to be effective.

-----