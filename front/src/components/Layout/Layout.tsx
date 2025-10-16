import React from 'react'
import { User } from '../../types'
import Header from '../Header'
import Footer from '../ui/Footer'

interface LayoutProps {
  children: React.ReactNode
  user?: User | null
  className?: string
}

/**
 * Layout principal da aplicação
 *
 * @example
 * ```tsx
 * <Layout user={currentUser}>
 *   <h1>Conteúdo da página</h1>
 * </Layout>
 * ```
 *
 * @param children - Conteúdo da página a ser renderizado dentro do layout
 * @param user - Dados do usuário autenticado para o Header
 * @param className - Classes CSS adicionais para customização do main
 * @returns JSX.Element com estrutura completa da aplicação
 */
const Layout: React.FC<LayoutProps> = ({ children, user, className = '' }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={user ?? null} />
      <main className={`flex-grow ${className}`}>
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

export default Layout
