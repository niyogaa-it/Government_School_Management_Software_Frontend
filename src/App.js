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
import SubjectList from "./components/SubjectList";
import EditSubject from "./components/EditSubject";
import EditGrade from "./components/EditGrade";
import EditSchool from "./components/EditSchool";
import FeeCollectionList from "./components/Feecollectionlist";
import FeeStructure from "./components/feeStructure";
import StudentFeeCollection from "./components/StudentFeeCollection";
import RaiseFeeDemand from "./components/RaiseFeeDemand";
import Accounts from "./components/Accounts";
import TCStudentsList from "./components/TCStudentsList";
import TcHscStudentsList from "./components/TcHscStudentsList";
import Dashboard from "./components/Dashboard";
import StudentPromotion from "./components/StudentPromotion";
import { FilterProvider } from "./components/FilterContext";
import DailyFeeCollection from "./components/Dailyfeecollection";
import StudentBulkUpload from "./components/StudentBulkUpload";
import StudentPromotionHSC from "./components/StudentPromotionHSC";
import SSLCAttendance from "./components/SSLCAttendance";
import EventCalendar from "./components/EventCalendar";
import HSCAttendance from "./components/HSCAttendance";
import RaiseStudentDemand from "./components/RaiseStudentDemand";
import FeeDeamdList from "./components/FeeDemandList";
import FeeDemandList from "./components/FeeDemandList";
import EditFee from "./components/EditFee";
import CreateInstructor from "./components/CreateInstructor";
import InstructorList from "./components/InstructorList";
import EditInstructor from "./components/EditInstructor";
import StudyPlan from "./components/StudyPlan";
import StudyPlanList from "./components/StudyPlanList";
import TeacherAllocation from "./components/TeacherAllocation";
import TeacherAllocationList from "./components/TeacherAllocationList";
import TimeSlotModal from "./components/TimeSlotModal";
import NewTimeSet from "./components/NewTimeSet";
import ManageTimeSet from "./components/ManageTimeSet";
import TimeSetList from "./components/TimeSetList";
import NewWeekDays from "./components/NewWeekDays";
import WeekDaysList from "./components/WeekDaysList";
import EditTimeSet from "./components/EditTimeSet";
import EditWeekDays from "./components/EditWeekDays";
import TimeTableEntries from "./components/TimeTableEntries";
import TimeTableList from "./components/TimeTableList";

