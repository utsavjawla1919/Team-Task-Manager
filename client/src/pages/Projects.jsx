import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/projects')
      .then((r) => setProjects(r.data.projects))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', { name, description });
      setName(''); setDescription(''); setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not create project');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">Projects you own or are a member of</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800"
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project name</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              placeholder="Marketing Q3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={2}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800">
            Create
          </button>
        </form>
      )}

      {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-md p-6 text-center">
          You're not part of any project yet. Create your first one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id} to={`/projects/${p.id}`}
              className="block bg-white border border-slate-200 rounded-md p-4 hover:shadow-sm hover:border-slate-300"
            >
              <div className="flex items-start justify-between">
                <div className="font-semibold text-slate-900">{p.name}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.myRole === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {p.myRole}
                </span>
              </div>
              {p.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.description}</p>}
              <div className="text-xs text-slate-500 mt-3 flex gap-3">
                <span>{p._count.tasks} tasks</span>
                <span>{p._count.members} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
