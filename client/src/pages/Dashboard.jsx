import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function StatCard({ label, value, accent = 'slate' }) {
  const accents = {
    slate: 'border-slate-200',
    blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50',
    green: 'border-green-200 bg-green-50',
  };
  return (
    <div className={`p-4 rounded-xl border bg-white ${accents[accent]}`}>
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function TaskRow({ task }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  return (
    <Link
      to={`/projects/${task.project.id}`}
      className="flex items-start justify-between p-3 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
    >
      <div>
        <div className="font-medium text-slate-900">{task.title}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {task.project.name} · {task.status.replace('_', ' ')}
        </div>
      </div>
      {task.dueDate && (
        <div className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  const { projectCount, myOpenTaskCount, overdueCount, statusCounts, myTasks, overdueTasks } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Your tasks across all projects</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Projects" value={projectCount} accent="blue" />
        <StatCard label="My Open Tasks" value={myOpenTaskCount} accent="amber" />
        <StatCard label="Overdue" value={overdueCount} accent="red" />
        <StatCard label="In Progress" value={statusCounts.IN_PROGRESS} />
        <StatCard label="Done" value={statusCounts.DONE} accent="green" />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">My Open Tasks</h2>
        {myTasks.length === 0 ? (
          <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-md p-4">
            No open tasks assigned to you. 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Overdue (across team)</h2>
        {overdueTasks.length === 0 ? (
          <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-md p-4">
            Nothing overdue. Great work.
          </div>
        ) : (
          <div className="space-y-2">
            {overdueTasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
