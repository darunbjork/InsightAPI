# InsightAPI

## 🌟 Overview

The **InsightAPI** is a high-performance, production-ready backend built with the **MERN stack (MongoDB, Express, Node.js)**. It serves as the foundation for a modern, interactive social media platform, featuring robust authentication, post management, and dynamic user interactions like comments and polymorphic likes.

This project was developed with a strong focus on **security, scalability, and maintainability**, implementing industry best practices such as atomic counting, data denormalization, robust validation, and API documentation.

## ✨ Key Features & Architectural Highlights

| Feature Area | Implementation Detail | Best Practice Applied |
| :--- | :--- | :--- |
| **Authentication** | Secure **JWT** strategy using **`HttpOnly` Cookies** for CSRF mitigation. Full lifecycle support (register, login, refresh, logout). | Secure Token Strategy |
| **Data Integrity** | **Joi** schema validation for all incoming requests (body, params, query) at the API boundary. | Input Validation & Data Integrity |
| **Interactions** | **Comments** and **Polymorphic Likes** on both posts and comments using a single `Like` model. | Code Reuse & Polymorphism |
| **Scalability** | **Atomic Counting (`$inc`)** for `commentCount` and `likeCount` to prevent race conditions during concurrent updates. **Offset Pagination** for efficient feed retrieval. | Atomic Operations & Denormalization |
| **File Storage** | **Cloudflare R2** integration for production-grade, scalable object storage, using an S3-compatible API. | Cloud Storage Abstraction |
| **Security** | Comprehensive error handling, **Rate Limiting** (DoS mitigation), and strict security headers via **Helmet** (HSTS, etc.). | Security-by-Design |
| **Observability** | Centralized **Winston Logger** with request tracing (unique request ID per transaction). | Observability & Auditing |
| **Developer Experience**| Interactive API documentation using **Swagger UI / OpenAPI 3.0** accessible at `/api-docs`. | Documentation & DX |

## 🛠️ Technology Stack

  * **Runtime:** Node.js
  * **Framework:** Express.js
  * **Database:** MongoDB / Mongoose ODM
  * **Testing:** Jest & Supertest, utilizing `mongodb-memory-server` for integration tests.
  * **Security:** JSON Web Tokens (JWT), Helmet, `HttpOnly` Cookies, Rate Limiter.
  * **Utilities:** Joi (Validation), Multer (File Uploads), Winston (Logging), **AWS SDK** (for R2 compatibility).

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have **Docker** and **Docker Compose** installed.

### Installation & Run

1.  **Clone the Repository:**

    ```bash
    git clone [YOUR_REPO_URL] insightapi
    cd insightapi
    ```

2.  **Start the Services (API and MongoDB):**
    The `docker-compose.yml` file handles the setup of the application container and the persistent MongoDB container.

    ```bash
    docker-compose up --build
    ```

    This will build the Docker image and start the application.

3.  **Access the API:**

      * **Application is running on:** `http://localhost:5001`
      * **API Endpoints are at:** `http://localhost:5001/api/v1`
      * **Interactive Documentation (Swagger UI):** `http://localhost:5001/api-docs`

-----

## 💻 Local Development

If you prefer to run the application directly on your local machine without Docker:

1.  **Install Dependencies:**

    ```bash
    npm install
    ```

2.  **Environment Setup:**
    Create a `.env` file in the project root. Make sure to include the R2 configuration variables as outlined in the Deployment Notes section.

3.  **Run in Development Mode:**

    ```bash
    npm run dev
    ```

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
2.  **File Storage:** The application is configured to use **Cloudflare R2**. You must set the following environment variables in your production environment (e.g., Render, Heroku):
    *   `R2_ACCESS_KEY_ID`
    *   `R2_SECRET_ACCESS_KEY`
    *   `R2_ACCOUNT_ID`
    *   `R2_BUCKET_NAME`
    *   `R2_PUBLIC_URL`
3.  **Rate Limiter:** Replace the in-memory rate limiter in `src/middleware/rate-limiter.js` with a scalable solution like **Redis** for coordination across multiple instances.
4.  **HSTS:** Ensure HTTPS is enforced by your load balancer or hosting provider for HSTS to be effective.

-----


