import React from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Outlet, useLocation } from "react-router";
import ShopContextProvider from './context/ShopContext';
import { Toaster } from 'react-hot-toast';

function MainLayout() {

  const location = useLocation();

  // AUTH PAGES
  const authPaths = [
    "/login",
    "/register"
  ];

  const isAuthPage =
    authPaths.includes(
      location.pathname
    );

  // REELS PAGE
  const isReelsPage =
    location.pathname === "/reels";

  // POST DETAIL PAGE
  const isPostDetailPage =
    location.pathname.startsWith("/post/");

  return (
    <>
      <ShopContextProvider>

        {/* TOASTER */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            style: {
              fontSize: '14px',
              borderRadius: '8px',
            },
          }}
        />

        {/* HEADER */}
        {!isAuthPage &&
          !isReelsPage && (
            <Header />
          )}

        {/* MAIN CONTENT */}
        <main
          className={
            isAuthPage || isReelsPage
              ? ""
              : "pt-16"
          }
        >
          <Outlet />
        </main>

        {/* FOOTER */}
        {!isAuthPage &&
          !isReelsPage &&
          !isPostDetailPage && (
            <Footer />
          )}

      </ShopContextProvider>
    </>
  );
}

export default MainLayout;