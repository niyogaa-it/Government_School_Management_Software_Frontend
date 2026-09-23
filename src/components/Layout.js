import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppLayout.css";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="sms-root">
      {/* Fixed header — always visible on every page */}
      <Header
      
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      {/* Fixed sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Page content — pushed right of sidebar and below header */}
      <main className={`sms-main ${sidebarOpen ? "sms-main--open" : "sms-main--collapsed"}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
