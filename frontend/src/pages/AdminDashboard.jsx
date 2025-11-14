// frontend/src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { dashboardApi } from "../lib/api";

// สีของแท่งกราฟสำหรับประเภทห้อง
const BAR_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e",
  "#f59e0b", "#ef4444", "#14b8a6", "#a855f7",
];

function Card({ title, rightSlot, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        {title && <h3 className="text-base font-semibold">{title}</h3>}
        {rightSlot && <div className="flex gap-3">{rightSlot}</div>}
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState("today"); 
  const [view, setView] = useState("rooms");

  const [status, setStatus] = useState(null);
  const [util, setUtil] = useState(null);
  const [turnover, setTurnover] = useState(null);
  const [byType, setByType] = useState([]);
  const [revenue, setRevenue] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      if (view === "rooms") {
        const [byTypeRes, statusRes, utilRes, turnoverRes, revenueRes] = await Promise.all([
          dashboardApi.roomsByType(period),
          dashboardApi.roomsStatus(),
          dashboardApi.roomsUtilization(period),
          dashboardApi.roomsTurnover(),
          dashboardApi.revenue(period),
        ]);
        setByType(byTypeRes?.items || []);
        setStatus(statusRes || null);
        setUtil(utilRes || null);
        setTurnover(turnoverRes || null);
        setRevenue(revenueRes || null);
      } else {
        const [statusRes, utilRes, revenueRes] = await Promise.all([
          dashboardApi.banquetsStatus(),
          dashboardApi.banquetsUtilization(period),
          dashboardApi.revenue(period),
        ]);
        setByType([]);
        setStatus(statusRes || null);
        setUtil(utilRes || null);
        setTurnover(null);
        setRevenue(revenueRes || null);
      }
    } catch (e) {
      setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [period, view]);

  useEffect(() => { load(); }, [load]);

  const statusPie = useMemo(() => {
    if (!status) return [];
    return [
      { name: "ว่าง", value: status.available ?? 0 },
      { name: "ระหว่างซ่อม", value: status.maintenance ?? 0 },
    ];
  }, [status]);

  const COLORS = ["#10b981", "#f59e0b"];
  const titlePrefix = view === "rooms" ? "ห้องพัก" : "ห้องจัดเลี้ยง";
  const fmtBaht = (n) => `${Intl.NumberFormat("th-TH").format(n || 0)} บาท`;

  const revenueNumber = useMemo(() => {
    if (!revenue) return 0;
    return view === "rooms" ? (revenue.rooms ?? 0) : (revenue.banquets ?? 0);
  }, [revenue, view]);

  const top3 = useMemo(() => {
    if (view !== "rooms") return [];
    return [...(byType || [])]
      .sort((a, b) => (b.reservations || 0) - (a.reservations || 0))
      .slice(0, 3);
  }, [byType, view]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500">ภาพรวมตามแท็บและช่วงเวลาที่เลือก</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg border p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${view === "rooms" ? "bg-[#7C813E] text-white" : "text-gray-700"}`}
              onClick={() => setView("rooms")}
            >
              ห้องพัก
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${view === "banquets" ? "bg-[#7C813E] text-white" : "text-gray-700"}`}
              onClick={() => setView("banquets")}
            >
              ห้องจัดเลี้ยง
            </button>
          </div>

          <div className="bg-white rounded-lg border p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${period === "today" ? "bg-[#7C813E] text-white" : "text-gray-700"}`}
              onClick={() => setPeriod("today")}
            >
              วันนี้
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${period === "month" ? "bg-[#7C813E] text-white" : "text-gray-700"}`}
              onClick={() => setPeriod("month")}
            >
              เดือนนี้
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
      {loading && <div className="mb-4 text-gray-500 text-sm">กำลังโหลดข้อมูล...</div>}

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mb-5">
        
        {/* 🟢 การ์ดสถานะ (Legend ขวาบนระดับเดียวกับชื่อ) */}
        <Card
          title={`สถานะ${titlePrefix} (วันนี้)`}
          rightSlot={
            statusPie.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1 text-xs text-gray-700">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span>{s.name}</span>
              </div>
            ))
          }
        >
          {status ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusPie.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} ห้อง`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2">
                <StatRow label={`จำนวน${titlePrefix}ทั้งหมด`} value={status.total ?? 0} />
                <StatRow label="ว่าง" value={status.available ?? 0} />
                <StatRow label="ระหว่างซ่อม" value={status.maintenance ?? 0} />
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
          )}
        </Card>

        {/* การ์ดอัตราการใช้ */}
        <Card title={`อัตราการใช้${titlePrefix} (${period === "today" ? "วันนี้" : "เดือนนี้"})`}>
          {util ? (
            <>
              <div className="text-3xl font-bold">
                {util.utilizationPct ?? 0}<span className="text-lg">%</span>
              </div>
              <div className="mt-3 space-y-1">
                <StatRow label={`${titlePrefix}พร้อมให้บริการ`} value={util.roomsReady ?? 0} />
                <StatRow label="จอง/ใช้งานจริง" value={util.occupiedOrBooked ?? 0} />
                <StatRow label="รอชำระ (ยังไม่หมดเวลา)" value={util.pendingHolds ?? 0} />
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
          )}
        </Card>

        {/* การ์ดสรุป/รายได้ */}
        <Card title={view === "rooms" ? "การเข้า-ออก (วันนี้)" : "สรุป (วันนี้)"}>
          {view === "rooms" ? (
            turnover ? (
              <div className="space-y-1">
                <StatRow label="เช็กอินวันนี้" value={turnover.checkinToday ?? 0} />
                <StatRow label="เช็กเอาต์วันนี้" value={turnover.checkoutToday ?? 0} />
              </div>
            ) : (
              <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
            )
          ) : (
            util ? (
              <div className="space-y-1">
                <StatRow label="อีเวนต์ที่ใช้งานวันนี้ (ยืนยันแล้ว)" value={util.occupiedOrBooked ?? 0} />
                <StatRow label="คำจองค้างชำระ (ยังไม่หมดเวลา)" value={util.pendingHolds ?? 0} />
              </div>
            ) : (
              <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
            )
          )}

          <div className="border-t mt-3 pt-3">
            <h4 className="font-medium mb-2">
              รายได้ {period === "today" ? "(วันนี้)" : "(เดือนนี้)"} – {titlePrefix}
            </h4>
            {revenue ? (
              <>
                <StatRow
                  label={view === "rooms" ? "จากห้องพัก" : "จากห้องจัดเลี้ยง"}
                  value={fmtBaht(revenueNumber)}
                />
                <p className="text-xs text-gray-500 mt-2">
                  *อ้างอิงจากการชำระเงินที่ยืนยันแล้ว
                </p>
              </>
            ) : (
              <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
            )}
          </div>
        </Card>
      </div>

      {/* กราฟล่าง */}
      {view === "rooms" && (
        <Card
          title={`จำนวนการจองตามประเภทห้อง (${period === "today" ? "วันนี้" : "เดือนนี้"})`}
          className="min-h-[18rem]"
        >
          {byType && byType.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byType} margin={{ top: 10, right: 12, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type_name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} ครั้ง`, "จำนวนการจอง"]} />
                  <Bar dataKey="reservations" radius={[6, 6, 0, 0]}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3">
                <h5 className="text-sm font-semibold mb-1">Top 3 ประเภทห้องที่ถูกจองมากสุด</h5>
                <ul className="text-sm text-gray-700 list-decimal list-inside space-y-0.5">
                  {top3.map((it, idx) => (
                    <li key={idx}>{it.type_name} — {it.reservations} ครั้ง</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">ยังไม่มีการจองในช่วงที่เลือก</div>
          )}
        </Card>
      )}
    </div>
  );
}
