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
  const cooling = enrollment.coolingEndsDate?.toDate
    ? enrollment.coolingEndsDate.toDate()
    : new Date(expiry.getTime() + COOLING_DAYS * 86400000);
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

function LiveClassModal({ session, onClose }) {
  // Jitsi works best opened in a new tab — iframe has Chrome security restrictions
  const jitsiUrl = `https://meet.jit.si/${session.roomName}`;

  const openJitsi = () => {
    window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📡 {session.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 20, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📹</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{session.title}</h3>
          <p className="text-muted text-sm">📅 {session.date} · ⏰ {session.time} · ⏱ {session.duration} min</p>
        </div>

        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            ℹ️ The live class will open in a <strong>new browser tab</strong> using Jitsi Meet — free, no download needed. Allow camera and microphone when asked.
          </p>
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'center' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={openJitsi} style={{ fontSize: 15, padding: '12px 28px' }}>
            🚀 Join Live Class
          </button>
        </div>

        <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 14 }}>
          Room: <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{session.roomName}</code>
        </p>
      </div>
    </div>
  );
}

function ExpiredBanner({ enrollment, tutorInfo }) {
  const status = getAccessStatus(enrollment);
  const expiry = enrollment.expiryDate?.toDate
    ? enrollment.expiryDate.toDate()
    : enrollment.expiryDate ? new Date(enrollment.expiryDate) : null;
  const cooling = enrollment.coolingEndsDate?.toDate
    ? enrollment.coolingEndsDate.toDate()
    : enrollment.coolingEndsDate ? new Date(enrollment.coolingEndsDate) : null;

  if (status === 'expired') {
    return (
      <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ color: 'var(--rose)', fontWeight: 600, marginBottom: 8 }}>❌ Access Expired</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
          Your access to this class expired on <strong>{expiry?.toLocaleDateString('en-IN')}</strong>.
          Videos and live sessions are locked. Contact your tutor to renew.
        </p>
        {tutorInfo && (
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>👨‍🏫 Contact Your Tutor</p>
            <p className="text-sm"><strong>{tutorInfo.name}</strong></p>
            <p className="text-muted text-sm">{tutorInfo.email}</p>
            <p className="text-muted text-sm" style={{ marginTop: 6, fontSize: 12 }}>
              Tell them: "Please renew my access for <strong>{enrollment.className}</strong>"
            </p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'cooling') {
    return (
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 8 }}>⏳ Cooling Period Active</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
          Your access expired on <strong>{expiry?.toLocaleDateString('en-IN')}</strong> but you have a 10-day grace period.
          Cooling ends on <strong>{cooling?.toLocaleDateString('en-IN')}</strong>. Renew before then to avoid losing access.
        </p>
        {tutorInfo && (
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>👨‍🏫 Renew — Contact Your Tutor</p>
            <p className="text-sm"><strong>{tutorInfo.name}</strong></p>
            <p className="text-muted text-sm">{tutorInfo.email}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function StudentMyClasses() {
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState({});
  const [tutors, setTutors] = useState({});
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
      const tutorIds = new Set();

      for (const e of approved) {
        const cSnap = await getDoc(doc(db, 'classes', e.classId));
        if (cSnap.exists()) {
          const cls = { id: cSnap.id, ...cSnap.data() };
          classData[e.classId] = cls;
          if (cls.tutorId) tutorIds.add(cls.tutorId);
        }
      }
      setClasses(classData);

      // Fetch tutor info for contact details
      const tutorData = {};
      for (const tid of tutorIds) {
        const tSnap = await getDoc(doc(db, 'users', tid));
        if (tSnap.exists()) tutorData[tid] = tSnap.data();
      }
      setTutors(tutorData);

      if (approved.length > 0) {
        const classIds = approved.map(e => e.classId);
        const annSnap = await getDocs(query(collection(db, 'announcements')));
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
  const tutorInfo = selectedClass ? tutors[selectedClass.tutorId] : null;
  const canAccess = accessStatus === 'active' || accessStatus === 'cooling';

  return (
    <div className="page fade-in">
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      {activeSession && <LiveClassModal session={activeSession} onClose={() => setActiveSession(null)} />}

      <div className="page-header">
        <h1>My Classes</h1>
        <p className="text-muted">Your enrolled classes — watch videos, join live sessions, view announcements</p>
      </div>

      {/* Pending requests */}
      {pending.map(e => (
        <div key={e.id} className="card" style={{ padding: '12px 18px', borderColor: 'rgba(245,158,11,0.3)', marginBottom: 8 }}>
          <div className="flex-between">
            <div><strong>{e.className}</strong><span className="text-muted text-sm" style={{ marginLeft: 8 }}>Request sent — awaiting tutor approval</span></div>
            <span className="badge badge-pending">⏳ Pending</span>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejected.map(e => (
        <div key={e.id} className="card" style={{ padding: '12px 18px', borderColor: 'rgba(244,63,94,0.3)', marginBottom: 8 }}>
          <div className="flex-between">
            <div><strong>{e.className}</strong><span className="text-muted text-sm" style={{ marginLeft: 8 }}>Request rejected. Contact your tutor.</span></div>
            <span className="badge badge-rejected">✗ Rejected</span>
          </div>
        </div>
      ))}

      {approved.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <h3>No approved classes yet</h3>
          <p>Browse classes and request to join. Tutor will approve you shortly.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: activeClass ? '260px 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* Class List sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {approved.map(e => {
              const cls = classes[e.classId];
              if (!cls) return null;
              const status = getAccessStatus(e);
              const days = getDaysLeft(e);
              const isSelected = activeClass === e.classId;
              return (
                <div key={e.id} className="card"
                  style={{
                    cursor: 'pointer', padding: 16,
                    borderColor: isSelected ? 'var(--accent)' : status === 'cooling' ? 'rgba(245,158,11,0.4)' : status === 'expired' ? 'rgba(244,63,94,0.4)' : undefined,
                    background: isSelected ? 'rgba(99,102,241,0.06)' : undefined
                  }}
                  onClick={() => setActiveClass(e.classId)}>
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', marginBottom: 8, display: 'inline-block' }}>{cls.subject}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{cls.title}</h3>
                  <p className="text-muted text-sm">👨‍🏫 {cls.tutorName}</p>
                  <div style={{ marginTop: 8 }}>
                    {e.accessType === 'lifetime'
                      ? <span style={{ fontSize: 11, color: 'var(--green)' }}>♾️ Lifetime access</span>
                      : status === 'expired'
                        ? <span style={{ fontSize: 11, color: 'var(--rose)' }}>❌ Expired — contact tutor</span>
                        : status === 'cooling'
                          ? <span style={{ fontSize: 11, color: 'var(--amber)' }}>⏳ Cooling period</span>
                          : days !== null && days <= 7
                            ? <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠️ {days} days left</span>
                            : days !== null
                              ? <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ {days} days left</span>
                              : null
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* Class Content */}
          {selectedClass && selectedEnrollment && (
            <div className="fade-in">
              {/* Header */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="flex-between">
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedClass.title}</h2>
                    <p className="text-muted text-sm mt-1">{selectedClass.description}</p>
                    <div className="flex gap-3 mt-2 text-sm">
                      {selectedEnrollment.accessType === 'lifetime'
                        ? <span style={{ color: 'var(--green)' }}>♾️ Lifetime access</span>
                        : selectedEnrollment.expiryDate &&
                          <span className="text-muted">
                            📅 Access until: <strong>{(selectedEnrollment.expiryDate?.toDate ? selectedEnrollment.expiryDate.toDate() : new Date(selectedEnrollment.expiryDate)).toLocaleDateString('en-IN')}</strong>
                          </span>
                      }
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setActiveClass(null)}>✕ Close</button>
                </div>
              </div>

              {/* Expiry / Cooling Banner with tutor contact */}
              <ExpiredBanner enrollment={selectedEnrollment} tutorInfo={tutorInfo} />

              {/* 7-day warning */}
              {accessStatus === 'active' && daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <p style={{ color: 'var(--amber)', fontSize: 14 }}>
                    ⚠️ Your access expires in <strong>{daysLeft} days</strong>.
                    {tutorInfo && <span> Contact <strong>{tutorInfo.name}</strong> ({tutorInfo.email}) to renew.</span>}
                  </p>
                </div>
              )}

              {/* Announcements */}
              {classAnnouncements.length > 0 && (
                <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(99,102,241,0.3)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📢 Announcements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {classAnnouncements.slice(0, 5).map(a => (
                      <div key={a.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                        <strong style={{ fontSize: 14 }}>{a.title}</strong>
                        <p className="text-muted text-sm mt-1">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorded Videos */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>🎬 Recorded Lessons ({selectedClass.videos?.length || 0})</h3>
                {!canAccess && accessStatus === 'expired'
                  ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--rose)' }}>❌ Access expired. Contact tutor to renew.</div>
                  : !selectedClass.videos?.length
                    ? <p className="text-muted text-sm">No videos uploaded yet. Check back soon!</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedClass.videos.map((v, i) => (
                          <div key={v.id}
                            style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            onClick={() => setActiveVideo(v)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{v.title}</div>
                                {v.description && <div className="text-muted text-sm">{v.description}</div>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`badge ${v.type === 'youtube' ? 'badge-approved' : 'badge-pending'}`}>{v.type === 'youtube' ? '▶ YouTube' : '📁 Drive'}</span>
                              <span style={{ color: 'var(--accent)', fontSize: 20 }}>▶</span>
                            </div>
                          </div>
                        ))}
                      </div>
                }
              </div>

              {/* Live Sessions */}
              <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>📡 Live Sessions ({selectedClass.liveSessions?.length || 0})</h3>
                {!canAccess && accessStatus === 'expired'
                  ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--rose)' }}>❌ Access expired. Contact tutor to renew.</div>
                  : !selectedClass.liveSessions?.length
                    ? <p className="text-muted text-sm">No live sessions scheduled yet.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedClass.liveSessions.map(s => {
                          const isUpcoming = new Date(`${s.date}T${s.time}`) > new Date();
                          return (
                            <div key={s.id}
                              style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', border: `1px solid ${isUpcoming ? 'rgba(20,184,166,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{s.title}</div>
                                <div className="text-muted text-sm mt-1">📅 {s.date} · ⏰ {s.time} · ⏱ {s.duration} min</div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
