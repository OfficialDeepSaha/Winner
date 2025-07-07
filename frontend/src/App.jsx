import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Import without file extension to let the bundler resolve it correctly
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from './components/ThemeProvider';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import ContextInput from './components/ContextInput';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import CalendarPage from './components/CalendarPage';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />

      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<TaskList />} />
        <Route path="tasks/new" element={<TaskForm />} />
        <Route path="tasks/:id/edit" element={<TaskForm />} />
        <Route path="context" element={<ContextInput />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="smart-todo-theme">
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <AppRoutes />
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

