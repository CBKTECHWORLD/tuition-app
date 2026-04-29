import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import { LoginPage, SignupPage } from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import AdminEnrollments from './pages/AdminEnrollments';
import AdminClasses from './pages/AdminClasses';
import AdminUsers from './pages/AdminUsers';
import TutorDashboard from './pages/TutorDashboard';
import TutorCreateClass from './pages/TutorCreateClass';
import StudentClasses from './pages/StudentClasses';
import StudentMyClasses from './pages/StudentMyClasses';

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin" />;
    if (userRole === 'tutor') return <Navigate to="/tutor" />;
    return <Navigate to="/student" />;
  }
  return children;
}

function HomeRedirect() {
  const { currentUser, userRole } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (userRole === 'admin') return <Navigate to="/admin" />;
  if (userRole === 'tutor') return <Navigate to="/tutor" />;
  return <Navigate to="/student" />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/enrollments" element={<ProtectedRoute allowedRoles={['admin']}><AdminEnrollments /></ProtectedRoute>} />
        <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['admin']}><AdminClasses /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />

        {/* Tutor */}
        <Route path="/tutor" element={<ProtectedRoute allowedRoles={['tutor']}><TutorDashboard /></ProtectedRoute>} />
        <Route path="/tutor/create" element={<ProtectedRoute allowedRoles={['tutor']}><TutorCreateClass /></ProtectedRoute>} />
        <Route path="/tutor/class/:classId" element={<ProtectedRoute allowedRoles={['tutor']}><TutorCreateClass /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentClasses /></ProtectedRoute>} />
        <Route path="/student/my-classes" element={<ProtectedRoute allowedRoles={['student']}><StudentMyClasses /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
