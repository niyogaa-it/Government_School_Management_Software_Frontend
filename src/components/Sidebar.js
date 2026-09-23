import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaUser, FaSchool, FaUserShield, FaUserTag, FaSignOutAlt,
  FaChevronDown, FaChevronUp, FaChevronLeft,
  FaFileAlt, FaGraduationCap, FaMoneyBillWave, FaCalendarAlt,
  FaUpload, FaTachometerAlt, FaLayerGroup, FaBookOpen,
  FaChalkboardTeacher, FaClock
} from "react-icons/fa";

// ─── Rani Lady Meyyammai HR Secondary School detection ───────────────────────
// Applications menu is normally hidden from "accounts", but for RLMHSS
// specifically, accounts staff also need access to it.
const RLMHSS_SHORTCODE = "RLMHSS";
const isRLMHSSSchool = (school) => {
  const shortcode = (school?.shortcode || "").toUpperCase().trim();
  const name = (school?.name || "").toUpperCase().trim();
  return shortcode === RLMHSS_SHORTCODE || name.includes("RANI LADY") || name.includes("MEYYAMMAI");
};

// ─── Role-based visibility matrix ────────────────────────────────────────────
//
//  Item               superadmin  schooladmin  teacher  accounts
//  ─────────────────────────────────────────────────────────────
//  Dashboard               ✓           ✓          ✓        ✓
//  School                  ✓           ✗          ✗        ✗
//  Roles                   ✓           ✗          ✗        ✗
//  Bulk Upload             ✓           ✗          ✗        ✗
//  Admin                   ✓           ✗          ✗        ✗
//  Grades                  ✓           ✓          ✗        ✗
//  Event Calendar          ✓           ✓          ✓        ✓
//  Sections                ✓           ✓          ✗        ✗
//  Subjects                ✓           ✓          ✗        ✗
//  Applications            ✓           ✓          ✗    ✓ (RLMHSS only)
//  Manage Students         ✓           ✓          ✓        ✓
//  Attendance              ✓           ✓          ✓        ✗
//  TC List                 ✓           ✓          ✗        ✓
//  Annual Fee              ✓           ✗          ✓        ✓
//  Daily Fee               ✓           ✗          ✓        ✓
//  Fee Demand              ✓           ✗          ✓        ✓
//  Profile                 ✗           ✓          ✓        ✓
// ─────────────────────────────────────────────────────────────────────────────

