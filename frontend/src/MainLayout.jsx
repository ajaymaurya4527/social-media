import React from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { Outlet, useLocation } from "react-router";
import ShopContextProvider from './context/ShopContext';

function MainLayout() {
  const location = useLocation();
  
  // Define paths where Header/Footer should NOT show
  const authPaths = ["/login", "/register"];
  const isAuthPage = authPaths.includes(location.pathname);

  return (
    <>
    <ShopContextProvider>
      {!isAuthPage && <Header />}
      <main className={isAuthPage ? "" : "pt-16"}>
        <Outlet />
      </main>
      {!isAuthPage && <Footer />}
      </ShopContextProvider>
    </>
  )
}

export default MainLayout