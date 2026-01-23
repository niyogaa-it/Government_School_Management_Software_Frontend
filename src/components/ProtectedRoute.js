import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem("user"));
    
    if (!user) {
        console.log("No user found - redirecting to login");
        return <Navigate to="/" replace />;
    }

    const userRole = user.roleName?.toLowerCase().replace(/\s+/g, "") || "guest";
    const isAllowed = allowedRoles.includes(userRole);

    console.log(`Access check - 
        Path: ${window.location.pathname}
        User Role: ${userRole}
        Allowed Roles: ${allowedRoles}
        Access ${isAllowed ? "Granted" : "Denied"}`);

    return isAllowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
