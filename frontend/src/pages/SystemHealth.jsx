import React, { useState, useEffect } from "react";
import Sidebar from "../components/Layout/Sidebar";
import {
  Activity,
  Server,
  Database,
  Cpu,
  RefreshCw,
  Users,
  Video,
  Zap,
  Network,
  Lock,
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  TerminalSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`;

const customFetch = (url, options = {}) => {
  const token = sessionStorage.getItem("adminToken");
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

// Premium Red/Slate Palette
const COLORS = ["#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fee2e2"];

export default function SystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("telemetry");

  const fetchHealth = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await customFetch(`${API_BASE}/admin/system/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error("Failed to fetch health data", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  // Sparkline Component for Header Cards
  const Sparkline = ({ data, dataKey, color }) => (
    <div className="h-12 w-24 absolute right-4 bottom-4 opacity-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient
              id={`gradient-${dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${dataKey})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const apiData = healthData?.telemetry?.api || [];
  const aiData = healthData?.telemetry?.ai || [];

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans relative overflow-hidden text-slate-900 selection:bg-red-200 selection:text-red-900">
      {/* Revolutionary Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-100/40 rounded-full blur-[150px] mix-blend-multiply animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-slate-200/40 rounded-full blur-[150px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-red-50/50 rounded-full blur-[150px] mix-blend-multiply animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwYzAgMTEuMDQ2LTguOTU0IDIwLTIwIDIwUzAgMzEuMDQ2IDAgMjAgOC45NTQgMCAyMCAwczIwIDguOTU0IDIwIDIwem0wIDBjMCA1LjUyMy00LjQ3NyAxMC0xMCAxMFMwIDI1LjUyMyAwIDIwIDQuNDc3IDEwIDEwIDEwczEwIDQuNDc3IDEwIDEweiIgZmlsbD0iI2U1ZTdlYiIgZmlsbC1vcGFjaXR5PSIwLjA1IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <Sidebar />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto z-10 relative h-screen">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative">
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-red-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                <div className="w-20 h-20 bg-white/90 backdrop-blur-xl border border-white/50 rounded-[2rem] flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
                  <TerminalSquare size={36} className="text-red-600" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                  Command{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">
                    Center
                  </span>
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <p className="text-slate-500 font-bold text-sm tracking-[0.2em] uppercase">
                    Live Telemetry Active
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchHealth(true)}
              disabled={refreshing || loading}
              className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_8px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 disabled:opacity-50 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <RefreshCw
                size={20}
                className={`relative z-10 ${refreshing ? "animate-spin text-red-600" : "text-slate-400"}`}
              />
              <span className="relative z-10">
                {refreshing ? "Synchronizing..." : "Force Sync"}
              </span>
            </button>
          </div>

          {loading && !healthData ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin mb-6 shadow-lg shadow-red-100" />
              <p className="text-slate-400 font-black tracking-[0.2em] uppercase text-sm animate-pulse">
                Initializing Subsystems...
              </p>
            </div>
          ) : (
            <>
              {/* Always Visible Top Metrics Grid */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
              >
                {/* Metric 1: Network API */}
                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(220,38,38,0.08)] transition-all"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 flex items-center justify-center shadow-inner group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                      <Network size={20} />
                    </div>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                      {healthData?.api_status}
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 relative z-10">
                    Platform Traffic
                  </h3>
                  <p className="text-3xl font-black text-slate-900 tracking-tight relative z-10">
                    {apiData.length > 0
                      ? apiData[apiData.length - 1].requests
                      : 0}{" "}
                    <span className="text-sm text-slate-400 font-bold">
                      req/5m
                    </span>
                  </p>
                  <Sparkline
                    data={apiData}
                    dataKey="requests"
                    color="#ef4444"
                  />
                </motion.div>

                {/* Metric 2: Database Latency */}
                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(15,23,42,0.08)] transition-all"
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 flex items-center justify-center shadow-inner group-hover:text-slate-900 group-hover:border-slate-200 transition-colors">
                      <Database size={20} />
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 relative z-10">
                    Database Latency
                  </h3>
                  <p className="text-3xl font-black text-slate-900 tracking-tight relative z-10">
                    {healthData?.db_latency}
                  </p>
                  <Sparkline data={apiData} dataKey="latency" color="#475569" />
                </motion.div>

                {/* Metric 3: AI Engine */}
                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(220,38,38,0.08)] transition-all"
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 flex items-center justify-center shadow-inner group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                      <Cpu size={20} />
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 relative z-10">
                    AI Token Velocity
                  </h3>
                  <p className="text-3xl font-black text-slate-900 tracking-tight relative z-10">
                    {aiData.length > 0 ? aiData[aiData.length - 1].tokens : 0}{" "}
                    <span className="text-sm text-slate-400 font-bold">
                      t/s
                    </span>
                  </p>
                  <Sparkline data={aiData} dataKey="tokens" color="#ef4444" />
                </motion.div>

                {/* Metric 4: Active Sessions */}
                <motion.div
                  variants={itemVariants}
                  className="bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-[2rem] border border-red-500 shadow-[0_10px_40px_rgba(220,38,38,0.3)] relative overflow-hidden group hover:shadow-[0_20px_50px_rgba(220,38,38,0.4)] transition-all"
                >
                  <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center shadow-inner backdrop-blur-md">
                      <Video size={20} />
                    </div>
                    <div className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{" "}
                      Live Now
                    </div>
                  </div>
                  <h3 className="text-red-200 text-xs font-black uppercase tracking-widest mb-1 relative z-10">
                    Active Interviews
                  </h3>
                  <p className="text-5xl font-black text-white tracking-tight relative z-10">
                    {healthData?.active_sessions}
                  </p>
                </motion.div>
              </motion.div>

              {/* Master Navigation Tabs */}
              <div className="flex gap-2 p-2 bg-slate-200/50 backdrop-blur-md rounded-2xl w-max mx-auto mt-8 border border-white shadow-sm">
                {[
                  {
                    id: "telemetry",
                    label: "Platform Telemetry",
                    icon: Activity,
                  },
                  { id: "intelligence", label: "AI Intelligence", icon: Cpu },
                  { id: "uplinks", label: "Live Uplinks", icon: Users },
                  { id: "security", label: "Security Grid", icon: ShieldCheck },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all z-10 ${
                      activeTab === tab.id
                        ? "text-white"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="health-tab"
                        className="absolute inset-0 bg-red-600 rounded-xl shadow-[0_4px_15px_rgba(220,38,38,0.4)]"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.5,
                        }}
                      />
                    )}
                    <span className="relative z-20 flex items-center gap-2">
                      <tab.icon
                        size={16}
                        className={
                          activeTab === tab.id
                            ? "text-red-200"
                            : "text-slate-400"
                        }
                      />
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dynamic Content Area */}
              <div className="mt-8">
                <AnimatePresence mode="wait">
                  {/* TAB 1: Platform Telemetry */}
                  {activeTab === "telemetry" && (
                    <motion.div
                      key="telemetry"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-red-50 to-transparent rounded-full blur-[80px] pointer-events-none" />
                      <div className="flex justify-between items-end mb-8 relative z-10">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Activity className="text-red-500" /> API Traffic &
                            Latency Analysis
                          </h2>
                          <p className="text-slate-500 font-medium mt-1">
                            Overlay of incoming requests vs database response
                            times.
                          </p>
                        </div>
                      </div>
                      <div className="h-[400px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={apiData}
                            margin={{
                              top: 20,
                              right: 20,
                              left: -20,
                              bottom: 0,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="colorReqMain"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#ef4444"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#ef4444"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="time"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#94a3b8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                              dy={15}
                            />
                            <YAxis
                              yAxisId="left"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#94a3b8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#94a3b8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "16px",
                                border: "1px solid #f1f5f9",
                                boxShadow: "0 20px 40px rgb(0 0 0 / 0.1)",
                                fontWeight: "bold",
                              }}
                            />
                            <Legend
                              wrapperStyle={{
                                paddingTop: "20px",
                                fontWeight: "800",
                                fontSize: "13px",
                              }}
                              iconType="circle"
                            />
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="requests"
                              name="API Requests"
                              stroke="#ef4444"
                              strokeWidth={4}
                              fillOpacity={1}
                              fill="url(#colorReqMain)"
                              activeDot={{
                                r: 8,
                                strokeWidth: 0,
                                fill: "#ef4444",
                              }}
                            />
                            <Area
                              yAxisId="right"
                              type="monotone"
                              dataKey="latency"
                              name="DB Latency (ms)"
                              stroke="#475569"
                              strokeWidth={3}
                              fill="transparent"
                              strokeDasharray="5 5"
                              activeDot={{ r: 6, fill: "#475569" }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: AI Intelligence */}
                  {activeTab === "intelligence" && (
                    <motion.div
                      key="intelligence"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                      <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-2">
                          <Cpu className="text-red-500" /> Token Velocity
                        </h2>
                        <p className="text-slate-500 font-medium mb-8">
                          Real-time LLM token generation stream.
                        </p>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={aiData}
                              margin={{
                                top: 0,
                                right: 0,
                                left: -20,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#f1f5f9"
                              />
                              <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                  fill: "#94a3b8",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                                dy={15}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                  fill: "#94a3b8",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              />
                              <Tooltip
                                cursor={{ fill: "#f8fafc" }}
                                contentStyle={{
                                  borderRadius: "16px",
                                  border: "1px solid #f1f5f9",
                                  boxShadow: "0 20px 40px rgb(0 0 0 / 0.1)",
                                  fontWeight: "bold",
                                }}
                              />
                              <Bar
                                dataKey="tokens"
                                name="Tokens Generated"
                                fill="#ef4444"
                                radius={[6, 6, 6, 6]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-2">
                          <BarChart3 className="text-red-500" /> Global Persona
                          IQ
                        </h2>
                        <p className="text-slate-500 font-medium mb-8">
                          Average scoring across all completed sessions.
                        </p>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                              data={healthData?.telemetry?.ai_radar || []}
                            >
                              <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                              <PolarAngleAxis
                                dataKey="metric"
                                tick={{
                                  fill: "#475569",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              />
                              <Radar
                                name="Global Avg"
                                dataKey="score"
                                stroke="#ef4444"
                                strokeWidth={3}
                                fill="#ef4444"
                                fillOpacity={0.2}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "12px",
                                  border: "none",
                                  boxShadow: "0 10px 30px rgb(0 0 0 / 0.1)",
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: Live Uplinks */}
                  {activeTab === "uplinks" && (
                    <motion.div
                      key="uplinks"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                      <div className="lg:col-span-2 bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden">
                        <div className="flex justify-between items-end mb-8">
                          <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                              <Video className="text-red-500" /> Active
                              Candidate Streams
                            </h2>
                            <p className="text-slate-500 font-medium mt-1">
                              Real-time interview progression monitoring.
                            </p>
                          </div>
                          <div className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-sm tracking-widest border border-red-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{" "}
                            {healthData?.telemetry?.live_streams?.length || 0}{" "}
                            LIVE
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          {!healthData?.telemetry?.live_streams ||
                          healthData.telemetry.live_streams.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                              <Users
                                size={48}
                                className="text-slate-300 mb-4"
                              />
                              <p className="text-slate-500 font-bold text-lg">
                                No candidates currently online.
                              </p>
                            </div>
                          ) : (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b-2 border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                                  <th className="pb-4 px-4">
                                    Candidate Identity
                                  </th>
                                  <th className="pb-4 px-4">Target Vector</th>
                                  <th className="pb-4 px-4">Current Stage</th>
                                  <th className="pb-4 px-4 text-right">
                                    T+ Duration
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {healthData.telemetry.live_streams.map(
                                  (s, i) => (
                                    <tr
                                      key={i}
                                      className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                      <td className="py-5 px-4">
                                        <div className="font-black text-slate-900 text-base">
                                          {s.name}
                                        </div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                          {s.id}
                                        </div>
                                      </td>
                                      <td className="py-5 px-4 text-sm font-bold text-slate-600">
                                        {s.role}
                                      </td>
                                      <td className="py-5 px-4">
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-white shadow-sm border border-slate-200 text-slate-700">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>{" "}
                                          {s.stage}
                                        </span>
                                      </td>
                                      <td className="py-5 px-4 text-right text-sm font-black text-red-600 tabular-nums">
                                        {s.duration}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-2">
                          Vector Dist
                        </h2>
                        <p className="text-slate-500 font-medium mb-6 text-sm">
                          Role allocation for live streams.
                        </p>
                        <div className="flex-1 w-full min-h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={
                                  healthData?.telemetry?.role_distribution || []
                                }
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={8}
                              >
                                {(
                                  healthData?.telemetry?.role_distribution || []
                                ).map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "16px",
                                  border: "none",
                                  boxShadow: "0 10px 40px rgb(0 0 0 / 0.1)",
                                  fontWeight: "bold",
                                }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{
                                  fontWeight: "800",
                                  fontSize: "12px",
                                  color: "#64748b",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: Security Grid */}
                  {activeTab === "security" && (
                    <motion.div
                      key="security"
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      className="bg-white/80 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-40 bg-red-50 rounded-full blur-[100px] pointer-events-none" />
                      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 pb-8 border-b-2 border-slate-100 relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-[1.5rem] flex items-center justify-center border border-red-200 shadow-sm shrink-0">
                          <Fingerprint className="text-red-600" size={40} />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                            Security & Authentication Grid
                          </h2>
                          <p className="text-slate-500 font-medium mt-2 text-lg">
                            Threat detection, rate limit interventions, and
                            unauthorized access attempts over the last 4 hours.
                          </p>
                        </div>
                      </div>

                      <div className="h-[400px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={healthData?.telemetry?.security || []}
                            margin={{
                              top: 10,
                              right: 10,
                              left: -20,
                              bottom: 0,
                            }}
                            barGap={12}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="time"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#94a3b8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                              dy={15}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "#94a3b8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            />
                            <Tooltip
                              cursor={{ fill: "#f8fafc", radius: 10 }}
                              contentStyle={{
                                borderRadius: "16px",
                                border: "1px solid #f1f5f9",
                                boxShadow: "0 20px 40px rgb(0 0 0 / 0.1)",
                                fontWeight: "bold",
                              }}
                            />
                            <Legend
                              wrapperStyle={{
                                paddingTop: "30px",
                                fontWeight: "800",
                                fontSize: "13px",
                              }}
                              iconType="circle"
                            />
                            <Bar
                              dataKey="failed_logins"
                              name="Auth Rejections"
                              fill="#ef4444"
                              radius={[8, 8, 8, 8]}
                              barSize={48}
                            />
                            <Bar
                              dataKey="api_blocks"
                              name="Rate Limit Interventions"
                              fill="#475569"
                              radius={[8, 8, 8, 8]}
                              barSize={48}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
