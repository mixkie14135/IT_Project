// src/pages/AdminRooms.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,
  fileUrl,
  toArray,
} from "../lib/api.js";

const FILTER_OPTIONS = [
  { value: "all",         label: "ทั้งหมด" },
  { value: "available",   label: "ว่าง" },
  { value: "maintenance", label: "ระหว่างซ่อม" },
];

const normalizePath = (s) => String(s || "").replace(/\\/g, "/");

function NoImage({ title = "ไม่มีรูป" }) {
  return (
    <div
      title={title}
      style={{
        width: "100%",
        height: "100%",
        border: "1px dashed #cfd6bf",
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        color: "#9aa18c",
        fontSize: 12,
        background: "#fafcf7",
      }}
    >
      No image
    </div>
  );
}

function toViewRoom(row) {
  return {
    id: row.room_id,
    number: row.room_number,
    typeId: row.room_type_id ?? "",
    type: row.room_type?.type_name || "",
    capacity: row.capacity ?? 0,
    price: Number(row.price ?? 0),
    status: row.status || "available",
    detail: row.description || "",
    images: Array.isArray(row.room_image)
      ? row.room_image
          .map((i) => ({ id: i.image_id, url: normalizePath(i?.image_url || i?.url) }))
          .filter((i) => !!i.url)
      : [],
  };
}

/** เผื่อ backend คืนโครงสร้างแตกต่างกัน ให้ดึง room_id ได้เสมอ */
function extractRoomId(created) {
  if (!created || typeof created !== "object") return null;
  return (
    created.room_id ??
    created.id ??
    created?.room?.room_id ??
    created?.data?.room_id ??
    created?.data?.id ??
    null
  );
}

