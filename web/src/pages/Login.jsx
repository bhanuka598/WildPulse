import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('manager@wildlife.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded shadow-md w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center">🛡️ Wildlife Ops</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          className="border p-2 w-full rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 w-full rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-green-600 text-white w-full p-2 rounded hover:bg-green-700">
          Sign In
        </button>
      </form>
    </div>
  );
}