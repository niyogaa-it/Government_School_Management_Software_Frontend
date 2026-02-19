// import React, { useEffect, useState } from "react";
// import { Modal, Select, Button, Table, message } from "antd";
// import axios from "axios";

// const { Option } = Select;

// const PromoteStudentModal = ({ open, onClose, schoolId }) => {
//     /* =======================
//        STATE
//     ======================= */
//     const [grades, setGrades] = useState([]);
//     const [fromSections, setFromSections] = useState([]);
//     const [toSections, setToSections] = useState([]);

//     const [students, setStudents] = useState([]);
//     const [selectedStudentIds, setSelectedStudentIds] = useState([]);

//     const [from, setFrom] = useState({
//         academicYear: "",
//         grade_id: null,
//         section_id: null,
//     });

//     const [to, setTo] = useState({
//         academicYear: "",
//         grade_id: null,
//         section_id: null,
//     });

//     useEffect(() => {
//         if (open && schoolId !== undefined && schoolId !== null) {
//             fetchGrades();
//             resetState();
//         }
//     }, [open, schoolId]);

//     /* =======================
//        FETCH GRADES (ON OPEN)
//     ======================= */
//     useEffect(() => {
//         if (open && schoolId) {
//             fetchGrades();
//             resetState();
//         }
//     }, [open, schoolId]);

//     const resetState = () => {
//         setStudents([]);
//         setSelectedStudentIds([]);
//         setFromSections([]);
//         setToSections([]);
//         setFrom({ academicYear: "", grade_id: null, section_id: null });
//         setTo({ academicYear: "", grade_id: null, section_id: null });
//     };

//     // FETCH GRADES (academicYear REQUIRED)
//     const fetchGrades = async (academicYear) => {
//         if (!academicYear || !schoolId) return;

//         try {
//             const res = await axios.get(
//                 `${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${schoolId}`,
//                 { params: { academicYear } }
//             );
//             setGrades(res.data.grades || []);
//         } catch {
//             message.error("Failed to load grades");
//         }
//     };

//     // FETCH SECTIONS
//     const fetchSections = async (gradeId, academicYear, type) => {
//         if (!schoolId || !academicYear || !gradeId) return;

//         try {
//             const res = await axios.get(
//                 "${process.env.REACT_APP_API_URL}/section/getSectionsByFilter",
//                 {
//                     params: { school_id: schoolId, academicYear, grade_id: gradeId }
//                 }
//             );

//             type === "from"
//                 ? setFromSections(res.data.sections || [])
//                 : setToSections(res.data.sections || []);
//         } catch {
//             message.error("Failed to load sections");
//         }
//     };


//     /* =======================
//        FETCH STUDENTS
//     ======================= */
//     const fetchStudents = async () => {
//         if (!from.academicYear || !from.grade_id || !from.section_id) {
//             return message.warning("Select Academic Year, Grade & Section");
//         }

//         try {
//             const res = await axios.get(
//                 "${process.env.REACT_APP_API_URL}/studentsslc/getStudentsByFilter",
//                 {
//                     params: {
//                         school_id: schoolId,
//                         academicYear: from.academicYear,
//                         grade_id: from.grade_id,
//                         section_id: from.section_id
//                     }
//                 }
//             );

//             setStudents(res.data.students || []);

//         } catch {
//             message.error("Failed to fetch students");
//         }
//     };

//     /* =======================
//        PROMOTE STUDENTS
//     ======================= */
//     const promoteStudents = async () => {
//         if (selectedStudentIds.length === 0) {
//             return message.warning("Select at least one student");
//         }

//         if (!to.academicYear || !to.grade_id || !to.section_id) {
//             return message.warning("Select Promote-To details");
//         }

//         try {
//             await axios.post(
//                 "${process.env.REACT_APP_API_URL}/promotestudent/promoteStudents",
//                 {
//                     studentIds: selectedStudentIds,
//                     toAcademicYear: to.academicYear,
//                     toGradeId: to.grade_id,
//                     toSectionId: to.section_id,
//                 }
//             );

//             message.success("Students promoted successfully");
//             onClose();
//         } catch {
//             message.error("Promotion failed");
//         }
//     };

