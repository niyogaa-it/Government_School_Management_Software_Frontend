import React, { useState, useEffect, useRef } from "react";
import { Form, Input, Spin, message } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", border:"#e2e8f0", green:"#16a34a", greenLt:"#22c55e", accent:"#4f8ef7", accentLight:"#e8f0fe" };
const FF = "'Segoe UI', system-ui, sans-serif"; const FS = "13.5px";

const EditSchool = () => {
  const { id } = useParams(); const [form] = Form.useForm();
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64]   = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false); // tracks explicit removal vs untouched
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/school/getSchool/${id}`)
      .then(r=>{
        form.setFieldsValue({name:r.data.name,shortcode:r.data.shortcode,phoneNumber:r.data.phoneNumber,address:r.data.address,city:r.data.city,state:r.data.state,pincode:r.data.pincode});
        if (r.data.logo) {
          setLogoPreview(r.data.logo);
          setLogoBase64(r.data.logo);
        }
      })
      .catch(()=>message.error("Failed to load school"))
      .finally(()=>setLoading(false));
  }, [id]);

  /* ── Logo upload handler ── */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      message.error("Please upload an image file (PNG, JPG, SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error("Logo must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoBase64(ev.target.result);
      setLogoPreview(ev.target.result);
      setLogoRemoved(false);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoBase64(null);
    setLogoPreview(null);
    setLogoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, logo: logoRemoved ? null : (logoBase64 || undefined) };
      await axios.put(`${process.env.REACT_APP_API_URL}/school/updateSchool/${id}`, payload);
      message.success("School updated!");
      navigate("/school-list");
    }
    catch { message.error("Failed to update school"); }
    finally { setSaving(false); }
  };

  if (loading) return <Layout><div style={{textAlign:"center",padding:80}}><Spin size="large"/><p>Loading...</p></div></Layout>;
  const inp = { fontFamily:FF, fontSize:FS };

  return (
    <Layout>
      <div className="app-page" style={{fontFamily:FF}}>
        <div style={{marginBottom:28}}><h1 style={{fontSize:22,fontWeight:700,color:COLOR.text,margin:0,letterSpacing:"-0.3px"}}>Edit School</h1><div style={{width:40,height:3,background:COLOR.blueLt,borderRadius:2,marginTop:6}}/></div>
        <div style={{maxWidth:540,margin:"0 auto",background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${COLOR.border}`,padding:"28px 32px"}}>
          <Form form={form} layout="vertical" onFinish={handleUpdate} style={{fontFamily:FF}}>

            {/* ── Logo Upload ── */}
            <Form.Item label="School Logo" style={{ marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>

                {/* Preview box */}
                <div style={{
                  width:80, height:80, borderRadius:10,
                  border:`2px dashed ${logoPreview ? COLOR.accent : COLOR.border}`,
                  background: logoPreview ? "#fff" : COLOR.accentLight,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  overflow:"hidden", flexShrink:0,
                }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="logo preview" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                    : <PictureOutlined style={{ fontSize:28, color:COLOR.accent }} />
                  }
                </div>

                {/* Upload controls */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display:"none" }}
                    onChange={handleLogoChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      all:"unset", padding:"7px 18px", borderRadius:7,
                      border:`1.5px solid ${COLOR.accent}`, background:COLOR.accentLight,
                      color:COLOR.accent, fontSize:13, fontWeight:600,
                      cursor:"pointer", textAlign:"center",
                    }}>
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      style={{
                        all:"unset", padding:"5px 14px", borderRadius:7,
                        border:"1.5px solid #fca5a5", background:"#fff5f5",
                        color:"#ef4444", fontSize:12, fontWeight:600,
                        cursor:"pointer", textAlign:"center",
                      }}>
                      Remove
                    </button>
                  )}
                  <span style={{ fontSize:11, color:COLOR.textMid }}>PNG, JPG, SVG · Max 2MB</span>
                </div>
              </div>
            </Form.Item>

            <Form.Item name="name" label="School Name" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="shortcode" label="Short Code" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="phoneNumber" label="Phone Number" rules={[{required:true},{pattern:/^[0-9]{10}$/,message:"10-digit number required"}]}><Input style={inp}/></Form.Item>
            <Form.Item name="address" label="Address" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="city" label="City" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="state" label="State" rules={[{required:true}]}><Input style={inp}/></Form.Item>
            <Form.Item name="pincode" label="Pincode" rules={[{required:true},{pattern:/^[0-9]{6}$/,message:"6-digit pincode required"}]}><Input style={inp}/></Form.Item>
            <Form.Item style={{marginBottom:0}}>
              <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
                <button type="button" onClick={()=>navigate("/school-list")} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"} style={{all:"unset",padding:"9px 28px",borderRadius:8,border:`1px solid ${COLOR.border}`,fontSize:FS,fontWeight:600,color:COLOR.textMid,cursor:"pointer",background:"#fff",transition:"background 0.15s"}}>Cancel</button>
                <button type="submit" disabled={saving} onMouseEnter={e=>e.currentTarget.style.background=COLOR.green} onMouseLeave={e=>e.currentTarget.style.background=COLOR.greenLt} style={{all:"unset",padding:"9px 28px",borderRadius:8,background:COLOR.greenLt,color:"#fff",fontSize:FS,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(34,197,94,0.25)",transition:"all 0.18s"}}>{saving?"Saving...":"Update School"}</button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};
export default EditSchool;
