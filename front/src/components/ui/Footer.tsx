import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-gray-800 text-white text-center py-4 z-50">
      <p>&copy; {currentYear} Desafio Fullstack. Todos os direitos reservados.</p>
    </footer>
  );
};

export default Footer;