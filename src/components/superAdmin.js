import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Superadmin = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser) {
            navigate("/");
        } else {
            setUser(storedUser);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("user"); 
        navigate("/login");
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar onLogout={handleLogout} />
            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h2>Welcome, {user?.name}</h2>
                <h3>Role: {user?.roleName}</h3>
                <h3>Email: {user?.email}</h3>
                <h3>Mobile: {user?.mobileNumber}</h3>
            </div>
        </div>
    );
};

export default Superadmin;
