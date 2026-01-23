import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";



const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            // const response = await axios.post("http://112.133.196.79:8080/admin/login", {
            //     email, password
            // });

             const response = await axios.post("http://localhost:8080/admin/login", {
                email, password
            });

            // ✅ Check response.data.success explicitly
            if (response.data.success) {
                localStorage.setItem("user", JSON.stringify(response.data.user));


                // ✅ Handle missing roleName gracefully
                const role = response.data.user.roleName?.toLowerCase()?.replace(/\s+/g, "") || "guest";

                switch (role) {
                    case "superadmin":
                        navigate("/superadmin-dashboard");
                        break;
                    case "schooladmin":
                        navigate("/schooladmin-dashboard");
                        break;
                    case "teacher":
                        navigate("/teacher-dashboard");
                        break;
                    case "accounts":
                        navigate("/accounts-dashboard");
                        break;
                    default:
                        navigate("/");
                }
            } else {
                setError("Invalid email1 or password.");
            }
        } catch (err) {
            setError(err.response?.data?.error || "Login failed");
        }
    };

    return (
        <div>
           <div className="container-fluid vh-100">
  <div className="row h-100">
    {/* Left Side - Background color */}
    <div className="col-md-6 d-flex align-items-center justify-content-center bg-info bg-gradient text-white">
   
      <h2>Welcome to School Management System</h2>
    </div>

    {/* Right Side - Login Form */}
    <div className="col-md-6 d-flex align-items-center justify-content-center">
  <div className="card shadow" style={{ width: '80%', maxWidth: '400px'}}>
    <div className="card-body text-center">

      {/* Logo Centered */}
      <div className="d-flex justify-content-center mb-3">
        <img  src="/images/CES-logo.png"  alt="Logo" style={{ width: '70%', maxWidth: '250px' }} 
        />
      </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <form onSubmit={handleLogin}>
            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control"
                id="floatingInput"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="floatingInput">Email address</label>
            </div>

            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="floatingPassword"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="floatingPassword">Password</label>
            </div>

            <button type="submit" className="btn btn-primary w-100">Login</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>

        </div>
    );
};

export default Login;