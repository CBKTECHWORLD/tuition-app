import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const COOLING_DAYS = 10;

function getAccessStatus(enrollment) {
  if (enrollment.status !== 'approved') return enrollment.status;
  if (enrollment.accessType === 'lifetime') return 'active';
  if (!enrollment.expiryDate) return 'active';
  const now = new Date();
  const expiry = enrollment.expiryDate?.toDate ? enrollment.expiryDate.toDate() : new Date(enrollment.expiryDate);
  const cooling = enrollment.coolingEndsDate?.toDate ? enrollment.coolingEndsDate.toDate() : new Date(expiry.getTime() + COOLING_DAYS * 86400000);
  if (now <= expiry) return 'active';
  if (now <= cooling) return 'cooling';
  return 'expired';
}

function getDaysLeft(enrollment) {
  if (!enrollment.expiryDate || enrollment.accessType === 'lifetime') return null;
  const expiry = enrollment.expiryDate?.toDate ? enrollment.expiryDate.toDate() : new Date(enrollment.expiryDate);
  return Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
}

function VideoModal({ video, onClose }) {
  let embedSrc = '';
  if (video.type === 'youtube') embedSrc = `https://www.youtube.com/embed/${video.embedId}?autoplay=1`;
  else if (video.type === 'drive') embedSrc = `https://drive.google.com/file/d/${video.embedId}/preview`;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ width: '90%', maxWidth: 860 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{video.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="video-embed" style={{ height: 480 }}>
          <iframe src={embedSrc} title={video.title} allowFullScreen allow="autoplay" />
        </div>
        {video.description && <p className="text-muted text-sm" style={{ marginTop: 12 }}>{video.description}</p>}
      </div>
    </div>
  );
}

