# 📸 Spotlight - Full Stack Social Media Platform

Spotlight is a modern, responsive full-stack social media web application designed to clone the core user experience of Instagram. Built utilizing the highly efficient MERN stack architecture, it features real-time interactions driven by Socket.io, robust image processing pipelines, secure token-based authentication with cookies, and cutting-edge styling using the latest Tailwind CSS v4.

---

## 🚀 Core Features

### 👥 Social Architecture & Interaction
- **Dynamic Content Feed:** Infinite scrolling feed populated dynamically with photo posts from followed users.
- **Advanced Post Workflows:** Seamless multi-media publishing backed by an automated media management system.
- **Interactive Engagement:** Real-time liking mechanics and structured commenting systems on user posts.
- **Follow & Discover Engine:** Follow/unfollow mechanics that adjust content feeds, accompanied by customizable profile dashboards tracking followers, following lists, and user posts.

### ⚡ Real-Time & Advanced Features
- **Instant Direct Messaging:** Fully functional real-time private chat functionality powered by an active WebSockets client framework.
- **Complex Aggregation Analytics:** Advanced data filtering and feed optimization built using complex MongoDB aggregate pipelines (utilizing `mongoose-aggregate-paginate-v2`).
- **Media Optimization:** Multi-part form uploads handled seamlessly via an internal media storage cluster.

### 🛡️ System Security & Performance
- **Secure Authentication:** Password hashing using multi-round salt algorithms, coupled with secure, stateless session tracking over HTTPS.
- **Cookie Security:** Refresh and access token paradigms stored in HTTP-only, secure, same-site cross-origin cookies to fully eliminate XSS/CSRF vulnerabilities.
- **Cross-Origin Configuration:** Production-secured CORS policies linking authenticated frontend routing rules directly to state APIs.

---

## 🛠️ Tech Stack Architecture

### Frontend
- **Framework:** React 19 (Concurrent Rendering Engine)
- **Build Tooling:** Vite 8 (Ultra-fast Hot Module Replacement)
- **State Management:** Redux Toolkit (`react-redux`)
- **Client Routing:** React Router v7 / React Router DOM
- **Styling:** Tailwind CSS v4 (Powered by `@tailwindcss/vite` compiler)
- **Icons:** Lucide React Icon Pack
- **Network Client:** Axios (Interceptors configured for seamless cookie handshake)
- **Real-time Client:** Socket.io-client

### Backend
- **Runtime:** Node.js (ES Modules Configuration — `type: "module"`)
- **Server Framework:** Express 5 (Latest high-performance async routing wrapper)
- **Database Model:** MongoDB Atlas via Mongoose 9 ODM
- **Real-time Server:** Socket.io Engine
- **Media Storage:** Cloudinary API integration
- **File Upload Middleware:** Multer Engine
- **Session Utilities:** Cookie-Parser, Bcrypt, JsonWebToken (JWT)

---

## 📂 System Project Structure

```text
Spotlight/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Authentication, Post, Like, Comment, Chat handlers
│   │   ├── models/         # Mongoose Schemas (User, Post, Message, Follow)
│   │   ├── middlewares/    # Auth verification guards, Multer file structures
│   │   ├── db/             # MongoDB Atlas connection lifecycle
│   │   └── index.js        # Express app initializer & WebSockets wrapper
│   ├── .env                # Server configurations
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/     # Navbar, PostCard, ChatBox, Feed, Sidebar
    │   ├── pages/          # Login, Register, Home, Profile, Messages
    │   ├── store/          # Redux slices for global Auth, Post, and Chat states
    │   ├── context/        # Socket connection states
    │   └── main.jsx        # App entry point with Tailwind v4 setup
    ├── vite.config.js      # Compiler plugins
    └── package.json
