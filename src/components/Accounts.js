import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Accounts = () => {
    const navigate = useNavigate();
    const [schoolName, setSchoolName] = useState("");
    const [userName, setUserName] = useState("");

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        setSchoolName(user?.school?.name || "No School Assigned");
        setUserName(user?.name || "Accounts User");
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        setTimeout(() => {
            navigate("/", { replace: true });
            window.location.href = "/";
        }, 100);
    };

    return (
        <div style={{ display: "flex" }}>
            {/* Sidebar */}
            <Sidebar onLogout={handleLogout} />

            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h1>Accounts Dashboard</h1>
                <h3>School Name: {schoolName}</h3>
                <h4>Logged in as: {userName}</h4>

                <button
                    onClick={handleLogout}
                    style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Accounts;