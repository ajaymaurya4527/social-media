import React, { useContext } from 'react';
import { NavLink } from "react-router";
import { Home, Search, Film, Send } from 'lucide-react';
import { ShopContext } from '../context/ShopContext'; // <-- Import context

const Footer = () => {
  const { userAvatar } = useContext(ShopContext); // <-- Grab your real user avatar URL

  // Common styles for the NavLinks
  const navLinkClasses = ({ isActive }) => 
    `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
      isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
    }`;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 pb-safe">
      <nav className="flex justify-around items-center h-full max-w-md mx-auto">
        
        {/* 1. Home */}
        <NavLink to="/" className={navLinkClasses}>
          <Home size={26} strokeWidth={2.5} />
        </NavLink>

        {/* 2. Reels */}
        <NavLink to="/reels" className={navLinkClasses}>
          <Film size={26} strokeWidth={2.5} />
        </NavLink>

        {/* 3. Messages */}
        <NavLink to="/messages" className={navLinkClasses}>
          <Send size={26} strokeWidth={2.5} className="-rotate-12 mb-0.5" />
        </NavLink>

        {/* 4. Search */}
        <NavLink to="/search" className={navLinkClasses}>
          <Search size={26} strokeWidth={2.5} />
        </NavLink>

        {/* 5. Profile */}
        <NavLink to="/profile" className={navLinkClasses}>
          {({ isActive }) => (
            <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
              isActive ? 'border-black' : 'border-transparent'
            }`}>
              <img 
                src={userAvatar || "https://via.placeholder.com/150"}  // <-- Swapped with dynamic avatar URL (w/ fallback)
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </NavLink>

      </nav>
    </footer>
  );
};

export default Footer;