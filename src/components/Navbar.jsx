import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, userRole, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';
  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">◈</span>
          <span>EduLearn</span>
        </Link>
        <div className="navbar-links">
          {userRole === 'admin' && <>
            <Link className={`nav-link ${isActive('/admin')}`} to="/admin">Dashboard</Link>
            <Link className={`nav-link ${isActive('/admin/classes')}`} to="/admin/classes">Classes</Link>
            <Link className={`nav-link ${isActive('/admin/users')}`} to="/admin/users">Users</Link>
            <Link className={`nav-link ${isActive('/admin/enrollments')}`} to="/admin/enrollments">Enrollments</Link>
          </>}
          {userRole === 'tutor' && <>
            <Link className={`nav-link ${isActive('/tutor')}`} to="/tutor">My Classes</Link>
            <Link className={`nav-link ${isActive('/tutor/create')}`} to="/tutor/create">+ New Class</Link>
            <Link className={`nav-link ${isActive('/tutor/enrollments')}`} to="/tutor/enrollments">Students</Link>
            <Link className={`nav-link ${isActive('/tutor/assignments')}`} to="/tutor/assignments">Assignments</Link>
          </>}
          {userRole === 'student' && <>
            <Link className={`nav-link ${isActive('/student')}`} to="/student">Browse Classes</Link>
            <Link className={`nav-link ${isActive('/student/my-classes')}`} to="/student/my-classes">My Classes</Link>
            <Link className={`nav-link ${isActive('/student/assignments')}`} to="/student/assignments">Assignments</Link>
          </>}
        </div>
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">{userData?.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div className="user-name">{userData?.name}</div>
              <span className={`badge badge-${userRole}`}>{userRole}</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
