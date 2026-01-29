import React from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/login";
import Superadmin from "./components/superAdmin";
import Schooladmin from "./components/schoolAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateSchool from "./components/CreateSchool";
import CreateRole from "./components/CreateRole";
import CreateAdmin from "./components/CreateAdmin";
import Profile from "./components/Profile";
import AdminList from "./components/AdminList";
import RoleList from "./components/RoleList";
import SchoolList from "./components/SchoolList";
import CreateGrade from "./components/CreateGrade";
import GradeList from "./components/GradeList";
import SectionList from "./components/SectionList";
import CreateSection from "./components/CreateSection";
import Teacher from "./components/teacher";
import ApplicationSSLCList from "./components/ApplicationSSLCList";
import CreateApplicationsslc from "./components/CreateApplicationSSLC";
import ApplicationHSCList from "./components/ApplicationHSCList";
import CreateApplicationhsc from "./components/CreateApplicationHSC";
import GroupList from "./components/GroupList";
import CreateGroup from "./components/CreateGroup";
import StudentSSLCList from "./components/StudentAppSSLCList";
import CreateStudentsslc from "./components/CreateStudentSSLC";
import CreateSubject from "./components/CreateSubject";
import StudentHSCList from "./components/StudentAppHSCList";
import CreateStudenthsc from "./components/CreateStudentHSC";
import EditAdmin from "./components/EditAdmin";
import EditSection from "./components/EditSection";


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Profile Page - All Roles Can Access */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin", "teacher", "coordinator"]} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Superadmin Dashboard */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route path="/superadmin-dashboard" element={<Superadmin />} />
          <Route path="/school-list" element={<SchoolList />} />
          <Route path="/create-school" element={<CreateSchool />} />
        </Route>

        {/* School Admin Dashboard */}
        <Route element={<ProtectedRoute allowedRoles={["schooladmin"]} />}>
          <Route path="/schooladmin-dashboard" element={<Schooladmin />} />
        </Route>

        {/* Teacher Dashboard */}
        <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
          <Route path="/teacher-dashboard" element={<Teacher />} />
        </Route>

        {/* Admin List & Role List - Superadmin & School Admin Only */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin"]} />}>
          <Route path="/admin" element={<AdminList />} />
          <Route path="/create-admin" element={<CreateAdmin />} />
          <Route path="/role" element={<RoleList />} />
          <Route path="/create-role" element={<CreateRole />} />
          <Route path="/grade" element={<GradeList />} />
          <Route path="/create-grade" element={<CreateGrade />} />
          <Route path="/group" element={<GroupList />} />
          <Route path="/create-group" element={<CreateGroup />} />
          <Route path="/edit-admin/:id" element={<EditAdmin />} />
          <Route path="/edit-section/:id" element={<EditSection />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin", "teacher"]} />}>
          <Route path="/section" element={<SectionList />} />
          <Route path="/create-section" element={<CreateSection />} />
          <Route path="/applicationsslc" element={<ApplicationSSLCList />} />
          <Route path="/create-applicationsslc" element={<CreateApplicationsslc />} />
          <Route path="/applicationhsc" element={<ApplicationHSCList />} />
          <Route path="/create-applicationhsc" element={<CreateApplicationhsc />} />
          <Route path="/edit-applicationsslc/:id" element={<CreateApplicationsslc isEdit={true} />} />
          <Route path="/edit-applicationhsc/:id" element={<CreateApplicationhsc isEdit={true} />} />
          <Route path="/studentsslc" element={<StudentSSLCList />} />
          <Route path="/create-studentsslc" element={<CreateStudentsslc />} />
          <Route path="/create-subject" element={<CreateSubject />} />
          <Route path="/studenthsc" element={<StudentHSCList />} />
          <Route path="/create-studenthsc" element={<CreateStudenthsc />} />
          <Route path="/edit-studentsslc/:id" element={<CreateStudentsslc isEdit={true} />} />
          <Route path="/edit-studenthsc/:id" element={<CreateStudenthsc isEdit={true} />} />
        </Route>


        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
