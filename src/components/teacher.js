import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Teacher = () => {
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
        localStorage.removeItem("user"); // Remove user data
        setTimeout(() => {
            navigate("/", { replace: true }); // ✅ Ensure navigation happens after state updates
            window.location.href = "/"; // ✅ Ensures a complete reload
        }, 100); // Small delay to let React update state
    };

    return (
        <div style={{ display: "flex" }}>
           <Sidebar onLogout={handleLogout} />
            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h1>Teacher Dashboard</h1>
                <h3>Welcome, {user?.name}</h3>
                <p>School: {user?.school?.name}</p>
            </div>
        </div>
    );
};

export default Teacher;