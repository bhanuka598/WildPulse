import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
/*import Incidents from './pages/Incidents';
import Patrols from './pages/Patrols';
import WildlifeMap from './pages/WildlifeMap';
*/import Conflicts from './pages/Conflicts';/*
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';*/

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="patrols" element={<Patrols />} />
            <Route path="map" element={<WildlifeMap />} />
            <Route path="conflicts" element={<Conflicts />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}