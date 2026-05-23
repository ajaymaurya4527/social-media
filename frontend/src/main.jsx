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
import UserProfilePage from './pages/UserProfilePage.jsx';
import PostDetail from './pages/PostDetail.jsx'; // <-- 1. IMPORT YOUR NEW DETAIL PAGE
import Messages from './pages/MessagePage.jsx';
import HomeFeed from './pages/HomePage.jsx';
import ReelsPage from './pages/ReelsPage.jsx';
import NotificationPage from './pages/NotificationPage.jsx';

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
            <HomeFeed />
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
      {
        path: "user/:username", 
        element: (
          <AuthLayout authentication={true}>
            <UserProfilePage />
          </AuthLayout>
        )
      },
      // --- 2. ADD THE NEW DYNAMIC POST ROUTE HERE ---
      {
        path: "post/:id",
        element: (
          <AuthLayout authentication={true}>
            <PostDetail />
          </AuthLayout>
        )
      },
      {
        path: "reels",
        element: (
          <AuthLayout authentication={true}>
            <ReelsPage />
          </AuthLayout>
        )
      },
      {
        path: "messages",
        element: (
          <AuthLayout authentication={true}>
            <Messages />
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
        path: "notifications",
        element: (
          <AuthLayout authentication={true}>
            <NotificationPage />
          </AuthLayout>
        )
      },
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