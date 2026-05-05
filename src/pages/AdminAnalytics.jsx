import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminAnalytics() {
  const [stats, setStats] = useState({ students: 0, tutors: 0, classes: 0, enrollments: 0, active: 0 });
  const [tutors, setTutors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [annSuccess, setAnnSuccess] = useState('');
  const [togglingId, setTogglingId] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [userSnap, classSnap, enrollSnap, profileSnap, annSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'classes')),
      getDocs(collection(db, 'enrollments')),
      getDocs(collection(db, 'tutorProfiles')),
      getDocs(query(collection(db, 'announcements'), where('isGlobal', '==', true))),
    ]);

    const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const enrolls = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const profiles = profileSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tutorUsers = users.filter(u => u.role === 'tutor');

    const tutorStats = tutorUsers.map(u => {
      const profile = profiles.find(p => p.tutorId === u.id) || {};
      const tutorClasses = classSnap.docs.filter(d => d.data().tutorId === u.id);
      const tutorEnrolls = enrolls.filter(e => e.tutorId === u.id && e.status === 'approved');
      const uniqueStudents = new Set(tutorEnrolls.map(e => e.studentId)).size;
      return {
        ...profile,
        id: u.id,
        name: u.name,
        email: u.email,
        approved: u.approved,
        featured: profile.featured || false,
        verified: profile.verified || false,
        classCount: tutorClasses.length,
        studentCount: uniqueStudents,
      };
    });

    const approvedEnrolls = enrolls.filter(e => e.status === 'approved');
    const uniqueActiveStudents = new Set(approvedEnrolls.map(e => e.studentId)).size;

    setStats({
      students: users.filter(u => u.role === 'student').length,
      tutors: tutorUsers.length,
      classes: classSnap.size,
      enrollments: enrollSnap.size,
      active: uniqueActiveStudents,
    });
    setTutors(tutorStats);
    setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const toggleFeature = async (tutorId, field, current) => {
    if (!tutorId) return;
    setTogglingId(tutorId + field);
    try {
      const profileRef = doc(db, 'tutorProfiles', tutorId);
      await setDoc(profileRef, { [field]: !current, tutorId }, { merge: true });
      setTutors(prev => prev.map(t =>
        t.id === tutorId ? { ...t, [field]: !current } : t
      ));
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Error updating. Please try again.');
    }
    setTogglingId('');
  };

  const postAnnouncement = async () => {
    if (!announcement.title || !announcement.message) return;
    setPosting(true);
    await addDoc(collection(db, 'announcements'), {
      ...announcement, isGlobal: true,
      classId: null, tutorId: 'admin',
      createdAt: serverTimestamp(),
    });
    setAnnouncements(prev => [{ ...announcement, isGlobal: true }, ...prev]);
    setAnnouncement({ title: '', message: '' });
    setAnnSuccess('✅ Announcement posted to all users!');
    setTimeout(() => setAnnSuccess(''), 3000);
    setPosting(false);
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Platform Analytics</h1>
        <p className="text-muted">Overview, tutor management and announcements</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { label: 'Total Students', value: stats.students, icon: '🎓', color: 'var(--accent)' },
          { label: 'Tutors', value: stats.tutors, icon: '👨‍🏫', color: 'var(--accent2)' },
          { label: 'Classes', value: stats.classes, icon: '📚', color: 'var(--teal)' },
          { label: 'Total Enrollments', value: stats.enrollments, icon: '📋', color: 'var(--amber)' },
          { label: 'Unique Active Students', value: stats.active, icon: '✅', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 18 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="text-muted text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Platform Announcement */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📢 Post Platform Announcement</h2>
      <div className="card" style={{ marginBottom: 32 }}>
        {annSuccess && <div className="alert alert-success">{annSuccess}</div>}
        <div className="form-group" style={{ margin: 0, marginBottom: 12 }}>
          <label>Title</label>
          <input value={announcement.title} onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))}
            placeholder="e.g. Holiday notice, New feature update" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Message</label>
          <textarea value={announcement.message} onChange={e => setAnnouncement(a => ({ ...a, message: e.target.value }))}
            placeholder="All students and tutors will see this announcement…" rows={3} />
        </div>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={postAnnouncement} disabled={posting}>
          {posting ? 'Posting…' : '📢 Post to Everyone'}
        </button>
        {announcements.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="text-muted text-sm" style={{ marginBottom: 8 }}>Recent:</p>
            {announcements.slice(0, 3).map((a, i) => (
              <div key={i} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>{a.title}</strong>
                <p className="text-muted text-sm mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tutor Management */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>👨‍🏫 Tutor Management</h2>
      <div className="card" style={{ padding: 0, marginBottom: 32 }}>
        {tutors.length === 0
          ? <div className="empty"><div className="empty-icon">👨‍🏫</div><h3>No tutors yet</h3></div>
          : <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tutor</th><th>Classes</th><th>Unique Students</th><th>Featured</th><th>Verified</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {tutors.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div className="text-muted text-sm">{t.email}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}><strong>{t.classCount}</strong></td>
                      <td style={{ textAlign: 'center' }}><strong>{t.studentCount}</strong></td>
                      <td>
                        <button
                          className={`btn btn-sm ${t.featured ? 'btn-primary' : 'btn-outline'}`}
                          disabled={togglingId === t.id + 'featured'}
                          onClick={() => toggleFeature(t.id, 'featured', t.featured)}>
                          {togglingId === t.id + 'featured' ? '…' : t.featured ? '⭐ Featured' : 'Set Featured'}
                        </button>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${t.verified ? 'btn-success' : 'btn-outline'}`}
                          disabled={togglingId === t.id + 'verified'}
                          onClick={() => toggleFeature(t.id, 'verified', t.verified)}>
                          {togglingId === t.id + 'verified' ? '…' : t.verified ? '✓ Verified' : 'Verify'}
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${t.approved ? 'badge-approved' : 'badge-pending'}`}>
                          {t.approved ? 'Active' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* All Classes */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📚 All Classes</h2>
      <div className="card" style={{ padding: 0 }}>
        {classes.length === 0
          ? <div className="empty"><div className="empty-icon">📚</div><h3>No classes yet</h3></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Class</th><th>Subject</th><th>Tutor</th><th>Videos</th><th>Live</th></tr></thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.title}</strong>
                        {c.grade && <span className="text-muted text-sm" style={{ marginLeft: 6 }}>{c.grade}</span>}
                      </td>
                      <td><span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>{c.subject}</span></td>
                      <td className="text-muted">{c.tutorName}</td>
                      <td style={{ textAlign: 'center' }}>{c.videos?.length || 0}</td>
                      <td style={{ textAlign: 'center' }}>{c.liveSessions?.length || 0}</td>
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
