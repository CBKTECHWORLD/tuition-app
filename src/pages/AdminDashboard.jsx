import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, classes: 0, pending: 0, tutors: 0 });
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [usersSnap, classesSnap, enrollSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'classes')),
        getDocs(query(collection(db, 'enrollments'), orderBy('createdAt', 'desc'))),
      ]);

      const users = usersSnap.docs.map(d => d.data());
      const tutors = users.filter(u => u.role === 'tutor').length;
      const enroll = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = enroll.filter(e => e.status === 'pending').length;

      setStats({ users: usersSnap.size, classes: classesSnap.size, pending, tutors });
      setRecentEnrollments(enroll.slice(0, 8));
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: '👥', color: 'var(--accent)' },
    { label: 'Total Classes', value: stats.classes, icon: '📚', color: 'var(--teal)' },
    { label: 'Tutors', value: stats.tutors, icon: '👨‍🏫', color: 'var(--accent2)' },
    { label: 'Pending Approvals', value: stats.pending, icon: '⏳', color: 'var(--amber)', alert: stats.pending > 0 },
  ];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p className="text-muted">Overview of your tuition platform</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map(s => (
          <div className="card" key={s.label} style={{ borderColor: s.alert ? 'var(--amber)' : undefined }}>
            <div className="flex-between">
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
            <p style={{ marginTop: 8, color: 'var(--text2)', fontSize: 14 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent Enrollment Requests</h2>
        <Link to="/admin/enrollments" className="btn btn-outline btn-sm">View All →</Link>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {recentEnrollments.length === 0
          ? <div className="empty"><div className="empty-icon">📭</div><h3>No enrollment requests yet</h3></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Class</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {recentEnrollments.map(e => (
                    <tr key={e.id}>
                      <td>{e.studentName || '—'}</td>
                      <td>{e.className || '—'}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                      <td><Link to="/admin/enrollments" className="btn btn-outline btn-sm">Manage</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginTop: 32 }}>
        {[
          { to: '/admin/enrollments', label: '✅ Manage Enrollments', desc: 'Approve or reject student requests' },
          { to: '/admin/classes', label: '📚 Manage Classes', desc: 'View and delete classes' },
          { to: '/admin/users', label: '👥 Manage Users', desc: 'View all platform users' },
        ].map(link => (
          <Link to={link.to} key={link.to} className="card" style={{ textDecoration: 'none', display: 'block' }}>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{link.label}</p>
            <p className="text-muted text-sm mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
