import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar"; 

const Schooladmin = () => {
    const navigate = useNavigate();
    const [schoolName, setSchoolName] = useState("");

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        setSchoolName(user?.school?.name || "No School Assigned");
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user"); // Remove user data
        setTimeout(() => {
            navigate("/", { replace: true }); // ✅ Ensure navigation happens after state updates
            window.location.href = "/"; // ✅ Ensures a complete reload
        }, 100); // Small delay to let React update state
    };
    
    return (
        <div style={{ display: "flex" }}>
            {/* ✅ Sidebar Component */}
            <Sidebar onLogout={handleLogout} />  

            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h1>School Admin Dashboard</h1>
                <h3>School Name: {schoolName}</h3>

                <button 
                    onClick={handleLogout} 
                    style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Schooladmin;
