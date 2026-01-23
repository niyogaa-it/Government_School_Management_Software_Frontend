import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    FaBars, FaUser, FaSchool, FaUserShield, FaUserTag, FaSignOutAlt,
    FaChevronDown, FaChevronRight
} from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = ({ onLogout }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [showApplicationsSubMenu, setShowApplicationsSubMenu] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUserRole(storedUser.roleName.toLowerCase().replace(/\s+/g, ""));
        }
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
    };

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const toggleApplicationsMenu = () => {
        setShowApplicationsSubMenu(!showApplicationsSubMenu);
    };

    return (
        <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
            <div className="toggle-btn" onClick={toggleSidebar}>
                <FaBars />
            </div>

            <ul className="sidebar-menu">
                {/* Profile - Visible for All Except Superadmin */}
                {userRole !== "superadmin" && (
                    <li>
                        <Link to="/profile">
                            <FaUser /> <span className={isOpen ? "visible" : "hidden"}>Profile</span>
                        </Link>
                    </li>
                )}

                {userRole === "superadmin" && (
                    <li>
                        <Link to="/school-list">
                            <FaSchool /> <span className={isOpen ? "visible" : "hidden"}>School</span>
                        </Link>
                    </li>
                )}

                {(userRole === "superadmin" || userRole === "schooladmin") && (
                    <>
                        <li>
                            <Link to="/admin">
                                <FaUserShield /> <span className={isOpen ? "visible" : "hidden"}>Admin</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/role">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Roles</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/grade">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Grades</span>
                            </Link>
                        </li>
                    </>
                )}

                {(userRole === "superadmin" || userRole === "schooladmin" || userRole === "teacher" || userRole === "accounts") && (
                    <>
                        <li>
                            <Link to="/section">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Sections</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/group">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Groups</span>
                            </Link>
                        </li>
                    </>
                )}

                {/* Applications dropdown */}
                {(userRole === "superadmin" || userRole === "schooladmin" || userRole === "teacher") && (
                    <li className="dropdown">
                        <div onClick={toggleApplicationsMenu} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                            <FaUserTag />
                            <span className={isOpen ? "visible" : "hidden"} style={{ flexGrow: 1 }}>Applications</span>
                            {isOpen && (showApplicationsSubMenu ? <FaChevronDown /> : <FaChevronRight />)}
                        </div>
                        {showApplicationsSubMenu && isOpen && (
                            <ul className="submenu">
                                <li>
                                    <Link to="/applicationsslc">
                                        <span>SSLC</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/applicationhsc">
                                        <span>HSC</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>
                )}

                {/* Student dropdown */}
                {(userRole === "superadmin" || userRole === "schooladmin" || userRole === "teacher") && (
                    <li className="dropdown">
                        <div onClick={toggleApplicationsMenu} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                            <FaUserTag />
                            <span className={isOpen ? "visible" : "hidden"} style={{ flexGrow: 1 }}>Student Form</span>
                            {isOpen && (showApplicationsSubMenu ? <FaChevronDown /> : <FaChevronRight />)}
                        </div>
                        {showApplicationsSubMenu && isOpen && (
                            <ul className="submenu">
                                <li>
                                    <Link to="/studentsslc">
                                        <span>SSLC</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/studenthsc">
                                        <span>HSC</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>
                )}

                {(userRole === "superadmin" || userRole === "schooladmin" || userRole === "teacher" || userRole === "accounts") && (
                    <>
                        <li>
                            <Link to="/raise-fee-demand">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Raise Fee Demand</span>
                            </Link>
                        </li>
                        {/* <li>
                            <Link to="/create-subject">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Subject</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/create-teacher">
                                <FaUserTag /> <span className={isOpen ? "visible" : "hidden"}>Teacher</span>
                            </Link>
                        </li> */}
                    </>
                )}

                {/* Logout Button */}
                <li className="logout">
                    <button
                        onClick={handleLogout}
                        style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                        <FaSignOutAlt />
                        <span className={isOpen ? "visible" : "hidden"}>Logout</span>
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
