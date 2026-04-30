import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function TutorAssignments() {
  const { currentUser, userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [form, setForm] = useState({ classId: '', title: '', description: '', dueDate: '', driveLink: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const [classSnap, assignSnap, subSnap] = await Promise.all([
        getDocs(query(collection(db, 'classes'), where('tutorId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'assignments'), where('tutorId', '==', currentUser.uid), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'submissions'), where('tutorId', '==', currentUser.uid))),
      ]);
      const cls = classSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClasses(cls);
      setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (cls.length > 0) setForm(f => ({ ...f, classId: cls[0].id }));
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  const createAssignment = async () => {
    if (!form.classId || !form.title || !form.description) {
      setSuccess('❌ Class, title and description are required.');
      return;
    }
    setSaving(true);
    const cls = classes.find(c => c.id === form.classId);
    const newAssign = {
      ...form,
      tutorId: currentUser.uid,
      tutorName: userData.name,
      className: cls?.title || '',
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'assignments'), newAssign);
    setAssignments(prev => [{ id: ref.id, ...newAssign, createdAt: new Date() }, ...prev]);
    setForm(f => ({ ...f, title: '', description: '', dueDate: '', driveLink: '' }));
    setSuccess('✅ Assignment posted successfully!');
    setTimeout(() => setSuccess(''), 3000);
    setSaving(false);
  };

  const deleteAssignment = async (id) => {
    if (!confirm('Delete this assignment?')) return;
    await deleteDoc(doc(db, 'assignments', id));
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const getSubmissionsForAssignment = (assignId) => submissions.filter(s => s.assignmentId === assignId);

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Assignments</h1>
        <p className="text-muted">Create assignments and view student submissions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 24 }}>
        {['create', 'posted', 'submissions'].map(t => (
          <button key={t} className={`btn btn-sm ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'create' ? '✏️ Create New' : t === 'posted' ? `📋 Posted (${assignments.length})` : `📬 Submissions (${submissions.length})`}
          </button>
        ))}
      </div>

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>✏️ New Assignment</h2>
          {success && <div className={`alert ${success.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{success}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Class *</label>
              <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label>Assignment Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 3 – Algebra Practice" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label>Description / Questions *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Write the assignment questions here directly. Students will read this and submit their answers via Google Drive." rows={6} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1', margin: 0 }}>
              <label>Reference Material (Google Drive link) — Optional</label>
              <input value={form.driveLink} onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))}
                placeholder="https://drive.google.com/... (attach a PDF, image or document if needed)" />
              <span className="text-muted text-sm mt-1">Share any reference material via Google Drive link. Set it to "Anyone with link can view".</span>
            </div>
          </div>

          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 14, marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>📌 How students submit:</p>
            <p className="text-muted text-sm">Students complete their homework in their notebook or a document, then upload it to their Google Drive and paste the link here. They organize their Drive in month-wise folders (e.g. "May 2026 Homework"). You'll see all submission links below.</p>
          </div>

          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={createAssignment} disabled={saving}>
            {saving ? 'Posting…' : '📋 Post Assignment'}
          </button>
        </div>
      )}

      {/* POSTED TAB */}
      {activeTab === 'posted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {assignments.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div><h3>No assignments posted yet</h3></div>
            : assignments.map(a => {
                const subs = getSubmissionsForAssignment(a.id);
                return (
                  <div key={a.id} className="card">
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{a.className}</span>
                        {a.dueDate && <span className="text-muted text-sm">📅 Due: {new Date(a.dueDate).toLocaleDateString('en-IN')}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedAssignment(a.id); setActiveTab('submissions'); }}>
                          📬 {subs.length} submissions
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteAssignment(a.id)}>🗑</button>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{a.title}</h3>
                    <p className="text-muted text-sm" style={{ whiteSpace: 'pre-wrap', marginBottom: a.driveLink ? 10 : 0 }}>{a.description}</p>
                    {a.driveLink && (
                      <a href={a.driveLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
                        📎 View Reference Material
                      </a>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {activeTab === 'submissions' && (
        <div>
          {/* Filter by assignment */}
          <div className="form-group" style={{ marginBottom: 20, maxWidth: 400 }}>
            <label>Filter by Assignment</label>
            <select value={selectedAssignment || ''} onChange={e => setSelectedAssignment(e.target.value || null)}>
              <option value="">All Assignments</option>
              {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.className})</option>)}
            </select>
          </div>

          {(() => {
            const filtered = selectedAssignment ? submissions.filter(s => s.assignmentId === selectedAssignment) : submissions;
            return filtered.length === 0
              ? <div className="empty"><div className="empty-icon">📬</div><h3>No submissions yet</h3><p>Students will submit their Google Drive links here.</p></div>
              : <div className="card" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Student</th><th>Assignment</th><th>Class</th><th>Submitted</th><th>Drive Link</th><th>Note</th></tr></thead>
                      <tbody>
                        {filtered.map(s => (
                          <tr key={s.id}>
                            <td><strong>{s.studentName}</strong></td>
                            <td className="text-muted">{assignments.find(a => a.id === s.assignmentId)?.title || '—'}</td>
                            <td className="text-muted">{s.className}</td>
                            <td className="text-muted text-sm">{s.submittedAt?.toDate ? s.submittedAt.toDate().toLocaleDateString('en-IN') : '—'}</td>
                            <td>
                              <a href={s.driveLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                                📁 Open Drive
                              </a>
                            </td>
                            <td className="text-muted text-sm">{s.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>;
          })()}
        </div>
      )}
    </div>
  );
}
