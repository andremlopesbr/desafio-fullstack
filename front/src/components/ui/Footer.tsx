import React from 'react'

/**
 * Footer da aplicação com informações de copyright
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 *
 * @returns JSX.Element com informações de copyright e ano atual
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative w-full bg-gray-800 text-white text-center py-4 mt-auto">
      <p>&copy; {currentYear} Desafio Fullstack. Todos os direitos reservados.</p>
    </footer>
  )
}

export default Footer
