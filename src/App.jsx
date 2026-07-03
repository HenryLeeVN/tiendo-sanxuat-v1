import React, { useState, useEffect } from 'react';

const API_BASE = "https://script.google.com/macros/s/AKfycby_PRXEoH1_bMEwJUj0TyRB01k--3u74BzEaw2R5GI80xePIoKuV_8ZrBOwjEm36iJR/exec";

export default function App() {
  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [allReports, setAllReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProducts, setExpandedProducts] = useState({});
  const [selectedFrameFilter, setSelectedFrameFilter] = useState({}); // Lọc loại khung trong từng card sản phẩm

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}?action=report&_t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Không thể kết nối tới Google Sheet API");
      }
      const json = await response.json();
      if (json.success) {
        setAllReports(json);
      } else {
        throw new Error(json.message || "Lỗi tải dữ liệu");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const currentReport = allReports?.reports ? allReports.reports[filter] : null;

  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleFrameFilter = (productId, frameName) => {
    setSelectedFrameFilter(prev => ({
      ...prev,
      [productId]: frameName
    }));
  };

  const filteredProducts = currentReport?.products?.filter(product => {
    const q = searchQuery.toLowerCase();
    return (
      product.maSP.toLowerCase().includes(q) ||
      product.tenSP.toLowerCase().includes(q)
    );
  }) || [];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'producing':
        return { text: 'Đang SX', bg: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-l-[6px] border-l-blue-500' };
      case 'delay':
        return { text: 'Trễ tiến độ', bg: 'bg-red-100 text-red-800 border-red-200', border: 'border-l-[6px] border-l-red-500' };
      case 'onSchedule':
        return { text: 'Đúng tiến độ', bg: 'bg-green-100 text-green-800 border-green-200', border: 'border-l-[6px] border-l-green-500' };
      case 'ahead':
        return { text: 'Vượt tiến độ', bg: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-l-[6px] border-l-purple-500' };
      default:
        return { text: 'N/A', bg: 'bg-gray-100 text-gray-800 border-gray-200', border: 'border-l-[6px] border-l-gray-450' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      
      {/* 1. Header màu đỏ */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold uppercase tracking-wide">X.Cơ khí - Tiến độ sản xuất</h1>
            <p className="text-[10px] text-red-100 flex items-center mt-0.5 font-medium">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {allReports?.updateTime ? `Cập nhật: ${allReports.updateTime}` : 'Đang tải dữ liệu...'}
            </p>
          </div>
          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 3v4M7 9h8v3h-3v9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-3">

        {/* 2. Search Bar */}
        <div className="relative mb-3">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm sản phẩm theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 shadow-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 3. Phần lọc thời gian */}
        <div className="grid grid-cols-4 gap-1 bg-slate-200/80 p-1 rounded-xl shadow-inner mb-3">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'month', label: 'Tháng' },
            { id: 'all', label: 'Tất cả' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${
                filter === item.id 
                  ? 'bg-white text-red-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-xs mb-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-sm">Đã có lỗi xảy ra</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <button 
                  onClick={fetchAllData}
                  className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded shadow-xs transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white h-12 rounded-xl shadow-xs"></div>
              <div className="bg-white h-12 rounded-xl shadow-xs"></div>
            </div>
            <div className="bg-white h-32 rounded-xl shadow-xs"></div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && currentReport && (
          <>
            {/* 4. Phần tổng quan */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              <div className="bg-white rounded-xl shadow-2xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Đang SX</p>
                <p className="text-sm font-black text-blue-600 mt-0.5">{currentReport.summary.producing}</p>
              </div>

              <div className="bg-white rounded-xl shadow-2xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Vượt</p>
                <p className="text-sm font-black text-purple-600 mt-0.5">{currentReport.summary.ahead}</p>
              </div>

              <div className="bg-white rounded-xl shadow-2xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Đúng</p>
                <p className="text-sm font-black text-green-600 mt-0.5">{currentReport.summary.onSchedule}</p>
              </div>

              <div className="bg-white rounded-xl shadow-2xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Trễ</p>
                <p className="text-sm font-black text-red-600 mt-0.5">{currentReport.summary.delay}</p>
              </div>
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-xs">
                <p className="text-slate-500 font-medium text-xs">Không tìm thấy sản phẩm</p>
              </div>
            )}

            {/* 5. Danh sách sản phẩm */}
            <div className="space-y-3.5">
              {filteredProducts.map(prod => {
                const isExpanded = !!expandedProducts[prod.maSP];
                const badge = getStatusBadge(prod.trangThai);
                const currentFrameFilter = selectedFrameFilter[prod.maSP] || 'all';

                // Lọc danh sách khung hiển thị khi bấm Filter trong mục sổ xuống
                const displayedFrames = prod.khung.filter(k => {
                  if (currentFrameFilter === 'all') return true;
                  return k.tenRutGon === currentFrameFilter;
                });

                return (
                  <div 
                    key={prod.maSP} 
                    className={`bg-white border border-slate-150 rounded-xl shadow-xs overflow-hidden transition-all duration-200 ${badge.border}`}
                  >
                    {/* Header Card */}
                    <div className="p-3 flex items-start gap-3">
                      {/* Ảnh sản phẩm bên trái */}
                      {prod.hinhAnh ? (
                        <img 
                          src={prod.hinhAnh} 
                          alt={prod.tenSP}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-100 bg-slate-50 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-150 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Tên và Trạng thái */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border shrink-0 ${badge.bg}`}>
                            {badge.text}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-xs text-slate-800 line-clamp-2 mt-1 leading-snug">
                          {prod.tenSP}
                        </h3>

                        {/* SL đồng bộ dưới tên sản phẩm - 1 dòng sạch sẽ */}
                        <div className="text-[11px] font-bold text-slate-500 mt-1.5 flex items-center gap-1.5">
                          <span>Đồng bộ:</span>
                          <span className="text-slate-800 font-extrabold">{prod.dongBo}/{prod.keHoach}</span>
                          <span className={`font-black ml-1 ${prod.chenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {prod.chenhLech > 0 ? `+${prod.chenhLech}` : prod.chenhLech}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* HIỂN THỊ CÁC KHUNG TRỰC TIẾP TRÊN CARD */}
                    <div className="px-3 pb-3 pt-1">
                      <div className="grid grid-cols-3 gap-1.5">
                        {prod.khung.map(k => {
                          const isUnder = k.thucTe < k.keHoach;
                          return (
                            <div key={k.maKhung} className="bg-slate-50/80 border border-slate-100 rounded-lg p-2 text-center shadow-3xs">
                              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                {k.tenRutGon}
                              </span>
                              <span className={`block text-[11px] font-black mt-1 ${isUnder ? 'text-red-500' : 'text-green-600'}`}>
                                {k.thucTe}/{k.keHoach}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bút bấm sổ xuống */}
                    <button 
                      onClick={() => toggleExpand(prod.maSP)}
                      className="w-full px-3 py-1.5 text-[9px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 flex items-center justify-between border-t border-slate-100 bg-slate-50/30"
                    >
                      <span>{isExpanded ? 'Ẩn thông tin cấu hình' : 'Xem cấu hình BOM & Thông số chi tiết'}</span>
                      <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-red-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Chi tiết BOM khi sổ xuống (Chỉ còn số liệu thô: Kế hoạch, Thực tế, Chênh lệch) */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 p-2.5 space-y-2">
                        
                        {/* Filter loại khung */}
                        {prod.khung.length > 0 && (
                          <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-150">
                            <button
                              onClick={() => handleFrameFilter(prod.maSP, 'all')}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                                currentFrameFilter === 'all' 
                                  ? 'bg-red-500 border-red-500 text-white' 
                                  : 'bg-white border-slate-200 text-slate-500'
                              }`}
                            >
                              Tất cả khung
                            </button>
                            {prod.khung.map(k => (
                              <button
                                key={k.maKhung}
                                onClick={() => handleFrameFilter(prod.maSP, k.tenRutGon)}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                                  currentFrameFilter === k.tenRutGon 
                                    ? 'bg-red-500 border-red-500 text-white' 
                                    : 'bg-white border-slate-200 text-slate-500'
                                }`}
                              >
                                {k.tenRutGon}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Danh sách thông số số liệu tinh gọn (Không biểu đồ, không %, không màu mè phức tạp) */}
                        {displayedFrames.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic text-center py-1">Không có dữ liệu phù hợp</p>
                        ) : (
                          displayedFrames.map(k => {
                            return (
                              <div key={k.maKhung} className="bg-white border border-slate-100 p-2 rounded-lg shadow-3xs">
                                <div className="flex items-start justify-between gap-1.5">
                                  <div>
                                    <h4 className="font-bold text-[10px] text-slate-800 leading-tight">
                                      {k.tenKhung}
                                    </h4>
                                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                                      Mã khung: {k.maKhung}
                                    </p>
                                  </div>
                                  <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 shrink-0">
                                    Định mức BOM: {k.bom}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded p-1 text-center text-[9px] font-bold text-slate-600 mt-1.5">
                                  <div>
                                    <span className="block text-[7px] font-normal text-slate-400">Định mức kế hoạch</span>
                                    <span>{k.keHoach}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[7px] font-normal text-slate-400">Sản lượng thực tế</span>
                                    <span>{k.thucTe}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[7px] font-normal text-slate-400">Chênh lệch</span>
                                    <span className={k.chenhLech < 0 ? 'text-red-600' : k.chenhLech > 0 ? 'text-purple-600' : 'text-green-600'}>
                                      {k.chenhLech > 0 ? `+${k.chenhLech}` : k.chenhLech}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
