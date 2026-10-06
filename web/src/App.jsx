import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
/*import Incidents from './pages/Incidents';
import Patrols from './pages/Patrols';
import WildlifeMap from './pages/WildlifeMap';
*/import Conflicts from './pages/Conflicts';
import CommunityReport from './pages/CommunityReport';
import Analytics from './pages/Analytics';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const Placeholder = ({ title }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
    <h2 className="text-xl font-bold text-stone-800">{title}</h2>
    <p className="text-sm text-stone-500 mt-2">
      This module is being developed by its respective team member.
    </p>
  </div>
);

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
            <Route path="incidents" element={<Placeholder title="🚨 Incidents (Member 1)" />} />
            <Route path="patrols" element={<Placeholder title="🥾 Patrols (Member 2)" />} />
            <Route path="map" element={<Placeholder title="🗺️ Wildlife Map (Member 4)" />} />
            <Route path="conflicts" element={<Conflicts />} />
            <Route path="alerts" element={<Placeholder title="🔔 Alerts (Member 4)" />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}