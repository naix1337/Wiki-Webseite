# 🚀 Full-Stack Web Application

This project is a full-stack web application designed to provide a streamlined user experience for managing and interacting with various types of content. It features a dynamic frontend built with JavaScript, HTML, and CSS, communicating with a robust backend powered by Node.js and Express.js. The application supports user authentication, role-based access control, and data persistence using an SQLite database. Core features include document editing, markdown rendering, and secure API communication.

## ✨ Key Features

*   **User Authentication:** Securely manages user registration, login, and logout using JWTs and cookies.
*   **Role-Based Access Control:** Implements different levels of access based on user roles (e.g., admin, user).
*   **Dynamic UI Rendering:** Renders tabs, sidebars, and content dynamically based on application state and data fetched from the backend.
*   **Markdown Rendering:** Converts Markdown content to HTML for display, enhancing content creation and readability.
*   **API Communication:** Provides a generic function for making API calls to the backend, handling errors, and managing data flow.
*   **Document Editing:** Enables users to create, edit, and save documents with real-time updates.
*   **Data Validation:** Uses Zod schemas to validate incoming data, ensuring data integrity.
*   **XSS Prevention:** Sanitizes HTML content using DOMPurify to prevent cross-site scripting attacks.
*   **Rate Limiting:** Protects API endpoints from abuse by limiting the number of requests from a single IP address.

## 🛠️ Tech Stack

*   **Frontend:**
    *   HTML
    *   CSS
    *   JavaScript (`app.js`)
    *   `marked.min.js` (Markdown parsing)
    *   `DOMPurify.min.js` (HTML sanitization)
*   **Backend:**
    *   Node.js
    *   Express.js
*   **Database:**
    *   SQLite (`sqlite3`)
*   **Authentication:**
    *   JSON Web Tokens (JWT)
    *   `bcryptjs` (Password hashing)
    *   `cookie-parser`
*   **Middleware:**
    *   `cors` (Cross-Origin Resource Sharing)
    *   `helmet` (Security headers)
    *   `morgan` (HTTP request logging)
    *   `express-rate-limit` (Rate limiting)
*   **Utilities:**
    *   `dotenv` (Environment variable loading)
    *   `path` (File path manipulation)
    *   `zod` (Data validation)
*   **Development Dependencies:**
    *   `http-server` (Static file server)
    *   `json-server` (Mock REST API server)

## 📦 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (v16 or higher)
*   npm (or yarn)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```

2.  **Install backend dependencies:**

    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies (if applicable, or serve using http-server):**

    ```bash
    cd ..
    # No npm project in root, so skip npm install
    ```

4.  **Create a `.env` file in the `backend` directory:**

    Add the necessary environment variables, such as:

    ```
    JWT_SECRET=your_secret_key
    CORS_ORIGIN=http://localhost:3000 # or your frontend URL
    PORT=3000
    ```

### Running Locally

1.  **Start the backend server:**

    ```bash
    cd backend
    npm run dev # or npm start
    ```

    This will start the backend server, typically on `http://localhost:3000`.

2.  **Serve the frontend:**

    Navigate back to the project root and use `http-server` (or your preferred method) to serve the frontend files:

    ```bash
    cd ..
    npx http-server -p 8080
    ```

    This will serve the frontend application, typically on `http://localhost:8080`.

3.  **Access the application:**

    Open your web browser and navigate to the frontend URL (e.g., `http://localhost:8080`).

## 💻 Usage

Once the application is running, you can:

*   Register a new user account.
*   Log in with your credentials.
*   Navigate through different sections using the tabs and sidebar.
*   Create, edit, and save documents.
*   View content rendered from Markdown.
*   Utilize the API endpoints for data management.

## 📂 Project Structure

```
├── backend/
│   ├── server.js       # Main backend server file
│   ├── db.js           # Database initialization and utility functions
│   ├── package.json    # Backend dependencies and scripts
│   └── ...
├── index.html        # Main HTML file for the frontend
├── app.js            # Main JavaScript file for the frontend
├── style.css         # CSS stylesheet for the frontend
├── package.json      # Frontend dependencies (if any)
├── .env              # Environment variables
├── .gitignore        # Specifies intentionally untracked files that Git should ignore
└── README.md         # This file
```

## 📸 Screenshots

(Add screenshots of the application here to showcase its UI and functionality.)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with descriptive messages.
4.  Submit a pull request.

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 📬 Contact

If you have any questions or suggestions, feel free to contact me at [your_email@example.com](mailto:your_email@example.com).

## 💖 Thanks

Thank you for checking out this project! I hope it's helpful and that you find it interesting.

This is written by [readme.ai](https://readme-generator-phi.vercel.app/) - Generate beautiful README files effortlessly.
