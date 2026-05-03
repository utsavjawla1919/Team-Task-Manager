import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext.jsx';

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
];

const PRIORITY_COLORS = {
  LOW: 'bg-slate-200 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-red-100 text-red-800',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/projects/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <div className="text-slate-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  const { project, myRole } = data;
  const isAdmin = myRole === 'ADMIN';
  const isOwner = project.ownerId === user.id;

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, c) => {
    acc[c.key] = project.tasks.filter((t) => t.status === c.key);
    return acc;
  }, {});

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Update failed');
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Delete failed');
    }
  };

  const deleteProject = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      navigate('/projects');
    } catch (e) {
      alert(e?.response?.data?.error || 'Delete failed');
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed');
    }
  };

  const changeRole = async (userId, role) => {
    try {
      await api.patch(`/projects/${project.id}/members/${userId}`, { role });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          {project.description && <p className="text-sm text-slate-600 mt-1">{project.description}</p>}
          <div className="text-xs text-slate-500 mt-2">
            Owner: {project.owner.name} · Your role:
            <span className={`ml-1 px-2 py-0.5 rounded-full ${
              isAdmin ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {myRole}
            </span>
          </div>
        </div>
        {isOwner && (
          <button onClick={deleteProject} className="text-sm text-red-600 hover:underline">Delete Project</button>
        )}
      </div>

      {/* Tasks header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
        <button
          onClick={() => { setEditingTask(null); setShowTaskForm((v) => !v); }}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800"
        >
          {showTaskForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showTaskForm && (
        <TaskForm
          projectId={project.id}
          members={project.members}
          existing={editingTask}
          onDone={() => { setShowTaskForm(false); setEditingTask(null); load(); }}
        />
      )}

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_COLUMNS.map((col) => (
          <div key={col.key} className="bg-slate-100 rounded-lg p-3">
            <div className="font-semibold text-slate-700 mb-2 px-1">
              {col.label} <span className="text-slate-500 text-sm">({tasksByStatus[col.key].length})</span>
            </div>
            <div className="space-y-2">
              {tasksByStatus[col.key].map((task) => (
                <TaskCard
                  key={task.id} task={task}
                  isAdmin={isAdmin} currentUserId={user.id}
                  onEdit={() => { setEditingTask(task); setShowTaskForm(true); }}
                  onDelete={() => deleteTask(task.id)}
                  onStatusChange={(s) => updateTaskStatus(task.id, s)}
                />
              ))}
              {tasksByStatus[col.key].length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">No tasks</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Members section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-900">Members ({project.members.length})</h2>
          {isAdmin && (
            <button
              onClick={() => setShowMemberForm((v) => !v)}
              className="text-sm px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-100"
            >
              {showMemberForm ? 'Cancel' : '+ Invite Member'}
            </button>
          )}
        </div>

        {showMemberForm && (
          <InviteMemberForm projectId={project.id} onDone={() => { setShowMemberForm(false); load(); }} />
        )}

        <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium text-slate-900">
                  {m.user.name}
                  {m.user.id === project.ownerId && <span className="ml-2 text-xs text-slate-500">(owner)</span>}
                </div>
                <div className="text-xs text-slate-500">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && m.user.id !== project.ownerId ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.user.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.role === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {m.role}
                  </span>
                )}
                {isAdmin && m.user.id !== project.ownerId && (
                  <button onClick={() => removeMember(m.user.id)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskCard({ task, isAdmin, currentUserId, onEdit, onDelete, onStatusChange }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const canEdit = isAdmin || task.createdById === currentUserId || task.assigneeId === currentUserId;
  const canDelete = isAdmin || task.createdById === currentUserId;

  return (
    <div className="bg-white border border-slate-200 rounded-md p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-slate-900 text-sm">{task.title}</div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      {task.description && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{task.description}</p>}

      <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500 mt-2">
        {task.assignee && <span>👤 {task.assignee.name}</span>}
        {task.dueDate && (
          <span className={overdue ? 'text-red-600 font-semibold' : ''}>
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        {canEdit ? (
          <select
            value={task.status} onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs px-1.5 py-0.5 border border-slate-300 rounded"
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        ) : <span className="text-xs text-slate-400">{task.status}</span>}

        <div className="flex gap-2 text-xs">
          {canEdit && <button onClick={onEdit} className="text-slate-600 hover:underline">Edit</button>}
          {canDelete && <button onClick={onDelete} className="text-red-600 hover:underline">Delete</button>}
        </div>
      </div>
    </div>
  );
}

function TaskForm({ projectId, members, existing, onDone }) {
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [priority, setPriority] = useState(existing?.priority || 'MEDIUM');
  const [status, setStatus] = useState(existing?.status || 'TODO');
  const [assigneeId, setAssigneeId] = useState(existing?.assigneeId || '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ? existing.dueDate.slice(0, 10) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const payload = {
        title, description: description || null, priority, status,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
      if (existing) {
        await api.patch(`/tasks/${existing.id}`, payload);
      } else {
        await api.post('/tasks', { ...payload, projectId });
      }
      onDone();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
      {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md">
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md" />
        </div>
      </div>

      <button disabled={busy} type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
        {busy ? 'Saving...' : existing ? 'Save changes' : 'Create task'}
      </button>
    </form>
  );
}

function InviteMemberForm({ projectId, onDone }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email, role });
      setEmail(''); onDone();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-md p-4 mb-2 flex flex-wrap items-end gap-3">
      {error && <div className="w-full text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-slate-700 mb-1">Email of existing user</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-md" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-md">
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <button disabled={busy} type="submit"
        className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
        {busy ? 'Inviting...' : 'Invite'}
      </button>
    </form>
  );
}
