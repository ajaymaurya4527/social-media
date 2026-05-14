import React from 'react';
import { Home, Search, Film, ShoppingBag } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-12 bg-white border-t border-gray-300 z-50 md:hidden">
      <div className="flex justify-around items-center h-full">
        {/* Home */}
        <button className="p-2">
          <Home size={24} />
        </button>

        {/* Search */}
        <button className="p-2">
          <Search size={24} />
        </button>

        {/* Reels - Connects to your backend 'videos' collection logic */}
        <button className="p-2">
          <Film size={24} />
        </button>

        {/* Activity/Market */}
        <button className="p-2">
          <ShoppingBag size={24} />
        </button>

        {/* Profile Link */}
        <button className="p-2">
          <div className="w-6 h-6 rounded-full border border-black overflow-hidden">
             <img src="https://via.placeholder.com/150" alt="avatar" />
          </div>
        </button>
      </div>
    </footer>
  );
};

export default Footer;