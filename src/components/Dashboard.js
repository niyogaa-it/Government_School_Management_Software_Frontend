import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar onLogout={handleLogout} />
            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h2>Dashboard</h2>
                <p>Welcome to the dashboard!</p>
            </div>
        </div>
    );
};

export default Dashboard;