export default function AdminRooms({ embedded = false }) {
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // create: เลือกรูปไว้ก่อนกดบันทึก
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // image manager (ห้องเดิม)
  const [imgMgr, setImgMgr] = useState({
    open: false, roomId: null, roomNo: "", items: [], uploading: false,
    lightbox: { open: false, index: 0 },
  });

  // เมนูเล็กใต้ปุ่มดินสอ
  const [menuRowId, setMenuRowId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError("");
        const tps = await apiGet("/room-types");
        setTypes(tps || []);
        await refreshRooms();
      } catch (err) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
    return () => newPreviews.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function emptyForm() {
    return {
      id: null,
      number: "",
      typeId: "",
      detail: "",
      capacity: "2",
      price: "0",
      status: "available",
      images: [],
    };
  }
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  async function refreshRooms() {
    const rs = await apiGet("/rooms", { include: "type,images", limit: 200 });
    setRooms((rs?.items || rs || []).map(toViewRoom));
  }

  /** จัดเรียงเลขห้องแบบ numeric-aware */
  const compareRoomNo = (a, b) => {
    const na = String(a ?? "");
    const nb = String(b ?? "");
    const cmp = na.localeCompare(nb, undefined, { numeric: true, sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  };

  const view = useMemo(() => {
    let list = [...rooms];
    if (filter !== "all") list = list.filter((r) => r.status === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        String(r.number).toLowerCase().includes(q) ||
        String(r.type).toLowerCase().includes(q) ||
        String(r.detail).toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => compareRoomNo(a.number, b.number));
    return list;
  }, [rooms, filter, search, sortDir]);

  function openCreate() {
    setForm(emptyForm());
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]); setNewPreviews([]);
    setEditing(true);
  }
  function openEdit(room) {
    setForm({
      id: room.id,
      number: room.number,
      typeId: room.typeId || "",
      detail: room.detail || "",
      capacity: String(room.capacity ?? "2"),
      price: String(room.price ?? "0"),
      status: room.status || "available",
      images: room.images || [],
    });
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]); setNewPreviews([]);
    setEditing(true);
    setMenuRowId(null);
  }
  function closeModal() {
    setEditing(false);
    setForm(emptyForm());
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]); setNewPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const confirmDelete = async (text) => {
    const res = await Swal.fire({
      title: "ยืนยันการลบ",
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });
    return res.isConfirmed;
  };
  const toast = (icon, title) =>
    Swal.fire({ toast: true, position: "top-end", showConfirmButton: false, timer: 1600, icon, title });

  const onDelete = async (id, numberForMsg) => {
    setMenuRowId(null);
    const ok = await confirmDelete(`ต้องการลบห้องเลขที่ ${numberForMsg} หรือไม่?`);
    if (!ok) return;
    try {
      setLoading(true); setError("");
      await apiDelete(`/rooms/${id}`);
      setRooms((prev) => prev.filter((r) => r.id !== id));
      toast("success", "ลบเรียบร้อย");
    } catch (e) {
      setError(String(e.message || e));
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: String(e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  /** สร้าง/แก้ไขห้อง + อัปโหลดรูป (โหมดสร้าง) */
  const onSave = async () => {
    try {
      if (!form.number?.trim()) throw new Error("กรุณากรอกหมายเลขห้อง");
      if (!form.typeId) throw new Error("กรุณาเลือกประเภทห้อง");
      if (Number(form.capacity) <= 0) throw new Error("จำนวนคนต่อห้องต้องมากกว่า 0");
      if (Number(form.price) < 0) throw new Error("ราคา/คืน ต้องเป็นจำนวนบวก");

      setLoading(true); setError("");

      const payload = {
        room_number: form.number,
        room_type_id: Number(form.typeId),
        capacity: Number(form.capacity || 0),
        price: String(form.price ?? "0"),
        status: form.status,
        description: form.detail || "",
      };

      let roomId = form.id;

      if (!form.id) {
        // CREATE
        const created = await apiPost(`/rooms`, payload);
        roomId = extractRoomId(created);

        // ถ้าหา id ไม่เจอ ให้ดึงใหม่จาก backend แล้วหาเลขห้องล่าสุด
        if (!roomId) {
          const all = await apiGet("/rooms", { include: "type,images", limit: 500 });
          const arr = (all?.items || all || []).map(toViewRoom);
          const matches = arr.filter(r => String(r.number) === String(form.number));
          if (matches.length > 0) {
            const last = matches[matches.length - 1];
            roomId = last.id;
          }
        }

        // อัปโหลดรูปถ้ามี
        if (roomId && newFiles.length) {
          let ok = 0, fail = 0;
          for (const f of newFiles) {
            try { await apiUpload(`/rooms/${roomId}/images`, f, "file"); ok++; }
            catch { fail++; }
          }
          if (ok) Swal.fire({ toast:true, position:"top-end", icon:"success", title:`อัปโหลดรูปสำเร็จ ${ok} ไฟล์`, timer:1600, showConfirmButton:false });
          if (fail) Swal.fire({ icon:"warning", title:"มีบางรูปอัปโหลดไม่สำเร็จ", text:`ไม่สำเร็จ ${fail} ไฟล์` });
        }

        Swal.fire({ toast:true, position:"top-end", icon:"success", title:"เพิ่มห้องสำเร็จ", timer:1600, showConfirmButton:false });
      } else {
        // UPDATE
        await apiPut(`/rooms/${roomId}`, payload);

        // เผื่ออนุญาตแนบรูปตอนแก้ไข
        if (roomId && newFiles.length) {
          let ok = 0, fail = 0;
          for (const f of newFiles) {
            try { await apiUpload(`/rooms/${roomId}/images`, f, "file"); ok++; }
            catch { fail++; }
          }
          if (ok) Swal.fire({ toast:true, position:"top-end", icon:"success", title:`อัปโหลดรูปสำเร็จ ${ok} ไฟล์`, timer:1600, showConfirmButton:false });
          if (fail) Swal.fire({ icon:"warning", title:"มีบางรูปอัปโหลดไม่สำเร็จ", text:`ไม่สำเร็จ ${fail} ไฟล์` });
        }

        Swal.fire({ toast:true, position:"top-end", icon:"success", title:"บันทึกการแก้ไขแล้ว", timer:1600, showConfirmButton:false });
      }

      closeModal();
      await refreshRooms();
    } catch (e) {
      setError(String(e.message || e));
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: String(e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  async function openImageManager(room) {
    try {
      setLoading(true);
      const list = await apiGet(`/rooms/${room.id}/images`);
      const items = toArray(list).map((i) => ({
        id: i.image_id,
        url: normalizePath(i.image_url || i.url),
      }));
      setImgMgr({
        open: true,
        roomId: room.id,
        roomNo: room.number,
        items,
        uploading: false,
        lightbox: { open: false, index: 0 },
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "ไม่สามารถดึงรูปได้", text: String(e.message || e) });
    } finally {
      setLoading(false);
      setMenuRowId(null);
    }
  }
  function closeImageManager() {
    setImgMgr((s) => ({ ...s, open: false, items: [], roomId: null, roomNo: "" }));
  }
  async function onUploadFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !imgMgr.roomId) return;
    try {
      setImgMgr((s) => ({ ...s, uploading: true }));
      for (const f of files) await apiUpload(`/rooms/${imgMgr.roomId}/images`, f, "file");
      const list = await apiGet(`/rooms/${imgMgr.roomId}/images`);
      const items = toArray(list).map((i) => ({ id: i.image_id, url: normalizePath(i.image_url || i.url) }));
      setImgMgr((s) => ({ ...s, items, uploading: false }));
      await refreshRooms();
      toast("success", "อัปโหลดรูปสำเร็จ");
    } catch (err) {
      Swal.fire({ icon: "error", title: "อัปโหลดไม่สำเร็จ", text: String(err.message || err) });
      setImgMgr((s) => ({ ...s, uploading: false }));
    } finally {
      e.target.value = "";
    }
  }
  async function onDeleteImage(imageId) {
    const ok = await confirmDelete("ต้องการลบรูปนี้หรือไม่?");
    if (!ok) return;
    try {
      await apiDelete(`/rooms/${imgMgr.roomId}/images/${imageId}`);
      setImgMgr((s) => ({ ...s, items: s.items.filter((x) => x.id !== imageId) }));
      await refreshRooms();
      toast("success", "ลบรูปแล้ว");
    } catch (e) {
      Swal.fire({ icon: "error", title: "ลบรูปไม่สำเร็จ", text: String(e.message || e) });
    }
  }
  function openLightbox(index) { setImgMgr((s) => ({ ...s, lightbox: { open: true, index } })); }
  function closeLightbox()     { setImgMgr((s) => ({ ...s, lightbox: { open: false, index: 0 } })); }
  function nextLightbox(delta) {
    setImgMgr((s) => {
      const n = s.items.length; if (!n) return s;
      let i = s.lightbox.index + delta; if (i < 0) i = n - 1; if (i >= n) i = 0;
      return { ...s, lightbox: { open: true, index: i } };
    });
  }

  function onPickNewImages(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...urls]);
  }
  function removePickedImage(idx) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      const copy = [...prev];
      const [del] = copy.splice(idx, 1);
      if (del) URL.revokeObjectURL(del);
      return copy;
    });
  }

  const isCreate = !form.id;

  return (
    <div className="adminPage" onClick={() => setMenuRowId(null)}>

      {/* ถ้าไม่ได้ฝังจากภายนอก คง header ไว้ตามเดิม */}
      {!embedded && (
        <div className="adminPageHeader">
          <h2>
            <span className="headIcon"></span> จัดการห้อง
          </h2>
        </div>
      )}

      {/* Toolbar (info + search ซ้าย / filter+sort+add ขวา) */}
      <div className="toolbar">
        <div className="toolLeft">
          <div className="info">
            ห้องพักทั้งหมด ({view.length} ห้อง)
          </div>
          <div className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา : เลขห้อง / ประเภท / รายละเอียด"
            />
          </div>
        </div>

        <div className="controls">
          <label className="filter">
            <span>Filter:</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="room-filter">
              {FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <button
            className="btnPrimary"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            จัดเรียงเลขห้อง {sortDir === "asc" ? "↑" : "↓"}
          </button>

          <button className="btnPrimary" onClick={openCreate}>
            <span className="btnIc">+</span> เพิ่มห้อง
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ marginBottom: 12 }}>กำลังโหลด...</div>}

      <div className="card table adminRooms">
        <div className="tHead">
          <div>ห้อง</div>
          <div>ประเภทห้อง</div>
          <div className="center">จำนวนคน</div>
          <div className="right">ราคา/คืน</div>
          <div className="center">สถานะ</div>
          <div className="right">รูปภาพ</div>
        </div>

        {view.map((r) => (
          <div className="tRow" key={r.id} onClick={(e) => e.stopPropagation()}>
            {/* ห้อง + action-menu */}
            <div className="cell--room">
              <button
                className="iconBtn roomEdit"
                title="เมนู"
                onClick={() => setMenuRowId((id) => (id === r.id ? null : r.id))}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
                </svg>
              </button>
              <div className="roomMeta">
                <span className="roomNo" title={`ห้องเลขที่ ${r.number}`}>{r.number}</span>
              </div>

              {menuRowId === r.id && (
                <div className="actionMenu" onClick={(e)=>e.stopPropagation()}>
                  <button onClick={() => openEdit(r)}>แก้ไข</button>
                  <button onClick={() => openImageManager(r)}>จัดการรูป</button>
                  <button className="danger" onClick={() => onDelete(r.id, r.number)}>ลบ</button>
                </div>
              )}
            </div>

            <div>{r.type || types.find((t) => t.room_type_id === Number(r.typeId))?.type_name || "-"}</div>
            <div className="center">{r.capacity}</div>
            <div className="right"><PriceTag value={r.price} /></div>
            <div className="center"><StatusBadge status={r.status} /></div>

            <div className="right cell--thumb">
              <div className="thumbMini" title="ดู/จัดการรูป" onClick={() => openImageManager(r)} style={{ cursor: "pointer" }}>
                {r.images[0]?.url ? (
                  <img src={fileUrl(r.images[0].url)} alt="" loading="lazy" />
                ) : (
                  <NoImage />
                )}
                <span className="count">{r.images?.length || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {editing && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="modalTitle">{isCreate ? "เพิ่มห้องใหม่" : "แก้ไขข้อมูลห้องพัก"}</h3>

            <div className="modalGrid">
              <div className="modalForm">
                <div className="fRow">
                  <label>หมายเลขห้อง</label>
                  <input value={form.number} onChange={(e) => setField("number", e.target.value)} placeholder="เช่น 101" />
                </div>

                <div className="fRow">
                  <label>ประเภทห้อง</label>
                  <select value={form.typeId} onChange={(e) => setField("typeId", e.target.value)}>
                    <option value="" disabled>-- เลือกประเภท --</option>
                    {types.map((t) => <option key={t.room_type_id} value={t.room_type_id}>{t.type_name}</option>)}
                  </select>
                </div>

                <div className="fRow">
                  <label>รายละเอียด</label>
                  <textarea
                    rows={4}
                    value={form.detail}
                    onChange={(e) => setField("detail", e.target.value)}
                    placeholder="คำอธิบายสั้น ๆ ของห้อง"
                    className="textarea"
                  />
                </div>

                <div className="fRow two">
                  <div>
                    <label>ราคา/คืน (บาท)</label>
                    <input type="number" min="0" value={form.price} onChange={(e) => setField("price", e.target.value)} />
                  </div>
                  <div>
                    <label>จำนวนคนต่อห้อง</label>
                    <input type="number" min="1" value={form.capacity} onChange={(e) => setField("capacity", e.target.value)} />
                  </div>
                </div>

                <div className="fRow">
                  <label>สถานะ</label>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                    <option value="available">ว่าง</option>
                    <option value="maintenance">ระหว่างซ่อม</option>
                  </select>
                </div>
              </div>

              {/* รูปในโมดัล (create เท่านั้น) */}
              <div className="modalGallery">

                {isCreate ? (
                  <>
                    <div className="fRow">
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPickNewImages} />
                      <div style={{ fontSize: 12, color: "#6b6b6b", marginTop: 6 }}>
                        * เลือกหลายไฟล์ได้ และจะอัปโหลดหลังจากกด “ยืนยัน”
                      </div>
                    </div>

                    <div className="galleryGrid" style={{ marginTop: 8 }}>
                      {newPreviews.length === 0 && <div className="thumb"><NoImage /></div>}
                      {newPreviews.map((src, idx) => (
                        <div className="thumb" key={`picked-${idx}`}>
                          <img src={src} alt="" />
                          <button className="thumbDel" onClick={() => removePickedImage(idx)} title="นำรูปนี้ออก">×</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="galleryGrid">
                      {(form.images || []).length === 0 && <div className="thumb"><NoImage /></div>}
                      {(form.images || []).map((img, idx) => (
                        <div className="thumb" key={`img-${idx}`}>
                          <img src={fileUrl(img.url)} alt="" />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b6b6b" }}>
                      * เพิ่ม/ลบรูปได้จาก “จัดการรูป” ในตาราง
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modalActions">
              <button className="btnText" onClick={closeModal}>ยกเลิก</button>
              <button className="btnPrimary" onClick={onSave}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Manager */}
      {imgMgr.open && (
        <div className="modalOverlay" onClick={closeImageManager}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
            <h3 className="modalTitle">รูปภาพ – ห้องเลขที่ {imgMgr.roomNo}</h3>

            <div className="modalForm">
              <div className="fRow">
                <input type="file" accept="image/*" multiple onChange={onUploadFiles} disabled={imgMgr.uploading} />
              </div>
              {imgMgr.uploading && <div>กำลังอัปโหลด...</div>}
            </div>

            <div className="galleryGrid" style={{ marginTop:12 }}>
              {imgMgr.items.length === 0 && <div className="thumb"><NoImage /></div>}
              {imgMgr.items.map((it, idx)=>(
                <div className="thumb" key={it.id}>
                  <img src={fileUrl(it.url)} alt="" onClick={()=>openLightbox(idx)} style={{cursor:"zoom-in"}} />
                  <button className="thumbDel" onClick={()=>onDeleteImage(it.id)} title="ลบรูป">×</button>
                </div>
              ))}
            </div>

            <div className="modalActions">
              <button className="btnText" onClick={closeImageManager}>ปิด</button>
            </div>
          </div>

          {imgMgr.lightbox.open && imgMgr.items.length > 0 && (
            <div
              className="lightboxOverlay"
              onClick={closeLightbox}
            >
              <div className="lightboxContent" onClick={(e) => e.stopPropagation()}>
                <button className="lightboxClose" onClick={closeLightbox}>×</button>
                <button className="lightboxPrev" onClick={() => nextLightbox(-1)}>‹</button>
                <img
                  src={fileUrl(imgMgr.items[imgMgr.lightbox.index].url)}
                  alt=""
                />
                <button className="lightboxNext" onClick={() => nextLightbox(+1)}>›</button>
                <div className="lightboxCounter">
                  {imgMgr.lightbox.index + 1} / {imgMgr.items.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const label =
    status === "available" ? "ว่าง" :
    status === "maintenance" ? "ระหว่างซ่อม" : "ไม่ระบุ";
  const cls = status === "available" ? "ok" :
              status === "maintenance" ? "" : "bad";
  return <span className={"pill " + cls}>{label}</span>;
}


function PriceTag({ value }) {
  return <span className="priceTag">{Number(value || 0).toLocaleString()} <small>บาท</small></span>;
}
