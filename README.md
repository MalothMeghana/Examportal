# Full Exam Portal

A comprehensive full-stack web application for managing online examinations, featuring role-based access control for superadmins, admins, invigilators, and users. The system supports exam creation, user management, real-time analytics, chat functionality, and more.

## Features

### User Roles and Capabilities

- **Super Admin**: Oversees multiple clients, manages subscriptions, and accesses global analytics.
- **Admin**: Manages exams, users, study materials, and generates reports.
- **Invigilator**: Monitors student submissions, updates grades, and views analytics.
- **User/Student**: Takes exams, accesses study materials, views achievements, and interacts via chat.

### Key Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control.
- **Exam Management**: Create, manage, and conduct online exams.
- **Real-time Analytics**: Dashboard with live data updates for performance tracking.
- **Chat System**: Real-time messaging between users and admins.
- **File Uploads**: Support for uploading study materials and chat files.
- **Notifications**: Real-time notifications for users.
- **Reports & Analytics**: Comprehensive reporting for admins and superadmins.
- **Responsive UI**: Modern, responsive interface built with React and Tailwind CSS.

## Tech Stack

### Backend
- **Node.js** with **Express.js** for server-side logic
- **PostgreSQL** for database management
- **Redis** for caching and session management
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email services

### Frontend
- **React** with **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Firebase** for hosting and additional services
- **Socket.io-client** for real-time features
- **Axios** for API calls
- **React Router** for navigation
- **Recharts** for data visualization
- **React Hot Toast** for notifications

### Deployment
- **Google Cloud Build** (via cloudbuild.yaml)
- **Docker** for containerization

## Project Structure

```
fullexamportal/
├── BackEnd_ExamPortal/
│   ├── server/
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── authentication/
│   │   ├── common_files/
│   │   ├── config/
│   │   ├── roles/
│   │   │   ├── admin/
│   │   │   ├── invigilator/
│   │   │   ├── superadmin/
│   │   │   └── users/
│   │   ├── routes/
│   │   ├── uploads/
│   │   └── utils/
│   ├── cloudbuild.yaml
│   └── README.md
└── Frontend_ExamPortal/
    ├── client/
    │   ├── index.html
    │   ├── package.json
    │   ├── src/
    │   │   ├── components/
    │   │   ├── roles/
    │   │   ├── common_files/
    │   │   ├── hooks/
    │   │   └── services/
    │   ├── vite.config.js
    │   ├── tailwind.config.js
    │   └── eslint.config.js
    ├── firebase.json
    └── README.md
```

## Installation and Setup

### Prerequisites
- Node.js (v22.12.0 or higher)
- PostgreSQL
- Redis
- Docker (optional, for containerization)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd BackEnd_ExamPortal/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `server` directory with the following variables:
   ```
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/examportal
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_jwt_secret
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   ```

4. Start the server:
   ```bash
   npm run dev  # For development with nodemon
   # or
   npm start    # For production
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd Frontend_ExamPortal/client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `client` directory with necessary configurations (e.g., API base URL, Firebase config).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

### Database Setup

1. Ensure PostgreSQL is running.
2. Create a database named `examportal`.
3. Run any necessary migrations or seed scripts (if provided in the codebase).

### Redis Setup

1. Ensure Redis is running on the default port (6379).

## Usage

1. Start the backend server.
2. Start the frontend development server.
3. Access the application at `http://localhost:5173` (default Vite port).
4. Register or log in with appropriate credentials based on your role.

## API Documentation

The backend provides RESTful APIs for all functionalities. Key endpoints include:

- Authentication: `/api/auth/login`, `/api/auth/register`
- Admin: `/api/admin/*`
- Invigilator: `/api/invigilator/*`
- Super Admin: `/api/superadmin/*`
- User: `/api/user/*`

For detailed API documentation, refer to the route files in `BackEnd_ExamPortal/server/routes/`.

## Deployment

### Using Docker

1. Build the Docker image for the backend:
   ```bash
   cd BackEnd_ExamPortal/server
   docker build -t examportal-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 examportal-backend
   ```

### Using Google Cloud Build

The project includes a `cloudbuild.yaml` file for automated deployment on Google Cloud Platform.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request.

