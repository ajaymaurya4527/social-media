import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './index.css';

// Layouts
import MainLayout from './MainLayout.jsx';
import AuthLayout from './auth/AuthLayout.jsx'; 

// Pages
import ProfilePage from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/RegisterUser.jsx';
import CreatePost from './pages/CreatePost.jsx';
import SearchPage from './pages/SearchPage.jsx';
import UserProfilePage from './pages/UserProfilePage.jsx'; // <-- 1. IMPORT YOUR NEW PAGE HERE

// Placeholder for other routes
const Placeholder = ({ title }) => (
  <div className="pt-24 text-center">
    <h1 className="text-4xl font-bold text-zinc-800">{title}</h1>
    <p className="text-zinc-500 mt-2">This page is under construction.</p>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <AuthLayout authentication={true}>
            <div className="pt-24 text-center text-5xl font-bold">
              <h1>Welcome to Vibe</h1>
            </div>
          </AuthLayout>
        )
      },
      {
        path: "search",
        element: (
          <AuthLayout authentication={true}>
            <SearchPage />
          </AuthLayout>
        )
      },
      // --- 2. ADD THE DYNAMIC USER PROFILE ROUTE BELOW ---
      {
        path: "user/:username", 
        element: (
          <AuthLayout authentication={true}>
            <UserProfilePage />
          </AuthLayout>
        )
      },
      {
        path: "reels",
        element: (
          <AuthLayout authentication={true}>
            <Placeholder title="Reels" />
          </AuthLayout>
        )
      },
      {
        path: "messages",
        element: (
          <AuthLayout authentication={true}>
            <Placeholder title="Messages" />
          </AuthLayout>
        )
      },
      {
        path: "profile",
        element: (
          <AuthLayout authentication={true}>
            <ProfilePage />
          </AuthLayout>
        )
      },
      {
        path: "create",
        element: (
          <AuthLayout authentication={true}>
            <CreatePost />
          </AuthLayout>
        )
      },
      {
        path: "shop",
        element: (
          <AuthLayout authentication={true}>
            <Placeholder title="shop" />
          </AuthLayout>
        )
      },
      // AUTH ROUTES (authentication={false} means only logged-out users can see these)
      {
        path: "login",
        element: (
          <AuthLayout authentication={false}>
            <Login />
          </AuthLayout>
        )
      },
      {
        path: "register",
        element: (
          <AuthLayout authentication={false}>
            <Register />
          </AuthLayout>
        )
      }
    ]
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);