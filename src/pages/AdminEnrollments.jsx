import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [updating, setUpdating] = useState('');

  const fetchEnrollments = async () => {
    const snap = await getDocs(query(collection(db, 'enrollments'), orderBy('createdAt', 'desc')));
    setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchEnrollments(); }, []);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    await updateDoc(doc(db, 'enrollments', id), { status, updatedAt: new Date() });
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    setUpdating('');
  };

  const filtered = enrollments.filter(e => filter === 'all' ? true : e.status === filter);

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Enrollment Requests</h1>
        <p className="text-muted">Approve or reject student enrollment requests</p>
      </div>

      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f}
            <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>
              ({enrollments.filter(e => f === 'all' ? true : e.status === f).length})
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0
          ? <div className="empty"><div className="empty-icon">📭</div><h3>No {filter} requests</h3></div>
          : <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th><th>Email</th><th>Class</th>
                    <th>Subject</th><th>Tutor</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.studentName}</strong></td>
                      <td className="text-muted">{e.studentEmail}</td>
                      <td>{e.className}</td>
                      <td className="text-muted">{e.subject || '—'}</td>
                      <td className="text-muted">{e.tutorName || '—'}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                      <td>
                        <div className="flex gap-2">
                          {e.status !== 'approved' && (
                            <button className="btn btn-success btn-sm"
                              disabled={updating === e.id}
                              onClick={() => updateStatus(e.id, 'approved')}>
                              {updating === e.id ? '…' : '✓ Approve'}
                            </button>
                          )}
                          {e.status !== 'rejected' && (
                            <button className="btn btn-danger btn-sm"
                              disabled={updating === e.id}
                              onClick={() => updateStatus(e.id, 'rejected')}>
                              {updating === e.id ? '…' : '✗ Reject'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}
