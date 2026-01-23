import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Profile = () => {
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

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h2>Profile</h2>
                <p><strong>Name:</strong> {user?.name}</p>
                <p><strong>Role:</strong> {user?.roleName}</p>
                <p><strong>School:</strong> {user?.school?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Mobile:</strong> {user?.mobileNumber}</p>
            </div>
        </div>
    );
};

export default Profile;
