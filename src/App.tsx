import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/auth/AuthScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserDashboard } from './components/user/UserDashboard';
import { ProfilePage } from './components/user/ProfilePage';
import { MyLessonsPage } from './components/user/pages/MyLessonsPage';
import { LessonsPage } from './components/user/pages/LessonsPage';
import { NotificationsPage } from './components/user/pages/NotificationsPage';
import { RecentPage } from './components/user/pages/RecentPage';
import { AdminFeedPage } from './components/admin/AdminFeedPage';
import { NotificationSystem } from './components/notifications/NotificationSystem';
import { DeveloperToolsDetectedPage } from './components/security/DeveloperToolsDetectedPage';
import { DeveloperToolsGuard } from './components/security/DeveloperToolsGuard';
import { Toaster } from 'react-hot-toast';
import { useDeveloperToolsProtection } from './hooks/useDeveloperToolsProtection';

const AppRoutes: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  

  console.log('AppRoutes: user:', !!user, 'loading:', loading, 'isAdmin:', isAdmin);

  if (loading) {
    return (
      <DeveloperToolsGuard>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DeveloperToolsGuard>
    );
  }

  if (!user) {
    console.log('AppRoutes: No user, showing auth screen');
    return (
      <DeveloperToolsGuard>
        <AuthScreen />
      </DeveloperToolsGuard>
    );
  }

  console.log('AppRoutes: User authenticated, showing routes');
  
  if (isAdmin) {
    return (
      <DeveloperToolsGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/lessons" element={<AdminFeedPage onNavigate={(tab) => window.location.href = `/admin/${tab}`} activeTab="lessons" />} />
          <Route path="/admin/papers" element={<AdminDashboard />} />
          <Route path="/admin/notifications" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </DeveloperToolsGuard>
    );
  }

  return (
    <DeveloperToolsGuard>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<UserDashboard />} />
        <Route path="/recent" element={<RecentPage onNavigate={(tab) => window.location.href = `/${tab}`} activeTab="recent" />} />
        <Route path="/lessons" element={<LessonsPage onNavigate={(tab) => window.location.href = `/${tab}`} activeTab="lessons" />} />
        <Route path="/my-lessons" element={<MyLessonsPage onNavigate={(tab) => window.location.href = `/${tab}`} activeTab="my-lessons" onPlayerModalToggle={() => {}} />} />
        <Route path="/notifications" element={<NotificationsPage onNavigate={(tab) => window.location.href = `/${tab}`} activeTab="notifications" />} />
        <Route path="/profile" element={<ProfilePage onNavigate={(tab) => window.location.href = `/${tab}`} activeTab="profile" />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </DeveloperToolsGuard>
  );
};

function App() {
  console.log('App: Rendering');
  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/developer-tools-detected" element={<DeveloperToolsDetectedPage />} />
            <Route path="*" element={<AppRoutes />} />
          </Routes>
          <NotificationSystem />
        </div>
      </Router>
    </>
  );
}

export default App;