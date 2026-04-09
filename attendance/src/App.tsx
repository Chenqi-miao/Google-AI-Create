/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWeekend,
  getWeek,
  startOfISOWeek,
  endOfISOWeek
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Palmtree,
  BarChart3,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AttendanceStatus } from './types';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode; value: number }> = {
  absent: { 
    label: '未到', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50', 
    icon: <XCircle className="w-4 h-4" />,
    value: 0
  },
  half: { 
    label: '半天', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50', 
    icon: <Clock className="w-4 h-4" />,
    value: 0.5
  },
  full: { 
    label: '1天', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    value: 1
  },
  holiday: { 
    label: '节假日', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50', 
    icon: <Palmtree className="w-4 h-4" />,
    value: 0
  },
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check for admin mode in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'edit') {
      setIsAdmin(true);
    }
  }, []);

  // Load data from Backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/attendance');
        if (response.ok) {
          const data = await response.json();
          setRecords(data);
        }
      } catch (e) {
        console.error('Failed to fetch records', e);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchData();
  }, []);

  // Save data to Backend API
  const saveToBackend = async (newRecords: Record<string, AttendanceStatus>) => {
    if (!isAdmin) return;
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: newRecords }),
      });
    } catch (e) {
      console.error('Failed to save records', e);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (day: Date) => {
    if (!isAdmin) return;
    setSelectedDate(day);
  };

  const updateStatus = (status: AttendanceStatus) => {
    if (!selectedDate || !isAdmin) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newRecords = {
      ...records,
      [dateKey]: status
    };
    setRecords(newRecords);
    saveToBackend(newRecords);
    setSelectedDate(null);
  };

  const clearStatus = () => {
    if (!selectedDate || !isAdmin) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newRecords = { ...records };
    delete newRecords[dateKey];
    setRecords(newRecords);
    saveToBackend(newRecords);
    setSelectedDate(null);
  };

  // Statistics
  const stats = useMemo(() => {
    const currentMonthKey = format(currentDate, 'yyyy-MM');
    let monthlyTotal = 0;
    
    // Monthly total
    (Object.entries(records) as [string, AttendanceStatus][]).forEach(([dateStr, status]) => {
      if (dateStr.startsWith(currentMonthKey)) {
        monthlyTotal += STATUS_CONFIG[status].value;
      }
    });

    // Weekly check
    const weeksInMonth = [];
    let currentWeekStart = startOfISOWeek(monthStart);
    while (currentWeekStart <= monthEnd) {
      const weekEnd = endOfISOWeek(currentWeekStart);
      const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
      
      let weekTotal = 0;
      daysInWeek.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        const status = records[key];
        if (status) {
          weekTotal += STATUS_CONFIG[status].value;
        }
      });

      weeksInMonth.push({
        weekNum: getWeek(currentWeekStart),
        total: weekTotal,
        isFull: weekTotal >= 4,
        label: `${format(currentWeekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`
      });
      
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      currentWeekStart = nextWeek;
    }

    return { monthlyTotal, weeksInMonth };
  }, [records, currentDate, monthStart, monthEnd]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-8 h-8 text-indigo-600" />
              考勤助手
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">记录你的每一天努力</p>
          </div>
          
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button 
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 font-semibold min-w-[120px] text-center">
              {format(currentDate, 'yyyy年 MMMM', { locale: zhCN })}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const status = records[dateKey];
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <button
                    key={dateKey}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative h-24 md:h-32 p-2 border-r border-b border-slate-50 transition-all
                      flex flex-col items-center justify-start gap-1
                      ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'hover:bg-indigo-50/30'}
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                    `}
                  >
                    <span className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : ''}
                      ${!isCurrentMonth && !isToday ? 'text-slate-300' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    
                    {status && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`
                          mt-auto w-full py-1 px-1.5 rounded-md text-[10px] md:text-xs font-medium
                          flex items-center justify-center gap-1
                          ${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}
                        `}
                      >
                        {STATUS_CONFIG[status].icon}
                        <span className="hidden md:inline">{STATUS_CONFIG[status].label}</span>
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Stats Section */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                本月统计
              </h2>
              
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-indigo-600 text-sm font-medium">累计出勤</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-indigo-900">{stats.monthlyTotal}</span>
                    <span className="text-indigo-600 font-medium">天</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">每周达标 (≥4天)</p>
                  {stats.weeksInMonth.map((week, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">第 {idx + 1} 周</span>
                        <span className="text-[10px] text-slate-400">{week.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{week.total}天</span>
                        {week.isFull ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-2">
                  {isAdmin ? '管理模式' : '查看模式'}
                </h3>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  {isAdmin 
                    ? '点击日历日期即可打卡记录。数据将同步至服务器。' 
                    : '当前为只读模式，你可以查看考勤统计，但无法修改。'}
                </p>
                {!isAdmin && (
                  <p className="mt-2 text-[10px] text-indigo-300 italic">
                    提示：在 URL 后添加 ?mode=edit 即可进入编辑模式
                  </p>
                )}
              </div>
              <Info className="absolute -bottom-4 -right-4 w-24 h-24 text-indigo-500 opacity-20" />
            </div>
          </aside>
        </div>
      </div>

      {/* Selection Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">
                  {format(selectedDate, 'yyyy年MM月dd日')}
                </h3>
                <p className="text-slate-500 text-sm">选择考勤状态</p>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-3">
                {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG['absent']][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(key)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all
                      ${records[format(selectedDate, 'yyyy-MM-dd')] === key 
                        ? 'border-indigo-600 bg-indigo-50/50' 
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}
                    `}
                  >
                    <div className={`p-2 rounded-full ${config.bgColor} ${config.color}`}>
                      {config.icon}
                    </div>
                    <span className="font-bold text-slate-700">{config.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 bg-slate-50 flex gap-3">
                <button 
                  onClick={clearStatus}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  清除记录
                </button>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
