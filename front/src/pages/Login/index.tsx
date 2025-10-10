import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);

    // Simulação de login - cria usuário demo e salva no contexto
    // TODO deve propagar em todas as paginas o usuário logado, evitando contantes com id
    const demoUser = {
      id: 1,
      name: 'Usuário da Silva',
      email: 'usuario@silva.com'
    };

    login(demoUser);

    // Navegação imediata após login
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value="usuario@silva.com"
              readOnly
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value="password123"
              readOnly
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 bg-blue-50 p-4 rounded">
          <h3 className="font-semibold mb-2 text-blue-800">Ambiente de Demonstração</h3>
          <p className="mb-1"><strong>Nome:</strong> Usuário da Silva</p>
          <p className="mb-1"><strong>Email:</strong> usuario@silva.com</p>
          <p className="mb-1"><strong>Senha:</strong> password123</p>
          <p className="text-xs mt-2 text-blue-600">Clique em "Entrar" para acessar o sistema e testar todas as funcionalidades.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;