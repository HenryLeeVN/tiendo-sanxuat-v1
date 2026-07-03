import React, { useState, useEffect } from 'react';

const API_BASE = "https://script.google.com/macros/s/AKfycby_PRXEoH1_bMEwJUj0TyRB01k--3u74BzEaw2R5GI80xePIoKuV_8ZrBOwjEm36iJR/exec";

export default function App() {
  const [filter, setFilter] = useState('today'); // Bộ lọc đang chọn: 'today', 'week', 'month', 'all'
  const [allReports, setAllReports] = useState(null); // Lưu trữ toàn bộ 4 báo cáo đã tải về
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProducts, setExpandedProducts] = useState({});

  // Tải dữ liệu gộp từ Google Sheet
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Thêm _t=Date.now() để phá cache của trình duyệt Zalo, ép Zalo luôn tải dữ liệu mới nhất
      const url = `${API_BASE}?action=report&_t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Không thể kết nối tới Google Sheet API");
      }
      const json = await response.json();
      if (json.success) {
        setAllReports(json); // Lưu toàn bộ cụm dữ liệu vào bộ nhớ máy
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

  // Lấy ra phần dữ liệu tương ứng với bộ lọc đang được chọn (Xử lý tức thì không cần mạng)
  const currentReport = allReports?.reports ? allReports.reports[filter] : null;

  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Tìm kiếm sản phẩm
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
        return { text: 'Đang SX', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'delay':
        return { text: 'Trễ tiến độ', bg: 'bg-red-100 text-red-800 border-red-200' };
      case 'onSchedule':
        return { text: 'Đúng tiến độ', bg: 'bg-green-100 text-green-800 border-green-200' };
      case 'ahead':
        return { text: 'Vượt tiến độ', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      default:
        return { text: 'N/A', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider">Tiến Độ Sản Xuất MVP</h1>
            <p className="text-[10px] text-blue-100 flex items-center mt-0.5">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {allReports?.updateTime ? `Cập nhật: ${allReports.updateTime}` : 'Đang tải...'}
            </p>
          </div>
          {/* Nút Làm mới (Tải lại từ Google Sheet) */}
          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="p-1.5 bg-blue-500/30 hover:bg-blue-500/50 rounded-full transition-colors duration-200 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 3v4M7 9h8v3h-3v9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-3">
        {/* Filter Buttons - BẤM VÀO ĐÂY SẼ CHUYỂN NGAY LẬP TỨC (0.01 GIÂY) */}
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
              className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 ${
                filter === item.id 
                  ? 'bg-white text-blue-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
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
            <div className="bg-white h-16 rounded-xl shadow-xs"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white h-12 rounded-xl shadow-xs"></div>
              <div className="bg-white h-12 rounded-xl shadow-xs"></div>
            </div>
            <div className="bg-white h-10 rounded-xl shadow-xs"></div>
            <div className="bg-white h-32 rounded-xl shadow-xs"></div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && currentReport && (
          <>
            {/* Summary Section */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <div className="col-span-4 bg-white rounded-xl shadow-xs border border-slate-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TỔNG SỐ SẢN PHẨM</p>
                  <p className="text-xl font-black text-slate-800 mt-0.5">{currentReport.summary.totalProduct}</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">ĐÚNG</p>
                <p className="text-sm font-black text-green-600 mt-0.5">{currentReport.summary.onSchedule}</p>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">TRỄ</p>
                <p className="text-sm font-black text-red-600 mt-0.5">{currentReport.summary.delay}</p>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">ĐANG SX</p>
                <p className="text-sm font-black text-blue-600 mt-0.5">{currentReport.summary.producing}</p>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">VƯỢT</p>
                <p className="text-sm font-black text-purple-600 mt-0.5">{currentReport.summary.ahead}</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
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

            {/* Empty State */}
            {filteredProducts.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-xs">
                <p className="text-slate-500 font-medium text-xs">Không tìm thấy sản phẩm</p>
              </div>
            )}

            {/* Product List */}
            <div className="space-y-3">
              {filteredProducts.map(prod => {
                const isExpanded = !!expandedProducts[prod.maSP];
                const badge = getStatusBadge(prod.trangThai);
                return (
                  <div key={prod.maSP} className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden">
                    {/* Header */}
                    <div className="p-3 flex items-start gap-2.5">
                      {prod.hinhAnh ? (
                        <img 
                          src={prod.hinhAnh} 
                          alt={prod.tenSP}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-100 bg-slate-50 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-150 shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {prod.maSP}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-full border shrink-0 ${badge.bg}`}>
                            {badge.text}
                          </span>
                        </div>
                        <h3 className="font-bold text-xs text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                          {prod.tenSP}
                        </h3>
                      </div>
                    </div>

                    {/* Overall Progress Stats */}
                    <div className="grid grid-cols-3 border-y border-slate-50 bg-slate-50/50 text-center py-2 px-3 text-[10px] font-semibold">
                      <div className="border-r border-slate-100">
                        <p className="text-[8px] text-slate-400 font-medium uppercase">Kế hoạch</p>
                        <p className="text-slate-700 font-bold mt-0.5">{prod.keHoach}</p>
                      </div>
                      <div className="border-r border-slate-100">
                        <p className="text-[8px] text-slate-400 font-medium uppercase">Đồng bộ</p>
                        <p className="text-slate-800 font-black mt-0.5">{prod.dongBo}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-medium uppercase">Chênh lệch</p>
                        <p className={`font-black mt-0.5 ${
                          prod.chenhLech < 0 ? 'text-red-600' : prod.chenhLech > 0 ? 'text-purple-600' : 'text-green-600'
                        }`}>
                          {prod.chenhLech > 0 ? `+${prod.chenhLech}` : prod.chenhLech}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button 
                      onClick={() => toggleExpand(prod.maSP)}
                      className="w-full px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 flex items-center justify-between border-t border-slate-50"
                    >
                      <span>{isExpanded ? 'Ẩn chi tiết khung BOM' : 'Xem chi tiết khung BOM'}</span>
                      <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* BOM Details */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 p-2.5 space-y-2">
                        {prod.khung.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic text-center py-1">Sản phẩm chưa cấu hình BOM</p>
                        ) : (
                          prod.khung.map(k => {
                            const progressPercent = k.keHoach > 0 
                              ? Math.min(Math.round((k.thucTe / k.keHoach) * 100), 100) 
                              : k.thucTe > 0 ? 100 : 0;
                            
                            const barColor = k.chenhLech < 0 
                              ? 'bg-red-500' 
                              : k.keHoach === 0 && k.thucTe > 0 
                                ? 'bg-blue-500' 
                                : 'bg-green-500';

                            return (
                              <div key={k.maKhung} className="bg-white border border-slate-100 p-2 rounded-lg shadow-2xs">
                                <div className="flex items-start justify-between gap-1.5">
                                  <div>
                                    <h4 className="font-bold text-[10px] text-slate-800 leading-tight">
                                      {k.tenRutGon}
                                    </h4>
                                    <p className="text-[7px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px]">
                                      {k.maKhung}
                                    </p>
                                  </div>
                                  <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                                    BOM: {k.bom}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded p-1 text-center text-[9px] font-bold text-slate-600 mt-1.5">
                                  <div>
                                    <span className="block text-[7px] font-normal text-slate-400">Kế hoạch</span>
                                    <span>{k.keHoach}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[7px] font-normal text-slate-400">Thực tế</span>
                                    <span>{k.thucTe}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[7px] font-normal text-slate-400">Chênh lệch</span>
                                    <span className={k.chenhLech < 0 ? 'text-red-600' : k.chenhLech > 0 ? 'text-purple-600' : 'text-green-600'}>
                                      {k.chenhLech > 0 ? `+${k.chenhLech}` : k.chenhLech}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                      style={{ width: `${progressPercent}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[8px] font-bold text-slate-500 shrink-0 w-6 text-right">
                                    {progressPercent}%
                                  </span>
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
