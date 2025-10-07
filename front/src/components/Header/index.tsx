import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "Planos", href: "/", current: location.pathname === "/" },
    {
      name: "Histórico",
      href: "/history",
      current: location.pathname === "/history",
    },
    {
      name: "Perfil",
      href: "/profile",
      current: location.pathname === "/profile",
    },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-20">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold text-orange-500">
              <Link to="/">Planos Corp</Link>
            </div>
            <nav className="hidden md:flex space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    item.current
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-orange-600 hover:bg-orange-50"
            >
              <span className="sr-only">Abrir menu</span>
              <div className="space-y-1">
                <span className="block w-6 h-0.5 bg-current"></span>
                <span className="block w-6 h-0.5 bg-current"></span>
                <span className="block w-6 h-0.5 bg-current"></span>
              </div>
            </button>
            {user && (
              <>
                <span className="text-gray-700 hidden md:block">
                  Olá, {user.name}
                </span>
                <button
                  onClick={logout}
                  className="hidden md:block px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
        <div className={`md:hidden bg-white shadow-lg border-t border-gray-200 transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <nav className="px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  item.current
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 text-base font-medium">
                  Olá, {user.name}
                </span>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