function LiveModal({ session, onClose }) {
  const jitsiUrl = `https://meet.jit.si/${session.roomName}`;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ width: '95%', maxWidth: 1000 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📡 {session.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="live-frame">
          <iframe src={jitsiUrl} title="Live Class" allow="camera; microphone; fullscreen; display-capture" />
        </div>
        <div className="flex-between" style={{ marginTop: 12 }}>
          <p className="text-muted text-sm">{session.date} at {session.time} · {session.duration} min</p>
          <a href={jitsiUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open in New Tab ↗</a>
        </div>
      </div>
    </div>
  );
}

export default function StudentMyClasses() {
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
      const enroll = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnrollments(enroll);
      const approved = enroll.filter(e => e.status === 'approved');
      const classData = {};
      for (const e of approved) {
        const cSnap = await getDoc(doc(db, 'classes', e.classId));
        if (cSnap.exists()) classData[e.classId] = { id: cSnap.id, ...cSnap.data() };
      }
      setClasses(classData);
      if (approved.length > 0) {
        const annSnap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
        const classIds = approved.map(e => e.classId);
        setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => classIds.includes(a.classId)));
      }
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const approved = enrollments.filter(e => e.status === 'approved');
  const pending = enrollments.filter(e => e.status === 'pending');
  const rejected = enrollments.filter(e => e.status === 'rejected');
  const selectedClass = activeClass ? classes[activeClass] : null;
  const selectedEnrollment = activeClass ? approved.find(e => e.classId === activeClass) : null;
  const accessStatus = selectedEnrollment ? getAccessStatus(selectedEnrollment) : null;
  const daysLeft = selectedEnrollment ? getDaysLeft(selectedEnrollment) : null;
  const classAnnouncements = activeClass ? announcements.filter(a => a.classId === activeClass) : [];

  return (
    <div className="page fade-in">
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      {activeSession && <LiveModal session={activeSession} onClose={() => setActiveSession(null)} />}

      <div className="page-header">
        <h1>My Classes</h1>
        <p className="text-muted">Your enrolled classes — watch videos, join live sessions, view announcements</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {pending.map(e => (
            <div key={e.id} className="card" style={{ padding: '12px 18px', borderColor: 'rgba(245,158,11,0.3)', marginBottom: 8 }}>
              <div className="flex-between">
                <div>
                  <strong>{e.className}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: 8 }}>— Request sent, awaiting tutor approval</span>
                </div>
                <span className="badge badge-pending">⏳ Pending</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {rejected.map(e => (
            <div key={e.id} className="card" style={{ padding: '12px 18px', borderColor: 'rgba(244,63,94,0.3)', marginBottom: 8 }}>
              <div className="flex-between">
                <div><strong>{e.className}</strong><span className="text-muted text-sm" style={{ marginLeft: 8 }}>— Request rejected. Contact your tutor.</span></div>
                <span className="badge badge-rejected">✗ Rejected</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {approved.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <h3>No approved classes yet</h3>
          <p>Browse classes and request to join. Tutor will approve you shortly.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: activeClass ? '280px 1fr' : '1fr', gap: 24 }}>
          {/* Class List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {approved.map(e => {
              const cls = classes[e.classId];
              if (!cls) return null;
              const status = getAccessStatus(e);
              const days = getDaysLeft(e);
              return (
                <div key={e.id} className="card"
                  style={{ cursor: 'pointer', borderColor: activeClass === e.classId ? 'var(--accent)' : status === 'cooling' ? 'rgba(245,158,11,0.4)' : status === 'expired' ? 'rgba(244,63,94,0.4)' : undefined, background: activeClass === e.classId ? 'rgba(99,102,241,0.05)' : undefined }}
                  onClick={() => setActiveClass(e.classId)}>
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', marginBottom: 6 }}>{cls.subject}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{cls.title}</h3>
                  <p className="text-muted text-sm mt-1">👨‍🏫 {cls.tutorName}</p>
                  <div className="flex gap-2 mt-2" style={{ alignItems: 'center' }}>
                    {e.accessType === 'lifetime'
                      ? <span style={{ fontSize: 11, color: 'var(--green)' }}>♾️ Lifetime</span>
                      : days !== null && days > 0
                        ? <span style={{ fontSize: 11, color: days <= 7 ? 'var(--amber)' : 'var(--green)' }}>{days <= 7 ? '⚠️' : '✓'} {days}d left</span>
                        : status === 'cooling'
                          ? <span style={{ fontSize: 11, color: 'var(--amber)' }}>⏳ Cooling period</span>
                          : <span style={{ fontSize: 11, color: 'var(--rose)' }}>❌ Access expired</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* Class Content */}
          {selectedClass && selectedEnrollment && (
            <div className="fade-in">
              {/* Access Banner */}
              {accessStatus === 'cooling' && (
                <div className="alert" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
                  ⏳ <strong>Access expired</strong> — You are in your 10-day cooling period. Contact your tutor to renew access before it ends completely.
                  {selectedEnrollment.coolingEndsDate && (
                    <span> Cooling ends: <strong>{(selectedEnrollment.coolingEndsDate?.toDate ? selectedEnrollment.coolingEndsDate.toDate() : new Date(selectedEnrollment.coolingEndsDate)).toLocaleDateString('en-IN')}</strong></span>
                  )}
                </div>
              )}
              {accessStatus === 'expired' && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  ❌ <strong>Access fully expired.</strong> Please contact your tutor to renew your access for this class.
                </div>
              )}
              {accessStatus === 'active' && daysLeft !== null && daysLeft <= 7 && (
                <div className="alert" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16 }}>
                  ⚠️ Your access expires in <strong>{daysLeft} days</strong>. Contact your tutor to renew.
                </div>
              )}

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="flex-between">
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedClass.title}</h2>
                    <p className="text-muted text-sm mt-1">{selectedClass.description}</p>
                    <div className="flex gap-3 mt-2 text-sm">
                      {selectedEnrollment.accessType === 'lifetime'
                        ? <span style={{ color: 'var(--green)' }}>♾️ Lifetime access</span>
                        : selectedEnrollment.expiryDate && <span className="text-muted">
                            📅 Access until: {(selectedEnrollment.expiryDate?.toDate ? selectedEnrollment.expiryDate.toDate() : new Date(selectedEnrollment.expiryDate)).toLocaleDateString('en-IN')}
                          </span>
                      }
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setActiveClass(null)}>✕ Close</button>
                </div>
              </div>

              {/* Announcements */}
              {classAnnouncements.length > 0 && (
                <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(99,102,241,0.3)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📢 Announcements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {classAnnouncements.slice(0, 3).map(a => (
                      <div key={a.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                        <strong style={{ fontSize: 14 }}>{a.title}</strong>
                        <p className="text-muted text-sm mt-1">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos — blocked if expired */}
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>🎬 Recorded Lessons ({selectedClass.videos?.length || 0})</h3>
                {accessStatus === 'expired'
                  ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--rose)' }}>❌ Access expired. Contact tutor to renew.</div>
                  : !selectedClass.videos?.length
                    ? <p className="text-muted text-sm">No videos uploaded yet.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedClass.videos.map((v, i) => (
                          <div key={v.id} className="flex-between"
                            style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                            onClick={() => setActiveVideo(v)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <div className="flex gap-3" style={{ alignItems: 'center' }}>
                              <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{v.title}</div>
                                {v.description && <div className="text-muted text-sm">{v.description}</div>}
                              </div>
                            </div>
                            <span style={{ color: 'var(--accent)', fontSize: 18 }}>▶</span>
                          </div>
                        ))}
                      </div>
                }
              </div>

              {/* Live Sessions */}
              <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>📡 Live Sessions ({selectedClass.liveSessions?.length || 0})</h3>
                {accessStatus === 'expired'
                  ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--rose)' }}>❌ Access expired. Contact tutor to renew.</div>
                  : !selectedClass.liveSessions?.length
                    ? <p className="text-muted text-sm">No live sessions scheduled yet.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedClass.liveSessions.map(s => {
                          const isUpcoming = new Date(`${s.date}T${s.time}`) > new Date();
                          return (
                            <div key={s.id} className="flex-between"
                              style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', border: `1px solid ${isUpcoming ? 'rgba(20,184,166,0.3)' : 'var(--border)'}` }}>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{s.title}</div>
                                <div className="text-muted text-sm mt-1">📅 {s.date} · ⏰ {s.time} · ⏱ {s.duration} min</div>
                              </div>
                              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                {isUpcoming && <span className="badge" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)' }}>Upcoming</span>}
                                <button className="btn btn-primary btn-sm" onClick={() => setActiveSession(s)}>📡 Join</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
