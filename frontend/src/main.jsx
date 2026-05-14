import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from "react-router/dom";
import { createBrowserRouter, } from 'react-router'; // Combined imports
import './index.css';
import MainLayout from './MainLayout.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true, // This makes it the default view for "/"
        element: <div className="pt-24 text-center text-5xl"><h1>Welcome to Vibe</h1></div>
      },
    ]
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);