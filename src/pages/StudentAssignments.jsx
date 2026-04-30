import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function StudentAssignments() {
  const { currentUser, userData } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [submitForm, setSubmitForm] = useState({ driveLink: '', note: '' });
  const [activeAssign, setActiveAssign] = useState(null);
  const [success, setSuccess] = useState('');
  const [driveSetup, setDriveSetup] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      // Get approved enrollments
      const enrollSnap = await getDocs(query(
        collection(db, 'enrollments'),
        where('studentId', '==', currentUser.uid),
        where('status', '==', 'approved')
      ));
      const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const classIds = enrollments.map(e => e.classId);
      const classMap = {};
      enrollments.forEach(e => { classMap[e.classId] = e.className; });
      setEnrolledClassIds(classIds);
      setEnrolledClasses(classMap);

      if (classIds.length === 0) { setLoading(false); return; }

      // Get assignments for enrolled classes
      const assignSnap = await getDocs(query(
        collection(db, 'assignments'),
        orderBy('createdAt', 'desc')
      ));
      const allAssign = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAssignments(allAssign.filter(a => classIds.includes(a.classId)));

      // Get my submissions
      const subSnap = await getDocs(query(
        collection(db, 'submissions'),
        where('studentId', '==', currentUser.uid)
      ));
      setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  const hasSubmitted = (assignId) => submissions.some(s => s.assignmentId === assignId);
  const getSubmission = (assignId) => submissions.find(s => s.assignmentId === assignId);

  const submitAssignment = async () => {
    if (!submitForm.driveLink) { setSuccess('❌ Please paste your Google Drive link.'); return; }
    if (!submitForm.driveLink.includes('drive.google.com') && !submitForm.driveLink.includes('docs.google.com')) {
      setSuccess('❌ Please paste a valid Google Drive or Google Docs link.');
      return;
    }
    setSubmitting(activeAssign.id);
    const assignment = activeAssign;
    const sub = {
      assignmentId: assignment.id,
      studentId: currentUser.uid,
      studentName: userData.name,
      studentEmail: currentUser.email,
      tutorId: assignment.tutorId,
      classId: assignment.classId,
      className: assignment.className,
      driveLink: submitForm.driveLink,
      note: submitForm.note,
      submittedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'submissions'), sub);
    setSubmissions(prev => [...prev, { id: ref.id, ...sub, submittedAt: new Date() }]);
    setSuccess('✅ Assignment submitted successfully!');
    setActiveAssign(null);
    setSubmitForm({ driveLink: '', note: '' });
    setTimeout(() => setSuccess(''), 4000);
    setSubmitting('');
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const pending = assignments.filter(a => !hasSubmitted(a.id));
  const submitted = assignments.filter(a => hasSubmitted(a.id));
  const overdue = pending.filter(a => a.dueDate && new Date(a.dueDate) < new Date());

  return (
    <div className="page fade-in">
      {/* Submit Modal */}
      {activeAssign && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2>📤 Submit Assignment</h2>
              <button className="modal-close" onClick={() => setActiveAssign(null)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{activeAssign.title}</p>
              <p className="text-muted text-sm">{activeAssign.className}</p>
            </div>

            {/* First time Drive setup instructions */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>📁 How to submit via Google Drive</p>
                <button onClick={() => setDriveSetup(!driveSetup)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>
                  {driveSetup ? 'Hide steps ▲' : 'Show steps ▼'}
                </button>
              </div>
              {driveSetup && (
                <ol style={{ fontSize: 13, color: 'var(--text2)', paddingLeft: 18, lineHeight: 2 }}>
                  <li>Open <a href="https://drive.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>drive.google.com</a></li>
                  <li>Create a folder like <strong>"May 2026 Homework"</strong></li>
                  <li>Upload your completed homework (photo, PDF, or doc)</li>
                  <li>Right-click the file → <strong>Share</strong> → Change to <strong>"Anyone with the link can view"</strong></li>
                  <li>Click <strong>Copy link</strong> → Paste it below</li>
                  <li><em>Next month, create "June 2026 Homework" folder and repeat</em></li>
                </ol>
              )}
              {!driveSetup && <p className="text-muted text-sm">Upload your homework to Google Drive → Share link → Paste below</p>}
            </div>

            <div className="form-group">
              <label>Google Drive Link *</label>
              <input value={submitForm.driveLink}
                onChange={e => setSubmitForm(f => ({ ...f, driveLink: e.target.value }))}
                placeholder="https://drive.google.com/file/d/..." />
            </div>
            <div className="form-group">
              <label>Note to tutor (optional)</label>
              <textarea value={submitForm.note}
                onChange={e => setSubmitForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. I completed questions 1-5, attempted Q6 partially" rows={2} />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setActiveAssign(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!!submitting} onClick={submitAssignment}>
                {submitting ? 'Submitting…' : '📤 Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>My Assignments</h1>
        <p className="text-muted">Complete and submit your homework via Google Drive</p>
      </div>

      {success && <div className={`alert ${success.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{success}</div>}

      {enrolledClassIds.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <h3>No enrolled classes</h3>
          <p>Get enrolled in a class first to see assignments.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Total', count: assignments.length, color: 'var(--accent)' },
              { label: 'Pending', count: pending.length, color: 'var(--amber)' },
              { label: 'Submitted', count: submitted.length, color: 'var(--green)' },
              { label: 'Overdue', count: overdue.length, color: 'var(--rose)' },
            ].map(s => (
              <div className="card" key={s.label} style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
                <div className="text-muted text-sm">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Pending */}
          {pending.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>⏳ Pending Assignments</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {pending.map(a => {
                  const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
                  return (
                    <div key={a.id} className="card" style={{ borderColor: isOverdue ? 'rgba(244,63,94,0.3)' : undefined }}>
                      <div className="flex-between">
                        <div style={{ flex: 1 }}>
                          <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{a.className}</span>
                            {a.dueDate && (
                              <span style={{ fontSize: 12, color: isOverdue ? 'var(--rose)' : 'var(--text2)' }}>
                                {isOverdue ? '⚠️ Overdue · ' : '📅 Due: '}{new Date(a.dueDate).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{a.title}</h3>
                          <p className="text-muted text-sm" style={{ whiteSpace: 'pre-wrap' }}>{a.description}</p>
                          {a.driveLink && (
                            <a href={a.driveLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 10 }}>
                              📎 Reference Material
                            </a>
                          )}
                        </div>
                        <div style={{ marginLeft: 20, flexShrink: 0 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => setActiveAssign(a)}>
                            📤 Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Submitted */}
          {submitted.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>✅ Submitted Assignments</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {submitted.map(a => {
                  const sub = getSubmission(a.id);
                  return (
                    <div key={a.id} className="card" style={{ padding: '14px 18px', borderColor: 'rgba(16,185,129,0.2)' }}>
                      <div className="flex-between">
                        <div>
                          <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
                            <span className="badge badge-approved">✓ Submitted</span>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{a.className}</span>
                          </div>
                          <strong style={{ fontSize: 14 }}>{a.title}</strong>
                          {sub?.note && <p className="text-muted text-sm mt-1">Note: {sub.note}</p>}
                          <p className="text-muted text-sm mt-1">
                            Submitted: {sub?.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleDateString('en-IN') : 'Recently'}
                          </p>
                        </div>
                        <a href={sub?.driveLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                          📁 View My Submission
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {assignments.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <h3>No assignments yet</h3>
              <p>Your tutors haven't posted any assignments yet. Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
