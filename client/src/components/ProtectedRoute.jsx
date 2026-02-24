import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Authenticating Presence...</p>
            </div>
        );
    }

    if (!user) {
        // Redirect to appropriate login based on intended destination
        if (location.pathname.startsWith('/admin')) {
            return <Navigate to="/admin/login" state={{ from: location }} replace />;
        }
        if (location.pathname.startsWith('/worker')) {
            return <Navigate to="/worker/login" state={{ from: location }} replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role not authorized - redirect to home or unauthorized page
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
