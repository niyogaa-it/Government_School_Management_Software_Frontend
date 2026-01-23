import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SIDEBAR_ITEMS = [
  { key: "admin", label: "Admin" },
  { key: "grade", label: "Grade" },
  { key: "role", label: "Role" },
  { key: "group", label: "Group" },
  { key: "section", label: "Section" },
  { key: "subject", label: "Subject" },
  { key: "applicationsslc", label: "SSLC Applications" },
  { key: "applicationhsc", label: "HSC Applications" },
  { key: "studentsslc", label: "SSLC Student Form" },
  { key: "studenthsc", label: "HSC Student Form" },
];;

const SidebarSettings = () => {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState({});

  // Fetch roles
  useEffect(() => {
    axios.get("http://localhost:8080/role/getAllRoles").then((res) => {
      setRoles(res.data.roles || []);
    });
  }, []);

  // Fetch permissions when role changes
  useEffect(() => {
    if (selectedRoleId) {
      const selected = roles.find((r) => r.id.toString() === selectedRoleId);
      setRoleName(selected?.roleOfUser || "");

      axios
        .get(`http://localhost:8080/sidebar-permissions/${selectedRoleId}`)
        .then((res) => {
          const map = {};
          if (Array.isArray(res.data.permissions)) {
            res.data.permissions.forEach((p) => {
              map[p.menuKey] = p.isVisible;
            });
          }
          setPermissions(map);
        })
        .catch((err) => {
          console.error("Error fetching permissions:", err);
          
        });
    }
    
  }, [selectedRoleId, roles]);

  const handleCheckboxChange = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = (event) => {
    event.preventDefault();
  
    if (!selectedRoleId) {
      alert("Please select a role first.");
      return;
    }
  
    const confirmation = window.confirm(
      `Are you sure you want to update the sidebar settings for role "${roleName}"?`
    );
    if (!confirmation) return;
  
    const payload = Object.keys(permissions).map((key) => ({
      menuKey: key,
      isVisible: permissions[key],
    }));
  
    axios
      .post(
        `http://localhost:8080/sidebar-permissions/${selectedRoleId}`,
        payload
      )
      .then(() => {
        alert("Sidebar permissions updated!");
        
      })
      .catch((error) => {
        console.error("Error setting permissions:", error);
        alert("Failed to update permissions.");
      });
  };
  

  return (
    <div className="container mt-5">
      <h3>Sidebar Permission Settings</h3>

      {/* Role Selector */}
      <div className="mb-4">
        <label><strong>Select Role:</strong></label>
        <select
          className="form-control"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
        >
          <option value="">-- Select a Role --</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.roleOfUser}
            </option>
          ))}
        </select>
      </div>

      {selectedRoleId && (
        <form onSubmit={handleSave}>
          {/* Sidebar Permissions */}
          <div className="mb-4">
            <label><strong>Sidebar Options:</strong></label>
            <div className="form-check">
              {SIDEBAR_ITEMS.map(({ key, label }) => (
                <div key={key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`check-${key}`}
                    checked={permissions[key] || false}
                    onChange={() => handleCheckboxChange(key)}
                  />
                  <label
                    className="form-check-label ms-2"
                    htmlFor={`check-${key}`}
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-success">
            Save Sidebar Settings
          </button>
        </form>
      )}
    </div>
  );
};

export default SidebarSettings;
