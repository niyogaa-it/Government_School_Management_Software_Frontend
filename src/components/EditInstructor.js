import React, { useState, useEffect } from "react";
import { Form, Input, Select, Spin, notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0", green:"#16a34a", greenLt:"#22c55e", danger:"#e21216", bg:"#f8fafc" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";
const generateAcademicYears = () => { const y=new Date().getFullYear(); return Array.from({length:3},(_,i)=>`${y-2+i}-${y-1+i}`); };

// Empty row for the Grade/Subject table — academic year is picked first,
// which then scopes which grades (and subjects) are selectable.
const emptyRow = () => ({ academic_year:"", grade_id:"", subject_id:"" });

const EditInstructor = () => {
  const { id } = useParams(); const [form] = Form.useForm();
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [gradesByYear, setGradesByYear] = useState({});     // { [academic_year]: [grades...] }
  const [subjectsByGrade, setSubjectsByGrade] = useState({}); // { [grade_id]: [subjects...] } (each subject carries its own academic_year)
  const [rows, setRows] = useState([emptyRow()]);
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  const fetchGradesForYear = async (year, schoolOverride) => {
    const sid = schoolOverride || form.getFieldValue("school_id");
    if (!year || !sid || gradesByYear[year]) return;
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${sid}/${year}`);
      setGradesByYear(prev => ({ ...prev, [year]: r.data.grades || [] }));
    } catch { setGradesByYear(prev => ({ ...prev, [year]: [] })); }
  };

  const fetchSubjectsForGrade = async (gradeId, schoolOverride) => {
    const sid = schoolOverride || form.getFieldValue("school_id");
    if (!gradeId || !sid || subjectsByGrade[gradeId]) return;
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndGrade/${sid}/${gradeId}`);
      setSubjectsByGrade(prev => ({ ...prev, [gradeId]: r.data.subjects || [] }));
    } catch { setSubjectsByGrade(prev => ({ ...prev, [gradeId]: [] })); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [sr, insR] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`),
          axios.get(`${process.env.REACT_APP_API_URL}/instructor/getInstructorById/${id}`)
        ]);
        setSchools(sr.data.schools||[]);
        const ins = insR.data.instructor;
        if (ins) {
          form.setFieldsValue({
            school_id: ins.school_id,
            name: ins.name,
            gender: ins.gender || undefined,
            instructorType: ins.instructorType || "Academic",
            designation: ins.designation || "",
            dateOfJoining: ins.dateOfJoining ? ins.dateOfJoining.split("T")[0] : "",
            qualification: ins.qualification || "",
            workExperience: ins.workExperience || "",
            email: ins.email || "",
            phone: ins.phone || "",
          });
          const existingRows = (ins.Subjects||[]).map(s=>({ academic_year:s.academic_year||"", grade_id:s.grade_id, subject_id:s.subject_id }));
          setRows(existingRows.length>0 ? existingRows : [emptyRow()]);
          // Pre-warm grade + subject options for each row already in use
          existingRows.forEach(r => {
            if (r.academic_year) fetchGradesForYear(r.academic_year, ins.school_id);
            if (r.grade_id) fetchSubjectsForGrade(r.grade_id, ins.school_id);
          });
        } else api.error({message:"Instructor not found",placement:"topRight"});
      } catch { api.error({message:"Failed to load instructor",placement:"topRight"}); }
      finally { setLoading(false); }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Changing school invalidates every cached grade/subject option and any rows already picked
  const handleSchoolChange = () => { setGradesByYear({}); setSubjectsByGrade({}); setRows([emptyRow()]); };

  const handleRowYearChange = (index, year) => {
    setRows(prev => prev.map((r,i) => i===index ? { academic_year:year, grade_id:"", subject_id:"" } : r));
    if (year) fetchGradesForYear(year);
  };
  const handleRowGradeChange = (index, gradeId) => {
    setRows(prev => prev.map((r,i) => i===index ? { ...r, grade_id:gradeId, subject_id:"" } : r));
    if (gradeId) fetchSubjectsForGrade(gradeId);
  };
  const handleRowSubjectChange = (index, subjectId) => {
    setRows(prev => prev.map((r,i) => i===index ? { ...r, subject_id:subjectId } : r));
  };
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (index) => setRows(prev => prev.length>1 ? prev.filter((_,i)=>i!==index) : prev);

  const handleUpdate = async (values) => {
    const validRows = rows.filter(r => r.academic_year && r.grade_id && r.subject_id);
    const payload = { ...values, subjects: validRows };
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/instructor/updateInstructor/${id}`, payload);
      api.success({message:"Instructor Updated!",description:`"${values.name}" updated.`,icon:<CheckCircleOutlined style={{color:"#52c41a"}}/>,placement:"topRight",duration:3});
      setTimeout(()=>navigate("/instructorlist"),1500);
    } catch (err) {
      api.error({message:"Failed to update instructor",description:err?.response?.data?.error,icon:<ExclamationCircleOutlined style={{color:"#faad14"}}/>,placement:"topRight"});
    } finally { setSaving(false); }
  };

  if (loading) return <Layout><div style={{textAlign:"center",padding:80}}><Spin size="large"/><p>Loading...</p></div></Layout>;
  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}><h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Edit Instructor</h1><div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/></div>
        <div style={{maxWidth:760,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleUpdate} style={{fontFamily:FF}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"0 24px"}}>
              <Form.Item name="school_id" label="School" rules={[{required:true}]}>
                <Select onChange={handleSchoolChange} style={inp}>{schools.map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}</Select>
              </Form.Item>
              <Form.Item name="name" label="Name" rules={[{required:true}]}><Input style={inp}/></Form.Item>
              <Form.Item name="gender" label="Gender" rules={[{required:true}]}>
                <Select placeholder="Select gender" style={inp}>
                  <Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option>
                </Select>
              </Form.Item>
              <Form.Item name="instructorType" label="Instructor Type" rules={[{required:true}]}>
                <Select style={inp}><Option value="Academic">Academic</Option><Option value="Non Academic">Non Academic</Option></Select>
              </Form.Item>
              <Form.Item name="designation" label="Designation"><Input style={inp}/></Form.Item>
              <Form.Item name="dateOfJoining" label="Date of Joining"><Input type="date" style={inp}/></Form.Item>
              <Form.Item name="qualification" label="Qualification"><Input style={inp}/></Form.Item>
              <Form.Item name="workExperience" label="Work Experience"><Input style={inp}/></Form.Item>
              <Form.Item name="email" label="Email" rules={[{type:"email"}]}><Input style={inp}/></Form.Item>
              <Form.Item name="phone" label="Mobile" rules={[{pattern:/^[0-9]{10}$/, message:"Enter a valid 10-digit mobile number"}]}>
                <Input maxLength={10} inputMode="numeric" style={inp}/>
              </Form.Item>
            </div>

            <div style={{fontSize:13,fontWeight:700,color:COLOR.text,padding:"7px 12px",background:COLOR.bg,borderLeft:`4px solid ${COLOR.blue}`,borderRadius:5,margin:"6px 0 14px"}}>
              Grades & Subjects Taught
            </div>

            <div style={{border:`1px solid ${COLOR.border}`,borderRadius:8,overflow:"hidden",marginBottom:12}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:FF,fontSize:FS}}>
                <thead>
                  <tr style={{background:COLOR.bg}}>
                    <th style={{padding:"10px 14px",textAlign:"left",width:50,color:COLOR.textMid,fontWeight:600}}>S.No</th>
                    <th style={{padding:"10px 14px",textAlign:"left",color:COLOR.textMid,fontWeight:600}}>Academic Year</th>
                    <th style={{padding:"10px 14px",textAlign:"left",color:COLOR.textMid,fontWeight:600}}>Grade</th>
                    <th style={{padding:"10px 14px",textAlign:"left",color:COLOR.textMid,fontWeight:600}}>Subject</th>
                    <th style={{padding:"10px 14px",textAlign:"center",width:60,color:COLOR.textMid,fontWeight:600}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} style={{borderTop:`1px solid ${COLOR.border}`}}>
                      <td style={{padding:"8px 14px",color:COLOR.text}}>{index+1}</td>
                      <td style={{padding:"8px 14px"}}>
                        <Select value={row.academic_year||undefined} onChange={val=>handleRowYearChange(index,val)} placeholder="Select year" style={{width:"100%"}}>
                          {generateAcademicYears().map(y=><Option key={y} value={y}>{y}</Option>)}
                        </Select>
                      </td>
                      <td style={{padding:"8px 14px"}}>
                        <Select value={row.grade_id||undefined} onChange={val=>handleRowGradeChange(index,val)}
                          placeholder={row.academic_year?"Select grade":"Select year first"} disabled={!row.academic_year} style={{width:"100%"}}>
                          {(gradesByYear[row.academic_year]||[]).map(g=><Option key={g.id} value={g.id}>{g.grade}</Option>)}
                        </Select>
                      </td>
                      <td style={{padding:"8px 14px"}}>
                        <Select value={row.subject_id||undefined} onChange={val=>handleRowSubjectChange(index,val)}
                          placeholder={row.grade_id?"Select subject":"Select grade first"} disabled={!row.grade_id} style={{width:"100%"}}>
                          {(subjectsByGrade[row.grade_id]||[]).filter(s=>s.academic_year===row.academic_year).map(s=><Option key={s.id} value={s.id}>{s.subjectName}</Option>)}
                        </Select>
                      </td>
                      <td style={{padding:"8px 14px",textAlign:"center"}}>
                        <button type="button" onClick={()=>removeRow(index)} title="Remove row"
                          style={{all:"unset",cursor:"pointer",color:COLOR.danger,fontWeight:700,fontSize:16,padding:"0 8px"}}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{marginBottom:26}}>
              <button type="button" onClick={addRow}
                onMouseEnter={e=>e.currentTarget.style.background=COLOR.blue} onMouseLeave={e=>e.currentTarget.style.background=COLOR.blueLt}
                style={{all:"unset",padding:"8px 18px",borderRadius:8,background:COLOR.blueLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                + Add Row
              </button>
            </div>

            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end",borderTop:`1px solid ${COLOR.border}`,paddingTop:20}}>
                <button type="button" onClick={()=>navigate("/instructorlist")} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={saving} onMouseEnter={e=>e.currentTarget.style.background=COLOR.green} onMouseLeave={e=>e.currentTarget.style.background=COLOR.greenLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.greenLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(34,197,94,0.25)",transition:"all 0.18s"}}>{saving?"Saving...":"Update Instructor"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default EditInstructor;
