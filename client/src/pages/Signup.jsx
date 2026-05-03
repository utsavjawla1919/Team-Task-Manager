import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Signup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-5">Start managing tasks with your team</p>

        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}

        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input
          required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="Jane Doe"
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="you@example.com"
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="At least 6 characters"
        />

        <button
          type="submit" disabled={busy}
          className="w-full bg-slate-900 text-white py-2 rounded-md font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="text-sm text-slate-600 mt-4 text-center">
          Already have an account? <Link to="/login" className="text-slate-900 font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
