import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleApproval = async (id, current) => {
    await updateDoc(doc(db, 'users', id), { approved: !current });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, approved: !current } : u));
  };

  const filtered = users.filter(u => filter === 'all' ? true : u.role === filter);

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>All Users</h1>
        <p className="text-muted">{users.length} registered users</p>
      </div>

      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {['all', 'student', 'tutor', 'admin'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f} ({users.filter(u => f === 'all' ? true : u.role === f).length})
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td className="text-muted">{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.approved ? 'badge-approved' : 'badge-pending'}`}>
                      {u.approved ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {u.role === 'tutor' && (
                      <button className={`btn btn-sm ${u.approved ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleApproval(u.id, u.approved)}>
                        {u.approved ? 'Suspend' : 'Approve Tutor'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
