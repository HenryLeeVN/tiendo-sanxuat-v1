import React, { useState, useEffect, useRef } from 'react';

const API_BASE = "https://script.google.com/macros/s/AKfycbzTy7rkjZbkozDUQoA7hjW8YstP6V3uqHqQXukbMOD6qlQv7IvYXO-vHbPbMG_2LYul/exec"; // <-- ĐÃ ĐỒNG BỘ LINK WEB APP MỚI CỦA BẠN

export default function App() {
  const [activeTab, setActiveTab] = useState('dailyPlan'); // 'dailyPlan' (Theo ngày), 'ctsxProgress' (Theo CTSX)
  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [selectedCTSX, setSelectedCTSX] = useState('totalOrder'); // 'totalOrder', 'unallocated', 'all', 'CTSX01'...
  
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
    if (!touchMovedRef.current) return; // Chạm nhẹ (Tap) -> Bỏ qua không thoát

    const diffX = touchEndRef.current.x - touchStartRef.current.x;
    const diffY = Math.abs(touchEndRef.current.y - touchStartRef.current.y);

    // Nếu cuộn dọc xem dữ liệu -> Bỏ qua không thoát
    if (diffY > 45) return;

    // CHỈ vuốt từ sát mép trái qua phải khoảng 1.5cm (dưới 50px đầu tiên) mới kích hoạt lùi trang
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

  const activeFilter = activeTab === 'ctsxProgress' ? 'all' : filter;
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

  // Lấy dữ liệu sản phẩm trong trang chi tiết độc lập và chống nhảy trang dứt khoát
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

  const getStatusBadge = (status) => {
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
      
      {/* HEADER TĨNH MÀU XÁM THAN CHÌ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-4 py-3.5 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <img 
              src="https://letranfurniture.com/wp-content/uploads/2025/01/Logo-removebg-preview.png" 
              alt="Lê Trần Furniture" 
              className="h-9 w-auto object-contain shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="min-w-0 text-left">
              <h1 className="text-xs font-black uppercase tracking-wider text-white">Lê Trần Furniture</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Xưởng Cơ khí - Tiến độ</p>
            </div>
          </div>

          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 shrink-0 shadow-3xs"
          >
            <span>Tải lại</span>
            <svg 
              className={`w-3 h-3 transition-transform duration-500 ${loading ? 'animate-spin text-red-500' : 'text-slate-300'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 3v4M7 9h8v3h-3v9" />
            </svg>
          </button>

        </div>
      </div>

      {/* CỤM STICKY GHIM ĐẦU TRANG KHI VUỐT LÊN (Chỉ còn ô tìm kiếm và dải nút lọc con) */}
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
              placeholder="Tìm sản phẩm..."
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

          {/* 2 Tab lớn */}
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
                className={`flex-1 py-2.5 text-xs font-black text-center border-b-2 transition-all duration-150 ${
                  activeTab === tab.id 
                    ? 'border-red-600 text-red-600 font-extrabold' 
                    : 'border-transparent text-slate-500 font-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dải Chip lọc con dẹt nằm dưới Tab */}
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

      {/* THÂN SẢN PHẨM CHÍNH */}
      <div className="max-w-md mx-auto px-4 mt-3">

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
                    setSelectedProductName(prod.tenSP); // Chỉ lưu tên sản phẩm dứt khoát chống sụp đổ trang
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

                        <div className="text-[10px] font-bold text-slate-455 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {activeTab === 'dailyPlan' && (
                            <>
                              <span>Kế hoạch ngày:</span>
                              <span className="text-slate-800 font-extrabold">{formatNum(prod.dongBo)}/{formatNum(prod.keHoach)}</span>
                            </>
                          )}
                          {activeTab === 'ctsxProgress' && selectedCTSX === 'totalOrder' && (
                            <>
                              <span>Đơn hàng:</span>
                              <span className="text-slate-800 font-extrabold">{formatNum(prod.dongBo)}/{formatNum(prod.orderQty)}</span>
                            </>
                          )}
                          {activeTab === 'ctsxProgress' && selectedCTSX === 'unallocated' && (
                            <>
                              <span>Order:</span>
                              <span className="text-slate-800 font-extrabold">{formatNum(prod.orderQty)}</span>
                              <span className="text-slate-400">| Đã lên CTSX:</span>
                              <span className="text-red-600 font-extrabold">{formatNum(prod.allocated)}</span>
                              <span className="text-slate-400">| Chưa lên:</span>
                              <span className="text-slate-800 font-extrabold">{formatNum(prod.unallocated)}</span>
                            </>
                          )}
                          {activeTab === 'ctsxProgress' && selectedCTSX !== 'totalOrder' && selectedCTSX !== 'unallocated' && (
                            <>
                              <span>Chỉ thị CTSX:</span>
                              <span className="text-slate-800 font-extrabold">{formatNum(prod.dongBo)}/{formatNum(prod.keHoach)}</span>
                            </>
                          )}
                          <span className={`font-black ${prod.chenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {prod.chenhLech > 0 ? `+${formatNum(prod.chenhLech)}` : formatNum(prod.chenhLech)}
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
                            {formatNum(k.thucTe)}/{formatNum(k.keHoach)}
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

      {/* MÀN HÌNH CHI TIẾT TRƯỢT SANG PHẢI (Hỗ trợ cảm biến Edge Swipe 1.5cm sát mép chống sụp trang dứt khoát) */}
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
          {/* CỤM STICKY TRANG CHI TIẾT */}
          <div className="sticky top-0 z-50 bg-slate-50 border-b border-slate-200/60 shadow-xs space-y-2 pt-3.5 pb-2.5 px-4">
            
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <button 
                onClick={() => setSelectedProductName(null)} // Bấm quay lại đóng trang chi tiết sạch sẽ
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

            <div className="relative max-w-md mx-auto">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm linh kiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-8 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 shadow-3xs"
              />
            </div>
          </div>

          {/* Nội dung chi tiết */}
          {activeDetailProduct && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* CARD THÔNG TIN NGANG HIỆN ĐẠI (Tối ưu khoảng trống 2 bên) */}
              <div className="bg-white border border-slate-150 rounded-xl p-3 flex gap-3 shadow-3xs items-start">
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
                
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-extrabold text-xs text-slate-900 break-words leading-tight">
                    {activeDetailProduct.tenSP}
                  </h3>
                  
                  {activeTab === 'ctsxProgress' && activeDetailProduct.remainingDays && (
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded w-fit">
                      <span>⏰ {activeDetailProduct.remainingDays}</span>
                    </div>
                  )}

                  <div className="text-[10px] font-bold text-slate-500 mt-2 space-y-0.5 border-t border-slate-100 pt-1.5">
                    {activeTab === 'dailyPlan' ? (
                      <>
                        <div className="flex justify-between"><span>Kế hoạch ngày:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.keHoach)}</span></div>
                        <div className="flex justify-between"><span>Thực hiện ngày:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.dongBo)}</span></div>
                      </>
                    ) : selectedCTSX === 'unallocated' ? (
                      <>
                        <div className="flex justify-between"><span>Tổng đơn hàng:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.orderQty)}</span></div>
                        <div className="flex justify-between"><span>Đã lên CTSX:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.allocated)}</span></div>
                        <div className="flex justify-between"><span>Chưa lên CTSX:</span><span className="text-red-600 font-extrabold">{formatNum(activeDetailProduct.unallocated)}</span></div>
                      </>
                    ) : selectedCTSX === 'totalOrder' ? (
                      <>
                        <div className="flex justify-between"><span>Tổng đơn hàng:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.orderQty)}</span></div>
                        <div className="flex justify-between"><span>Đồng bộ tổng:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.dongBo)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span>Mục tiêu {activeDetailProduct.soCTSX}:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.keHoach)}</span></div>
                        <div className="flex justify-between"><span>Đồng bộ đợt:</span><span className="text-slate-800 font-extrabold">{formatNum(activeDetailProduct.dongBo)}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* BỘ LỌC ĐỒNG BỘ THEO CTSX TRONG TRANG CHI TIẾT (Không nhảy trang khi bấm) */}
              {activeTab === 'ctsxProgress' && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn Chỉ thị sản xuất chi tiết</h3>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                    <button
                      onClick={() => setSelectedCTSX('totalOrder')}
                      className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg border transition-all shrink-0 ${
                        selectedCTSX === 'totalOrder'
                          ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Tổng order
                    </button>
                    <button
                      onClick={() => setSelectedCTSX('unallocated')}
                      className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg border transition-all shrink-0 ${
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
                        className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg border transition-all duration-150 shrink-0 ${
                          selectedCTSX === so
                            ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {so}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* === BẢNG TỔNG QUAN TIẾN ĐỘ THỰC HIỆN CỦA TỪNG CTSX (Theo yêu cầu của bạn) === */}
              {activeTab === 'ctsxProgress' && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs space-y-2 text-left">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isTotalOrderView ? 'Phân bổ tiến độ các Chỉ thị (CTSX)' : `Chi tiết Chỉ thị ${selectedCTSX}`}
                  </h3>
                  <div className="overflow-hidden border border-slate-150 rounded-lg">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-150">
                          <th className="py-2 px-3">Chỉ thị</th>
                          <th className="py-2 px-2 text-right">Mục tiêu</th>
                          <th className="py-2 px-2 text-right">Đã làm</th>
                          <th className="py-2 px-3 text-right">Còn lại</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allReports?.reports?.all?.ctsxProgress?.products
                          ?.filter(p => p.tenSP === selectedProductName && (isTotalOrderView || p.soCTSX === selectedCTSX))
                          .map((pC, idx) => {
                            const remaining = pC.keHoach - pC.dongBo;
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-extrabold text-red-600 font-mono">{pC.soCTSX}</td>
                                <td className="py-2 px-2 text-right text-slate-600 font-bold">{formatNum(pC.keHoach)}</td>
                                <td className="py-2 px-2 text-right text-slate-800 font-black">{formatNum(pC.dongBo)}</td>
                                <td className={`py-2 px-3 text-right font-black ${remaining > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                  {remaining > 0 ? formatNum(remaining) : 0}
                                </td>
                              </tr>
                            );
                          })}
                        {allReports?.reports?.all?.ctsxProgress?.products?.filter(p => p.tenSP === selectedProductName && (isTotalOrderView || p.soCTSX === selectedCTSX)).length === 0 && (
                          <tr>
                            <td colSpan="4" className="py-4 text-center text-slate-400 italic font-medium">Chưa có chỉ thị</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lọc linh kiện khung */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bộ lọc linh kiện</h3>
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
                        {activeTab === 'dailyPlan' && <th className="py-2.5 px-2 text-right">Kế hoạch</th>}
                        <th className="py-2.5 px-2 text-right">Thực hiện</th>
                        {activeTab === 'dailyPlan' && <th className="py-2.5 px-3 text-center w-14">+-</th>}
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
                            {activeTab === 'dailyPlan' && <td className="py-2.5 px-2 text-right text-slate-700">{formatNum(totalKeHoach)}</td>}
                            <td className="py-2.5 px-2 text-right text-slate-900 font-black">{formatNum(totalThucTe)}</td>
                            {activeTab === 'dailyPlan' && (
                              <td className={`py-2.5 px-3 text-center ${totalChenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {totalChenhLech > 0 ? `+${formatNum(totalChenhLech)}` : formatNum(totalChenhLech)}
                              </td>
                            )}
                          </tr>
                        );
                      })()}

                      {filteredHistoryRows.length === 0 ? (
                        <tr>
                          <td colSpan={activeTab === 'dailyPlan' ? "5" : "3"} className="py-8 text-center text-slate-400 italic font-semibold">
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
                            {activeTab === 'dailyPlan' && (
                              <td className="py-2.5 px-2 text-right text-slate-600 font-bold">
                                {formatNum(h.keHoach)}
                              </td>
                            )}
                            <td className="py-2.5 px-2 text-right text-slate-855 font-black">
                              {formatNum(h.thucTe)}
                            </td>
                            {activeTab === 'dailyPlan' && (
                              <td className={`py-2.5 px-3 text-center font-black ${
                                h.chenhLech < 0 ? 'text-red-500' : 'text-green-600'
                              }`}>
                                {h.chenhLech > 0 ? `+${formatNum(h.chenhLech)}` : formatNum(h.chenhLech)}
                              </td>
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

    </div>
  );
}
