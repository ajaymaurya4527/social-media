import React from 'react';
import { Home, Search, PlusSquare, Heart, Send } from 'lucide-react'; // Using lucide-react for icons

const Header = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-300 z-50 px-4 flex items-center justify-between">
      {/* Logo */}
      <div className="text-2xl font-bold tracking-tighter cursor-pointer font-serif">
        Instagram
      </div>

      {/* Search Bar - Hidden on small mobile */}
      <div className="hidden md:block">
        <input 
          type="text" 
          placeholder="Search" 
          className="bg-gray-100 border-none rounded-md py-1 px-4 w-64 focus:ring-0"
        />
      </div>

      {/* Icons */}
      <div className="flex items-center space-x-5">
        <Home className="cursor-pointer hover:scale-110 transition-transform hidden sm:block" />
        <Send className="cursor-pointer hover:scale-110 transition-transform" />
        <PlusSquare className="cursor-pointer hover:scale-110 transition-transform" />
        <Heart className="cursor-pointer hover:scale-110 transition-transform" />
        {/* Profile Avatar - Uses the avatar URL from your backend req.user */}
        <div className="w-7 h-7 rounded-full bg-gray-300 border border-gray-200 overflow-hidden cursor-pointer">
          <img src="https://via.placeholder.com/150" alt="profile" />
        </div>
      </div>
    </nav>
  );
};

export default Header;