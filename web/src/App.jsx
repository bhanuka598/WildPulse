import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatrolMonitoring from './pages/PatrolMonitoring';
import FieldIncidents from './pages/FieldIncidents';
import Conflicts from './pages/Conflicts';
import CommunityReport from './pages/CommunityReport';
import Analytics from './pages/Analytics';
import MonitoringDashboard from './pages/wildlife/MonitoringDashboard';
import AlertCenter from './pages/wildlife/AlertCenter';
import AlertDetail from './pages/wildlife/AlertDetail';
import SensorMonitoring from './pages/wildlife/SensorMonitoring';
import DispatchHistory from './pages/wildlife/DispatchHistory';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Community Report route */}
          <Route path="/report" element={<CommunityReport />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="incidents" element={<FieldIncidents />} />
            <Route path="patrols" element={<PatrolMonitoring />} />
            <Route path="map" element={<MonitoringDashboard />} />
            <Route path="wildlife-monitoring" element={<MonitoringDashboard />} />
            <Route path="conflicts" element={<Conflicts />} />
            <Route path="alerts" element={<AlertCenter />} />
            <Route path="alerts/:id" element={<AlertDetail />} />
            <Route path="wildlife-monitoring/alerts" element={<AlertCenter />} />
            <Route path="wildlife-monitoring/alerts/:id" element={<AlertDetail />} />
            <Route path="sensors" element={<SensorMonitoring />} />
            <Route path="wildlife-monitoring/sensors" element={<SensorMonitoring />} />
            <Route path="dispatches" element={<DispatchHistory />} />
            <Route path="wildlife-monitoring/dispatches" element={<DispatchHistory />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}