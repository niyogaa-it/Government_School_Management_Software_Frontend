import React, { createContext, useContext, useState } from "react";

/* ── Academic year helpers ────────────────────────────────────────
   getCurrentAcademicYear():
     Jan – Mar  →  previous start year   e.g. Feb 2026 → "2025-2026"
     Apr – Dec  →  current year          e.g. Apr 2026 → "2026-2027"
─────────────────────────────────────────────────────────────────── */
export const getCurrentAcademicYear = () => {
  const now       = new Date();
  const month     = now.getMonth() + 1; // 1-12
  const year      = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

/* Fixed list — only 3 years shown in dropdown */
export const generateAcademicYears = () => [
  "2024-2025",
  "2025-2026",
  "2026-2027",
];

/* ── Context ───────────────────────────────────────────────────── */
const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [selectedSchool,     setSelectedSchool]     = useState("all");
  const [selectedSchoolName, setSelectedSchoolName] = useState("All Schools");
  const [selectedYear,       setSelectedYear]       = useState(getCurrentAcademicYear());

  return (
    <FilterContext.Provider value={{
      selectedSchool,     setSelectedSchool,
      selectedSchoolName, setSelectedSchoolName,
      selectedYear,       setSelectedYear,
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => useContext(FilterContext);
