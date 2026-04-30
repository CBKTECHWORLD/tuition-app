import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const ACCESS_OPTIONS = [
  { label: '10 Days (Trial)', days: 10 },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
  { label: 'Lifetime', days: 36500 },
];
const COOLING_DAYS = 10;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getAccessStatus(enrollment) {
  if (enrollment.status !== 'approved') return enrollment.status;
  if (enrollment.accessType === 'lifetime') return 'active';
  if (!enrollment.expiryDate) return 'active';
  const now = new Date();
  const expiry = enrollment.expiryDate.toDate ? enrollment.expiryDate.toDate() : new Date(enrollment.expiryDate);
  const cooling = enrollment.coolingEndsDate?.toDate ? enrollment.coolingEndsDate.toDate() : new Date(enrollment.coolingEndsDate || expiry);
  if (now <= expiry) return 'active';
  if (now <= cooling) return 'cooling';
  return 'expired';
}

function getDaysLeft(enrollment) {
  if (!enrollment.expiryDate || enrollment.accessType === 'lifetime') return null;
  const expiry = enrollment.expiryDate.toDate ? enrollment.expiryDate.toDate() : new Date(enrollment.expiryDate);
  const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function TutorEnrollments() {
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedClass, setSelectedClass] = useState('all');
  const [modal, setModal] = useState(null); // {enrollment, mode: 'approve'|'extend'|'revoke'}
  const [accessDays, setAccessDays] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [updating, setUpdating] = useState('');
  const [announcement, setAnnouncement] = useState({ classId: '', title: '', message: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [postingAnn, setPostingAnn] = useState(false);
  const [annSuccess, setAnnSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const [enrollSnap, classSnap, annSnap] = await Promise.all([
        getDocs(query(collection(db, 'enrollments'), where('tutorId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'classes'), where('tutorId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'announcements'), where('tutorId', '==', currentUser.uid))),  // no orderBy to avoid index requirement
      ]);
      const classMap = {};
      classSnap.docs.forEach(d => { classMap[d.id] = { id: d.id, ...d.data() }; });
      setClasses(classMap);
      setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (classSnap.docs.length > 0) {
        setAnnouncement(a => ({ ...a, classId: classSnap.docs[0].id }));
      }
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  const approveEnrollment = async () => {
    if (!modal) return;
    setUpdating(modal.enrollment.id);
    const days = customDays ? parseInt(customDays) : accessDays;
    const startDate = new Date();
    const expiryDate = days >= 36500 ? null : addDays(startDate, days);
    const coolingEndsDate = expiryDate ? addDays(expiryDate, COOLING_DAYS) : null;
    const isLifetime = days >= 36500;
    const data = {
      status: 'approved',
      accessType: isLifetime ? 'lifetime' : `${days}days`,
      accessDays: days,
      startDate,
      expiryDate: expiryDate || null,
      coolingEndsDate: coolingEndsDate || null,
      updatedAt: new Date(),
    };
    await updateDoc(doc(db, 'enrollments', modal.enrollment.id), data);
    setEnrollments(prev => prev.map(e => e.id === modal.enrollment.id ? { ...e, ...data } : e));
    setModal(null); setUpdating('');
  };

  const extendAccess = async () => {
    if (!modal) return;
    setUpdating(modal.enrollment.id);
    const days = customDays ? parseInt(customDays) : accessDays;
    const now = new Date();
    const currentExpiry = modal.enrollment.expiryDate?.toDate ? modal.enrollment.expiryDate.toDate() : new Date(modal.enrollment.expiryDate || now);
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = addDays(baseDate, days);
    const newCooling = addDays(newExpiry, COOLING_DAYS);
    const data = {
      expiryDate: newExpiry,
      coolingEndsDate: newCooling,
      accessType: `${days}days`,
      status: 'approved',
      updatedAt: new Date(),
    };
    await updateDoc(doc(db, 'enrollments', modal.enrollment.id), data);
    setEnrollments(prev => prev.map(e => e.id === modal.enrollment.id ? { ...e, ...data } : e));
    setModal(null); setUpdating('');
  };

  const revokeAccess = async (id) => {
    if (!confirm('Revoke this student\'s access?')) return;
    setUpdating(id);
    await updateDoc(doc(db, 'enrollments', id), { status: 'rejected', updatedAt: new Date() });
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected' } : e));
    setUpdating('');
  };

  const postAnnouncement = async () => {
    if (!announcement.title || !announcement.message || !announcement.classId) return;
    setPostingAnn(true);
    const { addDoc } = await import('firebase/firestore');
    await addDoc(collection(db, 'announcements'), {
      ...announcement,
      tutorId: currentUser.uid,
      tutorName: classes[announcement.classId]?.tutorName || '',
      className: classes[announcement.classId]?.title || '',
      createdAt: serverTimestamp(),
      isPinned: false,
    });
    setAnnSuccess('Announcement posted!');
    setAnnouncement(a => ({ ...a, title: '', message: '' }));
    setTimeout(() => setAnnSuccess(''), 3000);
    setPostingAnn(false);
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const classIds = Object.keys(classes);
  const filtered = enrollments.filter(e => {
    const status = getAccessStatus(e);
    const matchFilter = filter === 'all' ? true : filter === 'active' ? status === 'active' : filter === 'cooling' ? status === 'cooling' : filter === 'expired' ? status === 'expired' : e.status === filter;
    const matchClass = selectedClass === 'all' ? true : e.classId === selectedClass;
    return matchFilter && matchClass;
  });

  const counts = {
    pending: enrollments.filter(e => e.status === 'pending').length,
    active: enrollments.filter(e => getAccessStatus(e) === 'active').length,
    cooling: enrollments.filter(e => getAccessStatus(e) === 'cooling').length,
    expired: enrollments.filter(e => getAccessStatus(e) === 'expired').length,
    rejected: enrollments.filter(e => e.status === 'rejected').length,
    all: enrollments.length,
  };

  return (
    <div className="page fade-in">
      {/* Approve/Extend Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modal.mode === 'approve' ? '✅ Approve Student' : '🔄 Extend Access'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
              Student: <strong>{modal.enrollment.studentName}</strong> · Class: <strong>{modal.enrollment.className}</strong>
            </p>
            <div className="form-group">
              <label>Access Duration</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {ACCESS_OPTIONS.map(opt => (
                  <button key={opt.days}
                    className={`btn btn-sm ${accessDays === opt.days && !customDays ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setAccessDays(opt.days); setCustomDays(''); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="number" value={customDays} onChange={e => setCustomDays(e.target.value)}
                placeholder="Or type custom days (e.g. 45)" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 14, width: '100%', outline: 'none' }} />
            </div>
            {(customDays || accessDays < 36500) && (
              <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
                📅 Access until: <strong>{addDays(new Date(), customDays ? parseInt(customDays) : accessDays).toLocaleDateString('en-IN')}</strong>
                {' · '}🕐 Cooling period ends: <strong>{addDays(addDays(new Date(), customDays ? parseInt(customDays) : accessDays), COOLING_DAYS).toLocaleDateString('en-IN')}</strong>
              </p>
            )}
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-success" disabled={updating === modal.enrollment.id}
                onClick={modal.mode === 'approve' ? approveEnrollment : extendAccess}>
                {updating === modal.enrollment.id ? 'Saving…' : modal.mode === 'approve' ? '✓ Approve & Set Access' : '✓ Extend Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>Student Management</h1>
        <p className="text-muted">Approve students, manage access, post announcements</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pending', count: counts.pending, color: 'var(--amber)' },
          { label: 'Active', count: counts.active, color: 'var(--green)' },
          { label: 'Cooling', count: counts.cooling, color: 'var(--teal)' },
          { label: 'Expired', count: counts.expired, color: 'var(--rose)' },
        ].map(s => (
          <div className="card" key={s.label} style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div className="text-muted text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {['pending', 'active', 'cooling', 'expired', 'rejected', 'all'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f} ({counts[f] ?? enrollments.filter(e => getAccessStatus(e) === f || e.status === f).length})
          </button>
        ))}
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13, outline: 'none', marginLeft: 'auto' }}>
          <option value="all">All Classes</option>
          {classIds.map(id => <option key={id} value={id}>{classes[id]?.title}</option>)}
        </select>
      </div>

      {/* Enrollment Table */}
      <div className="card" style={{ padding: 0, marginBottom: 32 }}>
        {filtered.length === 0
          ? <div className="empty"><div className="empty-icon">📭</div><h3>No {filter} students</h3></div>
          : <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Student</th><th>Class</th><th>Status</th><th>Access Until</th><th>Days Left</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const status = getAccessStatus(e);
                    const daysLeft = getDaysLeft(e);
                    const expiry = e.expiryDate?.toDate ? e.expiryDate.toDate() : e.expiryDate ? new Date(e.expiryDate) : null;
                    return (
                      <tr key={e.id}>
                        <td>
                          <div><strong>{e.studentName}</strong></div>
                          <div className="text-muted text-sm">{e.studentEmail}</div>
                        </td>
                        <td>{e.className}</td>
                        <td>
                          <span className={`badge ${status === 'active' ? 'badge-approved' : status === 'cooling' ? 'badge-pending' : status === 'pending' ? 'badge-pending' : 'badge-rejected'}`}>
                            {status === 'cooling' ? '⏳ Cooling' : status}
                          </span>
                        </td>
                        <td className="text-muted text-sm">
                          {e.accessType === 'lifetime' ? '♾️ Lifetime' : expiry ? expiry.toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td>
                          {daysLeft === null ? '—' :
                            daysLeft > 7 ? <span style={{ color: 'var(--green)' }}>{daysLeft}d</span> :
                            daysLeft > 0 ? <span style={{ color: 'var(--amber)' }}>⚠️ {daysLeft}d</span> :
                            <span style={{ color: 'var(--rose)' }}>Expired</span>
                          }
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {e.status === 'pending' && (
                              <button className="btn btn-success btn-sm" disabled={updating === e.id}
                                onClick={() => { setModal({ enrollment: e, mode: 'approve' }); setAccessDays(30); setCustomDays(''); }}>
                                ✓ Approve
                              </button>
                            )}
                            {(status === 'active' || status === 'cooling' || status === 'expired') && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => { setModal({ enrollment: e, mode: 'extend' }); setAccessDays(30); setCustomDays(''); }}>
                                🔄 Extend
                              </button>
                            )}
                            {e.status === 'approved' && (
                              <button className="btn btn-danger btn-sm" disabled={updating === e.id}
                                onClick={() => revokeAccess(e.id)}>
                                ✗ Revoke
                              </button>
                            )}
                            {e.status === 'rejected' && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => { setModal({ enrollment: e, mode: 'approve' }); setAccessDays(30); setCustomDays(''); }}>
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* Announcements */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📢 Post Announcement</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        {annSuccess && <div className="alert alert-success">{annSuccess}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Class</label>
            <select value={announcement.classId} onChange={e => setAnnouncement(a => ({ ...a, classId: e.target.value }))}>
              {classIds.map(id => <option key={id} value={id}>{classes[id]?.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Title</label>
            <input value={announcement.title} onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))} placeholder="e.g. Exam on Monday, Chapter 5 covered today" />
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Message</label>
          <textarea value={announcement.message} onChange={e => setAnnouncement(a => ({ ...a, message: e.target.value }))}
            placeholder="Write your announcement here…" rows={3} />
        </div>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={postAnnouncement} disabled={postingAnn}>
          {postingAnn ? 'Posting…' : '📢 Post Announcement'}
        </button>
      </div>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent Announcements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.slice(0, 5).map(a => (
              <div key={a.id} className="card" style={{ padding: '14px 18px' }}>
                <div className="flex-between">
                  <div>
                    <strong>{a.title}</strong>
                    <span className="text-muted text-sm" style={{ marginLeft: 8 }}>· {a.className}</span>
                  </div>
                </div>
                <p className="text-muted text-sm mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