const Sidebar = ({ isOpen }) => {
  const [userRole, setUserRole] = useState(null);
  const [userSchool, setUserSchool] = useState(null);
  const [openMenus, setOpenMenus] = useState({});
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setUserRole(user.roleName.toLowerCase().replace(/\s+/g, ""));
      setUserSchool(user.school || null);
    }
  }, [location.pathname]);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, isOpen, userRole]);

  const scrollBy = (dir) => {
    navRef.current?.scrollBy({ top: dir * 120, behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const toggle = (key) => setOpenMenus(p => ({ ...p, [key]: !p[key] }));
  const isActive = (path) => location.pathname === path;
  const isGroupActive = (...paths) => paths.some(p => location.pathname.startsWith(p));

  // Role helpers
  const is = (...roles) => roles.includes(userRole);

  // Accounts role gets Applications ONLY for RLMHSS
  const canSeeApplications = is("superadmin", "schooladmin") || (is("accounts") && isRLMHSSSchool(userSchool));

  // ── Single nav link ──────────────────────────────────
  const Item = ({ to, icon, label, title }) => (
    <Link
      to={to}
      className={`sms-sb-item${isActive(to) ? " sms-sb-item--active" : ""}`}
      title={!isOpen ? title || label : ""}
    >
      <span className="sms-sb-icon">{icon}</span>
      <span className="sms-sb-label">{label}</span>
    </Link>
  );

  // ── Collapsible parent item ──────────────────────────
  const ParentItem = ({ menuKey, icon, label, paths = [], children }) => {
    const open = openMenus[menuKey];
    const groupActive = isGroupActive(...paths);
    return (
      <div>
        <button
          className={`sms-sb-item sms-sb-item--parent${groupActive ? " sms-sb-item--active" : ""}`}
          onClick={() => toggle(menuKey)}
          title={!isOpen ? label : ""}
        >
          <span className="sms-sb-icon">{icon}</span>
          <span className="sms-sb-label">{label}</span>
          <span className={`sms-sb-chevron${open ? " sms-sb-chevron--open" : ""}`}>
            <FaChevronDown />
          </span>
        </button>
        {open && isOpen && <div className="sms-sb-submenu">{children}</div>}
      </div>
    );
  };

  // ── Submenu link ─────────────────────────────────────
  const Sub = ({ to, label }) => (
    <Link
      to={to}
      className={`sms-sb-subitem${isActive(to) ? " sms-sb-subitem--active" : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <aside className={`sms-sidebar ${isOpen ? "sms-sidebar--open" : "sms-sidebar--closed"}`}>

      {/* ── Scroll UP arrow ── */}
      {isOpen && (
        <button
          className={`sms-sb-scroll-btn${canScrollUp ? "" : " sms-sb-scroll-btn--hidden"}`}
          onClick={() => scrollBy(-1)}
          aria-label="Scroll up"
        >
          <FaChevronUp />
        </button>
      )}

      {/* ── Nav list ── */}
      <nav className="sms-sb-nav" ref={navRef}>

        {/* ── Dashboard — all roles ── */}
        {is("superadmin", "schooladmin", "teacher", "accounts") && (
          <Item to="/dashboard" icon={<FaTachometerAlt />} label="Dashboard" />
        )}

        {/* ── School, Roles, Bulk Upload, Admin — superadmin only ── */}
        {is("superadmin") && (<>
          <Item to="/school-list" icon={<FaSchool />} label="School" />
          <Item to="/role" icon={<FaUserTag />} label="Roles" />
          <Item to="/Bulkupload" icon={<FaUpload />} label="Bulk Upload" />
          <Item to="/admin" icon={<FaUserShield />} label="Admin" />
        </>)}

        {/* ── Grades — superadmin, schooladmin (NOT accounts) ── */}
        {is("superadmin", "schooladmin") && (
          <Item to="/grade" icon={<FaLayerGroup />} label="Grades" />
        )}

        {/* ── Event Calendar — all roles ── */}
        {is("superadmin", "schooladmin", "teacher", "accounts") && (
          <Item to="/eventcalendar" icon={<FaCalendarAlt />} label="Event Calendar" />
        )}

        {/* ── Sections, Subjects — superadmin, schooladmin (NOT accounts) ── */}
        {is("superadmin", "schooladmin") && (<>
          <Item to="/section" icon={<FaBookOpen />} label="Sections" />
          <Item to="/subject" icon={<FaGraduationCap />} label="Subjects" />
        </>)}

        {/* ── Applications — superadmin, schooladmin, and accounts ONLY for RLMHSS ── */}
        {canSeeApplications && (
          <ParentItem
            menuKey="apps"
            icon={<FaFileAlt />}
            label="Applications"
            paths={["/applicationsslc", "/applicationhsc"]}
          >
            <Sub to="/applicationsslc" label="SSLC" />
            <Sub to="/applicationhsc" label="HSC" />
          </ParentItem>
        )}

        {/* ── Manage Students — all roles ── */}
        {is("superadmin", "schooladmin", "teacher", "accounts") && (
          <ParentItem
            menuKey="students"
            icon={<FaUser />}
            label="Manage Students"
            paths={["/studentsslc", "/studenthsc"]}
          >
            <Sub to="/studentsslc" label="SSLC" />
            <Sub to="/studenthsc" label="HSC" />
          </ParentItem>
        )}

        {/* ── Attendance — superadmin, schooladmin, teacher (NOT accounts) ── */}
        {is("superadmin", "schooladmin", "teacher") && (
          <ParentItem
            menuKey="attendance"
            icon={<FaCalendarAlt />}
            label="Attendance"
            paths={["/sslcattendance", "/hscattendance"]}
          >
            <Sub to="/sslcattendance" label="SSLC" />
            <Sub to="/hscattendance" label="HSC" />
          </ParentItem>
        )}

        {/* ── TC List — superadmin, schooladmin, accounts ── */}
        {is("superadmin", "schooladmin", "accounts") && (
          <ParentItem
            menuKey="tc"
            icon={<FaFileAlt />}
            label="TC List"
            paths={["/tcstudents", "/tchscstudents"]}
          >
            <Sub to="/tcstudents" label="SSLC" />
            <Sub to="/tchscstudents" label="HSC" />
          </ParentItem>
        )}

        {/* ── Instructor — superadmin, schooladmin ── */}
        {is("superadmin", "schooladmin") && (
          <Item to="/instructorlist" icon={<FaLayerGroup />} label="Instructors List" />
        )}

        {/* ── Instructor — superadmin, schooladmin ── */}
        {is("superadmin", "schooladmin") && (
          <Item to="/studyplanlist" icon={<FaBookOpen />} label="Plan of Study" />
        )}

        {/* ── Instructor — superadmin, schooladmin ── */}
        {is("superadmin", "schooladmin") && (
          <Item to="/section-subject-teachermapped" icon={<FaBookOpen />} label="Instructor Subject Map" />
        )}

 {/* ── Time Management — superadmin, schooladmin, accounts ── */}
        {is("superadmin", "schooladmin") && (
          <ParentItem
            menuKey="timemanagement"
            icon={<FaClock />}
            label="Time Management"
            paths={["/timesetlist", "/weekdayslist", "/timetablelist"]}
          >
            <Sub to="/timesetlist" label="Time Set" />
            <Sub to="/weekdayslist" label="Week Days" />
            <Sub to="/timetablelist" label="TimeTable" />
          </ParentItem>
        )}

        {/* ── Fee Management — superadmin, teacher, accounts (NOT schooladmin) ── */}
        {is("superadmin", "teacher", "accounts") && (<>
          <Item to="/raiseFeeDemand" icon={<FaCalendarAlt />} label="Annual Fee" />
          <Item to="/dailyfee" icon={<FaMoneyBillWave />} label="Daily Fee" />
          <ParentItem
            menuKey="feeDemand"
            icon={<FaMoneyBillWave />}
            label="Fee Demand"
            paths={["/feedemandlist", "/raisestudentdemand"]}
          >
            <Sub to="/raisestudentdemand" label="Raise Demand" />
            <Sub to="/feedemandlist" label="View Demand" />
          </ParentItem>
        </>)}

        {/* ── Profile — non-superadmin ── */}
        {!is("superadmin") && (
          <Item to="/profile" icon={<FaUser />} label="Profile" />
        )}

      </nav>

      {/* ── Scroll DOWN arrow ── */}
      {isOpen && (
        <button
          className={`sms-sb-scroll-btn sms-sb-scroll-btn--bottom${canScrollDown ? "" : " sms-sb-scroll-btn--hidden"}`}
          onClick={() => scrollBy(1)}
          aria-label="Scroll down"
        >
          <FaChevronDown />
        </button>
      )}

      {/* ── Logout ── */}
      <div className="sms-sb-footer">
        <button
          className="sms-sb-logout"
          onClick={handleLogout}
          title={!isOpen ? "Logout" : ""}
        >
          <span className="sms-sb-icon"><FaSignOutAlt /></span>
          <span className="sms-sb-label">Logout</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { Link, useNavigate, useLocation } from "react-router-dom";
// import {
//   FaUser, FaSchool, FaUserShield, FaUserTag, FaSignOutAlt,
//   FaChevronDown, FaChevronUp, FaChevronLeft,
//   FaFileAlt, FaGraduationCap, FaMoneyBillWave, FaCalendarAlt,
//   FaUpload, FaTachometerAlt, FaLayerGroup, FaBookOpen,
//   FaChalkboardTeacher, FaClock,
// } from "react-icons/fa";

// // ─── Role-based visibility matrix ────────────────────────────────────────────
// //
// //  Item               superadmin  schooladmin  teacher  accounts
// //  ─────────────────────────────────────────────────────────────
// //  Dashboard               ✓           ✓          ✓        ✓
// //  School                  ✓           ✗          ✗        ✗
// //  Roles                   ✓           ✗          ✗        ✗
// //  Bulk Upload             ✓           ✗          ✗        ✗
// //  Admin                   ✓           ✗          ✗        ✗
// //  Grades                  ✓           ✓          ✗        ✗
// //  Event Calendar          ✓           ✓          ✓        ✓
// //  Sections                ✓           ✓          ✗        ✗
// //  Subjects                ✓           ✓          ✗        ✗
// //  Applications            ✓           ✓          ✗        ✗
// //  Manage Students         ✓           ✓          ✓        ✓
// //  Attendance              ✓           ✓          ✓        ✗
// //  TC List                 ✓           ✓          ✗        ✓
// //  Annual Fee              ✓           ✗          ✓        ✓
// //  Daily Fee               ✓           ✗          ✓        ✓
// //  Fee Demand              ✓           ✗          ✓        ✓
// //  Profile                 ✗           ✓          ✓        ✓
// // ─────────────────────────────────────────────────────────────────────────────

// const Sidebar = ({ isOpen }) => {
//   const [userRole, setUserRole] = useState(null);
//   const [openMenus, setOpenMenus] = useState({});
//   const [canScrollUp, setCanScrollUp] = useState(false);
//   const [canScrollDown, setCanScrollDown] = useState(false);
//   const navRef = useRef(null);
//   const navigate = useNavigate();
//   const location = useLocation();

//   useEffect(() => {
//     const user = JSON.parse(localStorage.getItem("user"));
//     if (user) setUserRole(user.roleName.toLowerCase().replace(/\s+/g, ""));
//   }, [location.pathname]);

//   const checkScroll = useCallback(() => {
//     const el = navRef.current;
//     if (!el) return;
//     setCanScrollUp(el.scrollTop > 4);
//     setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
//   }, []);

//   useEffect(() => {
//     const el = navRef.current;
//     if (!el) return;
//     checkScroll();
//     el.addEventListener("scroll", checkScroll);
//     window.addEventListener("resize", checkScroll);
//     return () => {
//       el.removeEventListener("scroll", checkScroll);
//       window.removeEventListener("resize", checkScroll);
//     };
//   }, [checkScroll, isOpen, userRole]);

//   const scrollBy = (dir) => {
//     navRef.current?.scrollBy({ top: dir * 120, behavior: "smooth" });
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("user");
//     localStorage.removeItem("token");
//     navigate("/login");
//   };

//   const toggle = (key) => setOpenMenus(p => ({ ...p, [key]: !p[key] }));
//   const isActive = (path) => location.pathname === path;
//   const isGroupActive = (...paths) => paths.some(p => location.pathname.startsWith(p));

//   // Role helpers
//   const is = (...roles) => roles.includes(userRole);

//   // ── Single nav link ──────────────────────────────────
//   const Item = ({ to, icon, label, title }) => (
//     <Link
//       to={to}
//       className={`sms-sb-item${isActive(to) ? " sms-sb-item--active" : ""}`}
//       title={!isOpen ? title || label : ""}
//     >
//       <span className="sms-sb-icon">{icon}</span>
//       <span className="sms-sb-label">{label}</span>
//     </Link>
//   );

//   // ── Collapsible parent item ──────────────────────────
//   const ParentItem = ({ menuKey, icon, label, paths = [], children }) => {
//     const open = openMenus[menuKey];
//     const groupActive = isGroupActive(...paths);
//     return (
//       <div>
//         <button
//           className={`sms-sb-item sms-sb-item--parent${groupActive ? " sms-sb-item--active" : ""}`}
//           onClick={() => toggle(menuKey)}
//           title={!isOpen ? label : ""}
//         >
//           <span className="sms-sb-icon">{icon}</span>
//           <span className="sms-sb-label">{label}</span>
//           <span className={`sms-sb-chevron${open ? " sms-sb-chevron--open" : ""}`}>
//             <FaChevronDown />
//           </span>
//         </button>
//         {open && isOpen && <div className="sms-sb-submenu">{children}</div>}
//       </div>
//     );
//   };

//   // ── Submenu link ─────────────────────────────────────
//   const Sub = ({ to, label }) => (
//     <Link
//       to={to}
//       className={`sms-sb-subitem${isActive(to) ? " sms-sb-subitem--active" : ""}`}
//     >
//       {label}
//     </Link>
//   );

//   return (
//     <aside className={`sms-sidebar ${isOpen ? "sms-sidebar--open" : "sms-sidebar--closed"}`}>

//       {/* ── Scroll UP arrow ── */}
//       {isOpen && (
//         <button
//           className={`sms-sb-scroll-btn${canScrollUp ? "" : " sms-sb-scroll-btn--hidden"}`}
//           onClick={() => scrollBy(-1)}
//           aria-label="Scroll up"
//         >
//           <FaChevronUp />
//         </button>
//       )}

//       {/* ── Nav list ── */}
//       <nav className="sms-sb-nav" ref={navRef}>

//         {/* ── Dashboard — all roles ── */}
//         {is("superadmin", "schooladmin", "teacher", "accounts") && (
//           <Item to="/dashboard" icon={<FaTachometerAlt />} label="Dashboard" />
//         )}

//         {/* ── School, Roles, Bulk Upload, Admin — superadmin only ── */}
//         {is("superadmin") && (<>
//           <Item to="/school-list" icon={<FaSchool />} label="School" />
//           <Item to="/role" icon={<FaUserTag />} label="Roles" />
//           <Item to="/Bulkupload" icon={<FaUpload />} label="Bulk Upload" />
//           <Item to="/admin" icon={<FaUserShield />} label="Admin" />
//         </>)}

//         {/* ── Grades — superadmin, schooladmin (NOT accounts) ── */}
//         {is("superadmin", "schooladmin") && (
//           <Item to="/grade" icon={<FaLayerGroup />} label="Grades" />
//         )}

//         {/* ── Event Calendar — all roles ── */}
//         {is("superadmin", "schooladmin", "teacher", "accounts") && (
//           <Item to="/eventcalendar" icon={<FaCalendarAlt />} label="Event Calendar" />
//         )}

//         {/* ── Sections, Subjects — superadmin, schooladmin (NOT accounts) ── */}
//         {is("superadmin", "schooladmin") && (<>
//           <Item to="/section" icon={<FaBookOpen />} label="Sections" />
//           <Item to="/subject" icon={<FaGraduationCap />} label="Subjects" />
//         </>)}

//         {/* ── Applications — superadmin, schooladmin (NOT accounts) ── */}
//         {is("superadmin", "schooladmin") && (
//           <ParentItem
//             menuKey="apps"
//             icon={<FaFileAlt />}
//             label="Applications"
//             paths={["/applicationsslc", "/applicationhsc"]}
//           >
//             <Sub to="/applicationsslc" label="SSLC" />
//             <Sub to="/applicationhsc" label="HSC" />
//           </ParentItem>
//         )}

//         {/* ── Manage Students — all roles ── */}
//         {is("superadmin", "schooladmin", "teacher", "accounts") && (
//           <ParentItem
//             menuKey="students"
//             icon={<FaUser />}
//             label="Manage Students"
//             paths={["/studentsslc", "/studenthsc"]}
//           >
//             <Sub to="/studentsslc" label="SSLC" />
//             <Sub to="/studenthsc" label="HSC" />
//           </ParentItem>
//         )}

//         {/* ── Attendance — superadmin, schooladmin, teacher (NOT accounts) ── */}
//         {is("superadmin", "schooladmin", "teacher") && (
//           <ParentItem
//             menuKey="attendance"
//             icon={<FaCalendarAlt />}
//             label="Attendance"
//             paths={["/sslcattendance", "/hscattendance"]}
//           >
//             <Sub to="/sslcattendance" label="SSLC" />
//             <Sub to="/hscattendance" label="HSC" />
//           </ParentItem>
//         )}

//         {/* ── TC List — superadmin, schooladmin, accounts ── */}
//         {is("superadmin", "schooladmin", "accounts") && (
//           <ParentItem
//             menuKey="tc"
//             icon={<FaFileAlt />}
//             label="TC List"
//             paths={["/tcstudents", "/tchscstudents"]}
//           >
//             <Sub to="/tcstudents" label="SSLC" />
//             <Sub to="/tchscstudents" label="HSC" />
//           </ParentItem>
//         )}

//         {/* ── Fee Management — superadmin, teacher, accounts (NOT schooladmin) ── */}
//         {is("superadmin", "teacher", "accounts") && (<>
//           <Item to="/raiseFeeDemand" icon={<FaCalendarAlt />} label="Annual Fee" />
//           <Item to="/dailyfee" icon={<FaMoneyBillWave />} label="Daily Fee" />
//           <ParentItem
//             menuKey="feeDemand"
//             icon={<FaMoneyBillWave />}
//             label="Fee Demand"
//             paths={["/feedemandlist", "/raisestudentdemand"]}
//           >
//             <Sub to="/raisestudentdemand" label="Raise Demand" />
//             <Sub to="/feedemandlist" label="View Demand" />
//           </ParentItem>
//         </>)}

//         {/* ── Profile — non-superadmin ── */}
//         {!is("superadmin") && (
//           <Item to="/profile" icon={<FaUser />} label="Profile" />
//         )}

//       </nav>

//       {/* ── Scroll DOWN arrow ── */}
//       {isOpen && (
//         <button
//           className={`sms-sb-scroll-btn sms-sb-scroll-btn--bottom${canScrollDown ? "" : " sms-sb-scroll-btn--hidden"}`}
//           onClick={() => scrollBy(1)}
//           aria-label="Scroll down"
//         >
//           <FaChevronDown />
//         </button>
//       )}

//       {/* ── Logout ── */}
//       <div className="sms-sb-footer">
//         <button
//           className="sms-sb-logout"
//           onClick={handleLogout}
//           title={!isOpen ? "Logout" : ""}
//         >
//           <span className="sms-sb-icon"><FaSignOutAlt /></span>
//           <span className="sms-sb-label">Logout</span>
//         </button>
//       </div>

//     </aside>
//   );
// };

// export default Sidebar;