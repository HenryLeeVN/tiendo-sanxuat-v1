import React, { useState, useEffect, useRef } from 'react';

const API_BASE = "https://script.google.com/macros/s/AKfycbzTy7rkjZbkozDUQoA7hjW8YstP6V3uqHqQXukbMOD6qlQv7IvYXO-vHbPbMG_2LYul/exec"; // <-- ĐÃ ĐỒNG BỘ LINK WEB APP MỚI CỦA BẠN

export default function App() {
  const [activeDept, setActiveDept] = useState('cokhi'); // Phân hệ phòng ban chính: 'cokhi' (Đang chạy), 'raphan' (Đang phát triển), 'dinhhinh' (Đang phát triển), 'khuonga' (Đang phát triển)
  const [activeTab, setActiveTab] = useState('dailyPlan'); // 'dailyPlan' (Theo ngày), 'ctsxProgress' (Theo CTSX)
  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [selectedCTSX, setSelectedCTSX] = useState('totalOrder'); // 'totalOrder', 'unallocated', 'LSX08'...
  
  const [allReports, setAllReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Trạng thái lưu trữ độc lập để sửa dứt điểm lỗi nhảy trang khi bấm nút lọc
  const [selectedProductName, setSelectedProductName] = useState(null); // Lưu tên sản phẩm sạch
  const [detailTimeFilter, setDetailTimeFilter] = useState('today'); 
  const [detailFrameFilter, setDetailFrameFilter] = useState('all');

  // Bộ nhớ tạm lưu tọa độ cảm ứng để chống chạm nhầm mép trái tuyệt đối (Edge Swipe 1.5cm)
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchEndRef = useRef({ x: 0, y: 0 });
  const touchMovedRef = useRef(false);

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    touchMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    touchMovedRef.current = true;
  };

  const handleTouchEnd = () => {
    if (!touchMovedRef.current) return; // Chạm nhẹ -> Bỏ qua

    const diffX = touchEndRef.current.x - touchStartRef.current.x;
    const diffY = Math.abs(touchEndRef.current.y - touchStartRef.current.y);

    // Nếu cuộn dọc -> Bỏ qua
    if (diffY > 45) return;

    // Chỉ vuốt sát mép trái (trong khoảng 50px đầu tiên) qua phải mới kích hoạt lùi trang
    const isStartNearLeftEdge = touchStartRef.current.x < 50;
    if (isStartNearLeftEdge && diffX > 80 && selectedProductName) {
      setSelectedProductName(null);
    }
  };

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

  // Nếu là Tab Theo CTSX thì luôn luôn lấy mốc thời gian 'all' để xem tiến độ tích lũy trọn vẹn, không bị giới hạn ngày
  const activeFilter = activeTab === 'ctsxProgress' ? 'all' : filter;
  
  // Áp dụng cấu trúc dữ liệu tương ứng dựa theo nút bấm đang chọn trong Tab 2
  const isTotalOrderView = activeTab === 'ctsxProgress' && (selectedCTSX === 'totalOrder' || selectedCTSX === 'unallocated');
  const activeReportKey = isTotalOrderView ? 'totalOrder' : activeTab;

  const currentTabReport = allReports?.reports && allReports.reports[activeFilter] 
    ? allReports.reports[activeFilter][activeReportKey] 
    : null;

  // Lọc danh sách sản phẩm trang tổng
  const filteredProducts = currentTabReport?.products?.filter(product => {
    const matchSearch = product.tenSP.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchCTSX = true;
    if (activeTab === 'ctsxProgress' && selectedCTSX !== 'totalOrder' && selectedCTSX !== 'unallocated') {
      matchCTSX = product.soCTSX === selectedCTSX;
    }

    return matchSearch && matchCTSX;
  }) || [];

  // Lấy dữ liệu sản phẩm trong trang chi tiết độc lập
  const activeDetailProduct = selectedProductName && allReports?.reports
    ? allReports.reports[detailTimeFilter]?.[activeReportKey]?.products.find(p => {
        if (activeReportKey === 'ctsxProgress') {
          return p.tenSP === selectedProductName && p.soCTSX === selectedCTSX;
        }
        return p.tenSP === selectedProductName;
      })
    : null;

  // Lọc bảng lịch sử trong trang chi tiết trượt phải
  const filteredHistoryRows = activeDetailProduct?.history ? activeDetailProduct.history.filter(h => {
    const matchSearchHistory = h.tenRutGon.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFrameHistory = detailFrameFilter === 'all' || h.tenRutGon === detailFrameFilter;
    return matchSearchHistory && matchFrameHistory;
  }) : [];

  // Tách lọc danh sách CTSX của RIÊNG sản phẩm hiện hành để hiển thị nút bấm dẹt trong trang chi tiết
  const productSpecificCtsxList = selectedProductName && allReports?.reports?.all?.ctsxProgress?.products
    ? allReports.reports.all.ctsxProgress.products
        .filter(p => p.tenSP === selectedProductName)
        .map(p => p.soCTSX)
    : [];

  const getStatusBadge = (status) => {
    if (activeTab === 'ctsxProgress' && (status === 'onSchedule' || status === 'ahead')) {
      return { text: 'Hoàn thành', bg: 'bg-green-100 text-green-800 border-green-200', border: 'border-l-[5px] border-l-green-500' };
    }
    switch(status) {
      case 'producing':
        return { text: 'Đang SX', bg: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-l-[5px] border-l-blue-500' };
      case 'delay':
        return { text: 'Trễ tiến độ', bg: 'bg-red-100 text-red-800 border-red-200', border: 'border-l-[5px] border-l-red-500' };
      case 'onSchedule':
        return { text: 'Đúng tiến độ', bg: 'bg-green-100 text-green-800 border-green-200', border: 'border-l-[5px] border-l-green-500' };
      case 'ahead':
        return { text: 'Vượt tiến độ', bg: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-l-[5px] border-l-purple-500' };
      default:
        return { text: 'N/A', bg: 'bg-gray-100 text-gray-800 border-gray-200', border: 'border-l-[5px] border-l-gray-400' };
    }
  };

  const formatNum = (num) => {
    return Number(num || 0).toLocaleString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      
      {/* 1. HIỂN THỊ PHÂN HỆ CƠ KHÍ HIỆN TẠI (CHỈ CHẠY KHI ĐANG CHỌN TAB CƠ KHÍ) */}
      {activeDept === 'cokhi' ? (
        <>
          {/* HEADER TĨNH MÀU XÁM THAN CHÌ */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-4 py-3 shadow-sm">
            <div className="max-w-md mx-auto flex items-center justify-between">
              
              <div className="flex items-center gap-2.5">
                <img 
                  src="https://letranfurniture.com/wp-content/uploads/2025/01/Logo-removebg-preview.png" 
                  alt="Lê Trần Furniture" 
                  className="h-7.5 w-auto object-contain shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="min-w-0 text-left">
                  <h1 className="text-[11px] font-black uppercase tracking-wider text-white">Lê Trần Furniture</h1>
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-0.5">Xưởng Cơ khí - Tiến độ</p>
                </div>
              </div>

              <button 
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 shrink-0 shadow-3xs"
              >
                <span>Tải lại</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-500 ${loading ? 'animate-spin text-red-500' : 'hover:rotate-180 text-slate-300'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 3v4M7 9h8v3h-3v9" />
                </svg>
              </button>

            </div>
          </div>

          {/* CỤM STICKY LUÔN CỐ ĐỊNH Ở ĐẦU TRANG KHI VUỐT LÊN */}
          <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-3.5 pb-2.5 px-4 border-b border-slate-200/60 shadow-xs space-y-2.5">
            <div className="max-w-md mx-auto space-y-2.5">
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Tìm khung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-8 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 shadow-3xs"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 2 Tab lớn sửa tên thành: Theo ngày, Theo CTSX */}
              <div className="flex border-b border-slate-250">
                {[
                  { id: 'dailyPlan', label: 'Theo ngày' },
                  { id: 'ctsxProgress', label: 'Theo CTSX' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedCTSX(tab.id === 'ctsxProgress' ? 'totalOrder' : 'all'); 
                    }}
                    className={`flex-1 py-2 text-xs font-black text-center border-b-2 transition-all duration-150 ${
                      activeTab === tab.id 
                        ? 'border-red-600 text-red-600 font-extrabold' 
                        : 'border-transparent text-slate-500 font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Dải Chip lọc con dẹp nằm dưới Tab */}
              <div>
                {activeTab === 'dailyPlan' ? (
                  <div className="grid grid-cols-4 gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                    {[
                      { id: 'today', label: 'Hôm nay' },
                      { id: 'week', label: 'Tuần này' },
                      { id: 'month', label: 'Tháng' },
                      { id: 'all', label: 'Tất cả' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setFilter(item.id)}
                        className={`py-1 text-[11px] font-extrabold rounded-md transition-all duration-150 ${
                          filter === item.id 
                            ? 'bg-white text-red-600 shadow-2xs' 
                            : 'text-slate-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                    <button
                      onClick={() => setSelectedCTSX('totalOrder')}
                      className={`px-3 py-1 text-xs font-black rounded-lg border transition-all shrink-0 ${
                        selectedCTSX === 'totalOrder'
                          ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Tổng order
                    </button>
                    <button
                      onClick={() => setSelectedCTSX('unallocated')}
                      className={`px-3 py-1 text-xs font-black rounded-lg border transition-all shrink-0 ${
                        selectedCTSX === 'unallocated'
                      ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  Chưa phân bổ
                </button>
                {allReports?.ctsxList?.map(so => (
                  <button
                    key={so}
                    onClick={() => setSelectedCTSX(so)}
                    className={`px-3 py-1 text-xs font-black rounded-lg border transition-all duration-150 shrink-0 ${
                      selectedCTSX === so
                        ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {so}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* THÂN DANH SÁCH SẢN PHẨM CHÍNH (Đệm pb-24 dưới đáy để không bị Menu nổi che mất) */}
      <div className="max-w-md mx-auto px-4 mt-3 pb-24">

        {/* 4 Chip tổng quan */}
        {!loading && !error && currentTabReport && (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Đang SX</p>
              <p className="text-xs font-black text-blue-600 mt-0.5">{formatNum(currentTabReport.summary.producing)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Vượt</p>
              <p className="text-xs font-black text-purple-600 mt-0.5">{formatNum(currentTabReport.summary.ahead)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Đúng</p>
              <p className="text-xs font-black text-green-600 mt-0.5">{formatNum(currentTabReport.summary.onSchedule)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Trễ</p>
              <p className="text-xs font-black text-red-600 mt-0.5">{formatNum(currentTabReport.summary.delay)}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5 animate-pulse">
            <div className="bg-white h-14 rounded-lg shadow-3xs"></div>
            <div className="bg-white h-14 rounded-lg shadow-3xs"></div>
          </div>
        )}

        {/* Thân danh sách các sản phẩm (Card ngắn dẹt tối ưu) */}
        {!loading && !error && currentTabReport && (
          <div className="space-y-2">
            {filteredProducts.map(prod => {
              const badge = getStatusBadge(prod.trangThai);
              const uniqueKey = activeTab === 'ctsxProgress' ? prod.soCTSX + prod.tenSP : prod.tenSP;
              const isProducingCurrently = prod.khung.some(k => k.thucTe > 0);

              return (
                <div 
                  key={uniqueKey} 
                  onClick={() => {
                    setSelectedProductName(prod.tenSP); 
                    setDetailTimeFilter(activeFilter); 
                    setDetailFrameFilter('all');
                  }}
                  className={`bg-white border border-slate-150 rounded-lg shadow-3xs overflow-hidden transition-all duration-150 active:bg-slate-100 flex flex-col justify-between p-2.5 cursor-pointer ${badge.border}`}
                >
                  <div className="flex items-center gap-2.5 justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      {prod.hinhAnh ? (
                        <img 
                          src={prod.hinhAnh} 
                          alt={prod.tenSP}
                          className="w-9 h-9 object-cover rounded border border-slate-100 bg-slate-50 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-450 border border-slate-150 shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1 text-left">
                        <h3 className="font-extrabold text-xs text-slate-800 break-words leading-tight pr-1">
                          {activeTab === 'ctsxProgress' && prod.soCTSX && (
                            <span className="text-red-600 font-black mr-1 text-[10px] bg-red-50 border border-red-100 px-1 rounded">
                              {prod.soCTSX}
                            </span>
                          )}
                          {prod.tenSP}
                        </h3>

                        {/* SL hiển thị gọn, phân biệt rõ ràng màu sắc KH / TH */}
                        <div className="text-[10px] font-bold text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
                          {activeTab === 'dailyPlan' && (
                            <>
                              <span className="text-slate-400 font-bold">Thực hiện:</span>
                              <span className="text-slate-900 font-black">{formatNum(prod.dongBo)}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 font-bold">Kế hoạch ngày:</span>
                              <span className="text-slate-900 font-extrabold">{formatNum(prod.keHoach)}</span>
                            </>
                          )}
                          {activeTab === 'ctsxProgress' && selectedCTSX === 'totalOrder' && (
                            <>
                              <span className="text-slate-400 font-bold">Thực hiện tích lũy:</span>
                              <span className="text-slate-900 font-black">{formatNum(prod.dongBo)}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 font-bold">Tổng đơn hàng:</span>
                              <span className="text-slate-900 font-extrabold">{formatNum(prod.orderQty)}</span>
                            </>
                          )}
                          {activeTab === 'ctsxProgress' && selectedCTSX === 'unallocated' && (
                            <>
                              <span className="text-slate-400 font-bold">Tổng order:</span>
                              <span className="text-slate-900 font-extrabold">{formatNum(prod.orderQty)}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 font-bold">Đã chia:</span>
                              <span className="text-red-600 font-extrabold">{formatNum(prod.allocated)}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 font-bold">Chưa chia:</span>
                              <span className="text-slate-900 font-extrabold">{formatNum(prod.unallocated)}</span>
                            </>
                          )}
                          {activeTab === 'ctsxProgress' && selectedCTSX !== 'totalOrder' && selectedCTSX !== 'unallocated' && (
                            <>
                              <span className="text-slate-400 font-bold">Thực hiện mẻ:</span>
                              <span className="text-slate-900 font-black">{formatNum(prod.dongBo)}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 font-bold">Mục tiêu CTSX:</span>
                              <span className="text-slate-900 font-extrabold">{formatNum(prod.keHoach)}</span>
                            </>
                          )}
                          <span className={`font-black ml-0.5 ${prod.chenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ({prod.chenhLech > 0 ? `+${formatNum(prod.chenhLech)}` : formatNum(prod.chenhLech)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border ${badge.bg}`}>
                        {badge.text}
                      </span>
                      {isProducingCurrently && (
                        <span className="px-1 py-0.5 text-[7px] font-black uppercase rounded bg-blue-100 text-blue-700 border border-blue-200">
                          Đang SX
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Linh kiện dẹt nằm ngang (Đồng bộ nhãn viết tắt TH / KH) */}
                  <div className="flex flex-wrap gap-1 mt-2 border-t border-slate-100/60 pt-1.5 text-left">
                    {prod.khung.map(k => {
                      const isUnder = k.thucTe < k.keHoach;
                      return (
                        <div 
                          key={k.maKhung} 
                          className="bg-slate-100/60 border border-slate-200/50 rounded px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1"
                        >
                          <span className="text-slate-455 uppercase">{k.tenRutGon}:</span>
                          <span className={isUnder ? 'text-red-500 font-black' : 'text-green-600 font-black'}>
                            TH {formatNum(k.thucTe)} | KH {formatNum(k.keHoach)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      ) : (
        /* 2. HIỂN THỊ GIAO DIỆN CHỜ (COMING SOON) CHO CÁC PHÒNG BAN KHÁC ĐANG PHÁT TRIỂN */
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.001 0 01-1.564-.317z" />
            </svg>
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Tính năng đang phát triển</h2>
          <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed">
            Phân hệ quản lý sản xuất chuyên sâu dành riêng cho bộ phận <b className="text-slate-700">
              {activeDept === 'raphan' ? 'Ráp hàn' : activeDept === 'dinhhinh' ? 'Định hình' : 'Khuôn gá'}
            </b> đang được xây dựng dựa trên đặc thù nguồn dữ liệu xưởng.
          </p>
          <button 
            onClick={() => setActiveDept('cokhi')}
            className="mt-6 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition-all"
          >
            Quay lại phân hệ Cơ khí
          </button>
        </div>
      )}

      {/* 3. MÀN HÌNH CHI TIẾT TRƯỢT SANG PHẢI (Drawer) */}
      <div 
        className={`fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs transition-opacity duration-300 ${
          activeDetailProduct ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full max-w-md bg-slate-50 h-full flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${
            activeDetailProduct ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* CỤM STICKY TRANG CHI TIẾT (Back + Tên dẹt + Ô tìm kiếm + Bộ lọc con luôn ghim cố định khi vuốt) */}
          <div className="sticky top-0 z-50 bg-slate-50 border-b border-slate-200/60 shadow-xs space-y-2 pt-3.5 pb-2.5 px-4">
            
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <button 
                onClick={() => setSelectedProductName(null)}
                className="flex items-center text-xs font-bold bg-white border border-slate-250 text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 shadow-3xs"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                </svg>
                Quay lại
              </button>
              
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <img 
                  src="https://letranfurniture.com/wp-content/uploads/2025/01/Logo-removebg-preview.png" 
                  alt="Lê Trần" 
                  className="h-6 w-auto object-contain shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <h2 className="text-xs font-extrabold text-slate-800 break-words leading-tight pr-1 text-left">
                  {activeDetailProduct && activeTab === 'ctsxProgress' && (
                    <span className="text-red-600 font-black mr-1 text-[10px] bg-red-50 border border-red-100 px-1 rounded">
                      {activeDetailProduct.soCTSX}
                    </span>
                  )}
                  {selectedProductName}
                </h2>
              </div>
            </div>

            {/* Ô tìm kiếm khung dẹt cố định */}
            <div className="relative max-w-md mx-auto">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm khung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-8 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 shadow-3xs"
              />
            </div>

            {/* BỘ LỌC CON LUÔN GHIM CỐ ĐỊNH Ở ĐẦU TRANG CHI TIẾT */}
            <div className="max-w-md mx-auto pt-1">
              {activeTab === 'dailyPlan' ? (
                <div className="grid grid-cols-4 gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                  {[
                    { id: 'today', label: 'Hôm nay' },
                    { id: 'week', label: 'Tuần này' },
                    { id: 'month', label: 'Tháng' },
                    { id: 'all', label: 'Tất cả' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setDetailTimeFilter(item.id)}
                      className={`py-1 text-[10px] font-bold rounded transition-all duration-150 ${
                        detailTimeFilter === item.id 
                          ? 'bg-white text-red-600 shadow-2xs' 
                          : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                  <button
                    onClick={() => setSelectedCTSX('totalOrder')}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition-all shrink-0 ${
                      selectedCTSX === 'totalOrder'
                        ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    Tổng order
                  </button>
                  <button
                    onClick={() => setSelectedCTSX('unallocated')}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition-all shrink-0 ${
                      selectedCTSX === 'unallocated'
                        ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    Chưa phân bổ
                  </button>
                  {productSpecificCtsxList.map(so => (
                    <button
                      key={so}
                      onClick={() => setSelectedCTSX(so)}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition-all duration-150 shrink-0 ${
                        selectedCTSX === so
                          ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {so}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Nội dung chi tiết */}
          {activeDetailProduct && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* CARD NGANG TÍCH HỢP TỔNG QUAN VÀ PHÂN BỔ CTSX */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-3.5 shadow-3xs text-left">
                
                <div className="flex gap-3.5 items-start">
                  {activeDetailProduct.hinhAnh ? (
                    <img 
                      src={activeDetailProduct.hinhAnh} 
                      alt={activeDetailProduct.tenSP}
                      className="w-24 h-24 object-cover rounded-lg border border-slate-100 bg-slate-50 shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-150 shrink-0">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-xs text-slate-900 break-words leading-tight">
                      {activeDetailProduct.tenSP}
                    </h3>
                    
                    {activeTab === 'ctsxProgress' && activeDetailProduct.remainingDays && (
                      <div className="flex items-center gap-1 mt-1.5 text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded w-fit">
                        <span>⏰ {activeDetailProduct.remainingDays}</span>
                      </div>
                    )}

                    {/* Phân biệt lề lối rõ ràng màu chữ và nhãn KH / TH */}
                    <div className="text-[10px] font-bold text-slate-500 mt-2 space-y-1 border-t border-slate-100 pt-2">
                      {activeTab === 'dailyPlan' ? (
                        <>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Kế hoạch ngày (KH):</span><span className="text-slate-900 font-extrabold">{formatNum(activeDetailProduct.keHoach)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Thực hiện ngày (TH):</span><span className="text-slate-900 font-black">{formatNum(activeDetailProduct.dongBo)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Chênh lệch ngày:</span><span className={`font-black ${activeDetailProduct.chenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>{activeDetailProduct.chenhLech > 0 ? `+${formatNum(activeDetailProduct.chenhLech)}` : formatNum(activeDetailProduct.chenhLech)}</span></div>
                        </>
                      ) : selectedCTSX === 'unallocated' ? (
                        <>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Tổng đơn hàng:</span><span className="text-slate-900 font-extrabold">{formatNum(activeDetailProduct.orderQty)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Đã chia chỉ thị:</span><span className="text-slate-900 font-extrabold">{formatNum(activeDetailProduct.allocated)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Chưa chia chỉ thị:</span><span className="text-red-600 font-extrabold">{formatNum(activeDetailProduct.unallocated)}</span></div>
                        </>
                      ) : selectedCTSX === 'totalOrder' ? (
                        <>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Tổng đơn hàng (Order):</span><span className="text-slate-900 font-extrabold">{formatNum(activeDetailProduct.orderQty)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Thực hiện tích lũy:</span><span className="text-slate-900 font-black">{formatNum(activeDetailProduct.dongBo)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Còn lại đơn hàng:</span><span className="text-red-600 font-black">{formatNum(activeDetailProduct.orderQty - activeDetailProduct.dongBo)}</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Mục tiêu {selectedCTSX}:</span><span className="text-slate-900 font-extrabold">{formatNum(activeDetailProduct.keHoach)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Thực hiện chỉ thị:</span><span className="text-slate-900 font-black">{formatNum(activeDetailProduct.dongBo)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">Còn lại chỉ thị:</span><span className="text-red-600 font-black">{formatNum(activeDetailProduct.keHoach - activeDetailProduct.dongBo > 0 ? activeDetailProduct.keHoach - activeDetailProduct.dongBo : 0)}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* BẢNG TỔNG QUAN PHÂN BỔ CTSX ĐƯỢC GỘP GỌN BÊN DƯỚI CARD ẢNH (Chỉ hiện khi xem Tab CTSX) */}
                {activeTab === 'ctsxProgress' && (
                  <div className="border-t border-slate-100 pt-2.5 space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <span>Phân bổ tiến độ các Chỉ thị (CTSX)</span>
                      <span className="text-slate-800">Tích lũy: {formatNum(activeDetailProduct.dongBo)}/{formatNum(activeDetailProduct.orderQty)}</span>
                    </div>
                    <div className="overflow-hidden border border-slate-150 rounded-lg">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-150">
                            <th className="py-1.5 px-3 text-left">Chỉ thị</th>
                            <th className="py-1.5 px-1 text-right">Mục tiêu</th>
                            <th className="py-1.5 px-1 text-right">Đã làm</th>
                            <th className="py-1.5 px-3 text-right">Còn lại</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allReports?.reports?.all?.ctsxProgress?.products
                            ?.filter(p => p.tenSP === selectedProductName && (isTotalOrderView || p.soCTSX === selectedCTSX))
                            .map((pC, idx) => {
                              const remaining = pC.keHoach - pC.dongBo;
                              return (
                                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                  <td className="py-1.5 px-3 font-bold text-red-600 font-mono text-left">{pC.soCTSX}</td>
                                  <td className="py-1.5 px-1 text-right text-slate-600 font-bold">{formatNum(pC.keHoach)}</td>
                                  <td className="py-1.5 px-1 text-right text-slate-800 font-black">{formatNum(pC.dongBo)}</td>
                                  <td className={`py-1.5 px-3 text-right font-black ${remaining > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {remaining > 0 ? formatNum(remaining) : 0}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Bộ lọc khung */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bộ lọc khung</h3>
                <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-200">
                  <button
                    onClick={() => setDetailFrameFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 ${
                      detailFrameFilter === 'all'
                        ? 'bg-red-500 border-red-500 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả
                  </button>
                  {activeDetailProduct.khung.map(k => (
                    <button
                      key={k.maKhung}
                      onClick={() => setDetailFrameFilter(k.tenRutGon)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 ${
                        detailFrameFilter === k.tenRutGon
                          ? 'bg-red-500 border-red-500 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {k.tenRutGon} ({k.bom})
                    </button>
                  ))}
                </div>
              </div>

              {/* Bảng chi tiết: Ngày | Tên khung | Kế hoạch | Thực hiện | +- */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bảng lịch sử chi tiết</h3>
                <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-24">Ngày</th>
                        <th className="py-2.5 px-2 text-left">Tên khung</th>
                        {activeTab === 'dailyPlan' ? (
                          <>
                            <th className="py-2.5 px-2 text-right">Kế hoạch</th>
                            <th className="py-2.5 px-2 text-right">Thực hiện</th>
                            <th className="py-2.5 px-3 text-center w-14">+-</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-2 text-center w-20">Chỉ thị</th>
                            <th className="py-2.5 px-3 text-right">Thực hiện</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* DÒNG TỔNG CỘNG Ở ĐẦU BẢNG */}
                      {(() => {
                        if (filteredHistoryRows.length === 0) return null;

                        const totalKeHoach = filteredHistoryRows.reduce((sum, h) => sum + h.keHoach, 0);
                        const totalThucTe = filteredHistoryRows.reduce((sum, h) => sum + h.thucTe, 0);
                        const totalChenhLech = totalThucTe - totalKeHoach;

                        return (
                          <tr className="bg-slate-100/90 font-black border-b border-slate-200/80">
                            <td className="py-2.5 px-3 text-center text-[10px] text-slate-600 font-extrabold">TỔNG</td>
                            <td className="py-2.5 px-2 text-slate-800 text-[11px] text-left">Tất cả</td>
                            {activeTab === 'dailyPlan' ? (
                              <>
                                <td className="py-2.5 px-2 text-right text-slate-700">{formatNum(totalKeHoach)}</td>
                                <td className="py-2.5 px-2 text-right text-slate-900 font-black">{formatNum(totalThucTe)}</td>
                                <td className={`py-2.5 px-3 text-center ${totalChenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {totalChenhLech > 0 ? `+${formatNum(totalChenhLech)}` : formatNum(totalChenhLech)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-2 text-center text-slate-500 font-bold">-</td>
                                <td className="py-2.5 px-3 text-right text-slate-900 font-black">{formatNum(totalThucTe)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })()}

                      {filteredHistoryRows.length === 0 ? (
                        <tr>
                          <td colSpan={activeTab === 'dailyPlan' ? "5" : "4"} className="py-8 text-center text-slate-400 italic font-semibold">
                            Không có dữ liệu chi tiết
                          </td>
                        </tr>
                      ) : (
                        filteredHistoryRows.map((h, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center text-slate-455 font-bold font-mono text-[10px]">
                              {h.ngay}
                            </td>
                            <td className="py-2.5 px-2 font-extrabold text-slate-700 text-left">
                              {h.tenRutGon}
                            </td>
                            {activeTab === 'dailyPlan' ? (
                              <>
                                <td className="py-2.5 px-2 text-right text-slate-600 font-bold">
                                  {formatNum(h.keHoach)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-slate-855 font-black">
                                  {formatNum(h.thucTe)}
                                </td>
                                <td className={`py-2.5 px-3 text-center font-black ${
                                  h.chenhLech < 0 ? 'text-red-500' : 'text-green-600'
                                }`}>
                                  {h.chenhLech > 0 ? `+${formatNum(h.chenhLech)}` : formatNum(h.chenhLech)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-2 text-center font-extrabold text-red-600 font-mono">
                                  {h.soCTSX}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-855 font-black">
                                  {formatNum(h.thucTe)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* 5. THANH MENU NỔI DƯỚI ĐÁY CỰM TÍNH NĂNG ĐANG PHÁT TRIỂN (FLOATING BOTTOM NAVIGATION) */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-2xl py-1 px-2 flex items-center justify-around z-40 transition-all">
        
        {/* Nút Phân hệ Cơ khí (Đang chạy mượt mà) */}
        <button 
          onClick={() => setActiveDept('cokhi')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
            activeDept === 'cokhi' 
              ? 'text-red-600 bg-red-50 font-black' 
              : 'text-slate-400 hover:text-slate-800'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[9px] uppercase tracking-wide">Cơ khí</span>
        </button>

        {/* Nút Phân hệ Ráp hàn (Coming Soon) */}
        <button 
          onClick={() => setActiveDept('raphan')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
            activeDept === 'raphan' 
              ? 'text-red-600 bg-red-50 font-black' 
              : 'text-slate-400 hover:text-slate-800'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[9px] uppercase tracking-wide">Ráp hàn</span>
        </button>

        {/* Nút Phân hệ Định hình (Coming Soon) */}
        <button 
          onClick={() => setActiveDept('dinhhinh')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
            activeDept === 'dinhhinh' 
              ? 'text-red-600 bg-red-50 font-black' 
              : 'text-slate-400 hover:text-slate-950'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-[9px] uppercase">Định hình</span>
        </button>

        {/* Nút Phân hệ Khuôn gá (Coming Soon) */}
        <button 
          onClick={() => setActiveDept('khuonga')}
          className={`flex-1 py-1 text-center transition-all duration-150 flex flex-col items-center ${
            activeDept === 'khuonga' ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-[9px] font-bold uppercase mt-0.5">Khuôn gá</span>
        </button>
      </div>

    </div>
  );
}