const App = () => {
  return (
    <Router>
      <FilterProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Profile Page - All Roles Can Access */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin", "teacher", "accounts"]} />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Superadmin Only */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
            <Route path="/superadmin-dashboard" element={<Superadmin />} />
            <Route path="/school-list" element={<SchoolList />} />
            <Route path="/create-school" element={<CreateSchool />} />
            <Route path="/edit-school/:id" element={<EditSchool />} />
            <Route path="/role" element={<RoleList />} />
            <Route path="/create-role" element={<CreateRole />} />
            <Route path="/Bulkupload" element={<StudentBulkUpload />} />
            <Route path="/admin" element={<AdminList />} />
            <Route path="/create-admin" element={<CreateAdmin />} />
           <Route path="/edit-timeset/:id" element={<EditTimeSet />} />
           <Route path="/edit-week-days/:id" element={<EditWeekDays/>} />
           <Route path="/timetableentry" element={<TimeTableEntries/>} />
           <Route path="/timetablelist" element={<TimeTableList/>} />
          </Route>

          {/* School Admin Only */}
          <Route element={<ProtectedRoute allowedRoles={["schooladmin"]} />}>
            <Route path="/schooladmin-dashboard" element={<Schooladmin />} />
          </Route>

          {/* Teacher Only */}
          <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher-dashboard" element={<Teacher />} />
          </Route>

          {/* Accounts Only */}
          <Route element={<ProtectedRoute allowedRoles={["accounts"]} />}>
            <Route path="/accounts-dashboard" element={<Accounts />} />
          </Route>

          {/* Superadmin & School Admin */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin"]} />}>
            <Route path="/grade" element={<GradeList />} />
            <Route path="/create-grade" element={<CreateGrade />} />
            <Route path="/group" element={<GroupList />} />
            <Route path="/create-group" element={<CreateGroup />} />
            <Route path="/edit-admin/:id" element={<EditAdmin />} />
            <Route path="/edit-section/:id" element={<EditSection />} />
            <Route path="/studentpromotion" element={<StudentPromotion />} />
            <Route path="/studentpromotionhsc" element={<StudentPromotionHSC />} />
            <Route path="/create-instructor" element={<CreateInstructor />} />
            <Route path="/instructorlist" element={<InstructorList />} />
            <Route path="/edit-instructor/:id" element={<EditInstructor />} />
            <Route path="/create-studyplan" element={<StudyPlan />} />
            <Route path="/studyplanlist" element={<StudyPlanList />} />
            <Route path="/create-section-subject-teacher-map" element={<TeacherAllocation />} />
            <Route path="/section-subject-teachermapped" element={<TeacherAllocationList />} />
            <Route path="/timeslot" element={<TimeSlotModal />} />
            <Route path="/timesetlist" element={<TimeSetList />} />
            <Route path="/new-time-set" element={<NewTimeSet />} />
            <Route path="/manage-time-set" element={<ManageTimeSet />} />
            <Route path="/new-week-days" element={<NewWeekDays />} />
            <Route path="/weekdayslist" element={<WeekDaysList />} />
            <Route path="/edit-time-set/:id" element={<EditTimeSet />} />
          </Route>

          {/* Superadmin, School Admin & Teacher */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin", "teacher"]} />}>
            <Route path="/section" element={<SectionList />} />
            <Route path="/create-section" element={<CreateSection />} />
            <Route path="/create-applicationsslc" element={<CreateApplicationsslc />} />
            <Route path="/create-applicationhsc" element={<CreateApplicationhsc />} />
            <Route path="/edit-applicationsslc/:id" element={<CreateApplicationsslc isEdit={true} />} />
            <Route path="/edit-applicationhsc/:id" element={<CreateApplicationhsc isEdit={true} />} />
            <Route path="/create-studentsslc" element={<CreateStudentsslc />} />
            <Route path="/create-subject" element={<CreateSubject />} />
            <Route path="/subject" element={<SubjectList />} />
            <Route path="/create-studenthsc" element={<CreateStudenthsc />} />
            <Route path="/edit-studentsslc/:id" element={<CreateStudentsslc isEdit={true} />} />
            <Route path="/edit-studenthsc/:id" element={<CreateStudenthsc isEdit={true} />} />
            <Route path="/edit-subject/:id" element={<EditSubject />} />
            <Route path="/edit-grade/:id" element={<EditGrade />} />
            <Route path="/sslcattendance" element={<SSLCAttendance />} />
            <Route path="/hscattendance" element={<HSCAttendance />} />
          </Route>

          {/* Students – Superadmin, Schooladmin, Teacher, Accounts */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin", "schooladmin", "teacher", "accounts"]} />}>
            <Route path="/applicationsslc" element={<ApplicationSSLCList />} />
            <Route path="/applicationhsc" element={<ApplicationHSCList />} />
            <Route path="/studentsslc" element={<StudentSSLCList />} />
            <Route path="/studenthsc" element={<StudentHSCList />} />
            <Route path="/eventcalendar" element={<EventCalendar />} />
            <Route path="/tcstudents" element={<TCStudentsList />} />
            <Route path="/tchscstudents" element={<TcHscStudentsList />} />
          </Route>

          {/* Accounts & Superadmin */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin", "accounts"]} />}>
            <Route path="/dailyfee" element={<DailyFeeCollection />} />
            <Route path="/raiseFeeDemand" element={<FeeStructure />} />
            <Route path="/feeDemand" element={<RaiseFeeDemand />} />
            <Route path="/feedemandlist" element={<FeeDemandList />} />
            <Route path="/raisestudentdemand" element={<RaiseStudentDemand />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FilterProvider>
    </Router>
  );
};

export default App;