//     /* =======================
//        TABLE COLUMNS
//     ======================= */
//     const columns = [
//         { title: "Name", dataIndex: "name" },
//         { title: "Admission No", dataIndex: "admissionNumber" },
//         { title: "Father Name", dataIndex: "fatherName" },
//     ];

//     /* =======================
//        RENDER
//     ======================= */
//     return (
//         <Modal
//             title="Promote Students"
//             open={open}
//             onCancel={onClose}
//             width={1000}
//             footer={null}
//         >
//             {/* FROM SECTION */}
//             <h4>From</h4>
//             <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
//                 <Select
//                     placeholder="Academic Year"
//                     style={{ width: 160 }}
//                     value={from.academicYear}
//                     onChange={(v) => {
//                         setFrom({ academicYear: v, grade_id: null, section_id: null });
//                         setGrades([]);
//                         setFromSections([]);
//                         fetchGrades(v);
//                     }}
//                 >

//                     <Option value="2024-2025">2024-2025</Option>
//                     <Option value="2025-2026">2025-2026</Option>
//                 </Select>

//                 <Select
//                     placeholder="Grade"
//                     value={from.grade_id}
//                     onChange={(v) => {
//                         setFrom({ ...from, grade_id: v, section_id: null });
//                         fetchSections(v, from.academicYear, "from");
//                     }}
//                 >

//                     {grades.map((g) => (
//                         <Option key={g.id} value={g.id}>
//                             {g.grade}
//                         </Option>
//                     ))}
//                 </Select>

//                 <Select
//                     placeholder="Section"
//                     value={from.section_id}
//                     onChange={(v) => setFrom({ ...from, section_id: v })}
//                 >


//                     {fromSections.map((s) => (
//                         <Option key={s.id} value={s.id}>
//                             {s.sectionName}
//                         </Option>
//                     ))}
//                 </Select>

//                 <Button type="primary" onClick={fetchStudents}>
//                     Search
//                 </Button>
//             </div>

//             {/* TO SECTION */}
//             <h4>Promote To</h4>
//             <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
//                 <Select
//                     placeholder="Academic Year"
//                     value={to.academicYear}
//                     onChange={(v) => {
//                         setTo({ academicYear: v, grade_id: null, section_id: null });
//                         setGrades([]);
//                         setToSections([]);
//                         fetchGrades(v);
//                     }}
//                 >

//                     <Option value="2025-2026">2025-2026</Option>
//                     <Option value="2026-2027">2026-2027</Option>
//                 </Select>

//                 <Select
//                     placeholder="Grade"
//                     value={to.grade_id}
//                     onChange={(v) => {
//                         setTo({ ...to, grade_id: v, section_id: null });
//                         fetchSections(v, to.academicYear, "to");
//                     }}
//                 >

//                     {grades.map((g) => (
//                         <Option key={g.id} value={g.id}>
//                             {g.grade}
//                         </Option>
//                     ))}
//                 </Select>

//                 <Select
//                     placeholder="Section"
//                     style={{ width: 160 }}
//                     value={to.section_id}
//                     onChange={(v) => setTo({ ...to, section_id: v })}
//                 >
//                     {toSections.map((s) => (
//                         <Option key={s.id} value={s.id}>
//                             {s.sectionName}
//                         </Option>
//                     ))}
//                 </Select>
//             </div>

//             {/* STUDENT TABLE */}
//             <Table
//                 rowKey="id"
//                 columns={columns}
//                 dataSource={students}
//                 rowSelection={{
//                     selectedRowKeys: selectedStudentIds,
//                     onChange: setSelectedStudentIds,
//                 }}
//             />

//             {/* ACTION BUTTONS */}
//             <div style={{ textAlign: "right", marginTop: 16 }}>
//                 <Button onClick={onClose} style={{ marginRight: 8 }}>
//                     Cancel
//                 </Button>
//                 <Button type="primary" onClick={promoteStudents}>
//                     Promote
//                 </Button>
//             </div>
//         </Modal>
//     );
// };

// export default PromoteStudentModal;
