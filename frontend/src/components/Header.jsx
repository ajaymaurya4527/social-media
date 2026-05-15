import React from 'react';
import { NavLink } from 'react-router';
import { Heart, PlusSquare, Send } from 'lucide-react';

const Header = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 px-4">
      <div className="flex items-center justify-between h-full max-w-5xl mx-auto">
        
        {/* Left: Create Post/Messages (IG Mobile Style) */}
        <div className="flex items-center space-x-4 flex-1">
           <NavLink to="/create" className="hover:scale-105 transition-transform">
            <PlusSquare size={24} />
          </NavLink>
        </div>

        {/* Middle: Brand Name */}
        <div className="flex justify-center flex-1">
          <NavLink to="/" className="text-2xl font-bold tracking-tighter font-serif italic">
            Spotlight
          </NavLink>
        </div>

        {/* Right: Notifications & Messages */}
        <div className="flex items-center justify-end space-x-4 flex-1">
          <NavLink to="/notifications" className="hover:scale-105 transition-transform">
            <Heart size={24} />
          </NavLink>
          
        </div>

      </div>
    </nav>
  );
};

export default Header;