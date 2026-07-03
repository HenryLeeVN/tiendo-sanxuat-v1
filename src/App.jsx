import React, { useState, useEffect } from 'react';

const API_BASE = "https://script.google.com/macros/s/AKfycby_PRXEoH1_bMEwJUj0TyRB01k--3u74BzEaw2R5GI80xePIoKuV_8ZrBOwjEm36iJR/exec";

export default function App() {
  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [allReports, setAllReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Trạng thái cho "Màn hình chi tiết trượt từ bên phải"
  const [selectedProductCode, setSelectedProductCode] = useState(null); // Lưu Mã SP
  const [detailTimeFilter, setDetailTimeFilter] = useState('today'); // Bộ lọc thời gian ĐỘC LẬP trong trang chi tiết
  const [detailFrameFilter, setDetailFrameFilter] = useState('all');

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

  const filteredProducts = currentReport?.products?.filter(product => {
    const q = searchQuery.toLowerCase();
    return (
      product.maSP.toLowerCase().includes(q) ||
      product.tenSP.toLowerCase().includes(q)
    );
  }) || [];

  // Lấy ra thông tin sản phẩm đang được chọn trong trang chi tiết dựa theo bộ lọc thời gian độc lập của nó
  const activeDetailProduct = selectedProductCode && allReports?.reports 
    ? allReports.reports[detailTimeFilter]?.products.find(p => p.maSP === selectedProductCode)
    : null;

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      
      {/* 1. Header tĩnh màu đỏ (Sẽ bị ẩn khi cuộn màn hình lên) */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-wide">X.Cơ khí - Tiến độ sản xuất</h1>
            <p className="text-[10px] text-red-100 flex items-center mt-0.5">
              {allReports?.updateTime ? `Dữ liệu: ${allReports.updateTime}` : 'Đang tải...'}
            </p>
          </div>
          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="p-1 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 3v4M7 9h8v3h-3v9" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. CỤM STICKY: Luôn ghim cố định ở đầu trang khi cuộn lên */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md pt-3.5 pb-2 px-4 border-b border-slate-200/60 shadow-xs">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Thanh tìm kiếm */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm sản phẩm theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 shadow-3xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Bộ lọc thời gian ngoài màn hình chính */}
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
                className={`py-1.5 text-[11px] font-extrabold rounded-md transition-all duration-150 ${
                  filter === item.id 
                    ? 'bg-white text-red-600 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Phần thân chính */}
      <div className="max-w-md mx-auto px-4 mt-3">

        {/* Cụm 4 chip tổng quan */}
        {!loading && !error && currentReport && (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Đang SX</p>
              <p className="text-xs font-black text-blue-600 mt-0.5">{currentReport.summary.producing}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Vượt</p>
              <p className="text-xs font-black text-purple-600 mt-0.5">{currentReport.summary.ahead}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Đúng</p>
              <p className="text-xs font-black text-green-600 mt-0.5">{currentReport.summary.onSchedule}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-150 p-1.5 text-center shadow-3xs">
              <p className="text-[8px] font-extrabold text-slate-400 uppercase">Trễ</p>
              <p className="text-xs font-black text-red-600 mt-0.5">{currentReport.summary.delay}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-2.5 animate-pulse">
            <div className="bg-white h-14 rounded-lg shadow-3xs"></div>
            <div className="bg-white h-14 rounded-lg shadow-3xs"></div>
            <div className="bg-white h-14 rounded-lg shadow-3xs"></div>
          </div>
        )}

        {/* Danh sách các sản phẩm (Card ngắn dẹt) */}
        {!loading && !error && currentReport && (
          <div className="space-y-2">
            {filteredProducts.map(prod => {
              const badge = getStatusBadge(prod.trangThai);
              return (
                <div 
                  key={prod.maSP} 
                  onClick={() => {
                    setSelectedProductCode(prod.maSP); // Lưu mã sản phẩm để hiển thị chi tiết
                    setDetailTimeFilter(filter); // Đồng bộ thời gian ban đầu giống bộ lọc bên ngoài
                    setDetailFrameFilter('all');
                  }}
                  className={`bg-white border border-slate-150 rounded-lg shadow-3xs overflow-hidden transition-all duration-150 active:bg-slate-100 flex flex-col justify-between p-2.5 cursor-pointer ${badge.border}`}
                >
                  {/* Dòng 1: Ảnh nhỏ + Tên + Badge trạng thái */}
                  <div className="flex items-center gap-2.5 justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {prod.hinhAnh ? (
                        <img 
                          src={prod.hinhAnh} 
                          alt={prod.tenSP}
                          className="w-9 h-9 object-cover rounded border border-slate-100 bg-slate-50 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-455 border border-slate-150 shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-xs text-slate-800 break-words leading-tight pr-1">
                          {prod.tenSP}
                        </h3>
                        {/* Dòng SL đồng bộ ngay dưới tên */}
                        <div className="text-[10px] font-bold text-slate-455 flex items-center gap-1.5 mt-0.5">
                          <span>Đồng bộ:</span>
                          <span className="text-slate-800 font-extrabold">{prod.dongBo}/{prod.keHoach}</span>
                          <span className={`font-black ${prod.chenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {prod.chenhLech > 0 ? `+${prod.chenhLech}` : prod.chenhLech}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge trạng thái nhỏ gọn */}
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border shrink-0 ${badge.bg}`}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Dòng 2: Hiển thị các khung dẹt theo hàng ngang */}
                  <div className="flex flex-wrap gap-1 mt-2 border-t border-slate-100/60 pt-1.5">
                    {prod.khung.map(k => {
                      const isUnder = k.thucTe < k.keHoach;
                      return (
                        <div 
                          key={k.maKhung} 
                          className="bg-slate-100/60 border border-slate-200/50 rounded px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1"
                        >
                          <span className="text-slate-455 uppercase">{k.tenRutGon}:</span>
                          <span className={isUnder ? 'text-red-500 font-black' : 'text-green-600 font-black'}>
                            {k.thucTe}/{k.keHoach}
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

      {/* 4. MÀN HÌNH CHI TIẾT TRƯỢT SANG PHẢI (Có tích hợp Bộ lọc thời gian Độc lập ngay bên trong) */}
      <div 
        className={`fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs transition-opacity duration-300 ${
          activeDetailProduct ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className={`w-full max-w-md bg-slate-50 h-full flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${
            activeDetailProduct ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header màn hình chi tiết */}
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3 flex items-center gap-2">
            <button 
              onClick={() => setSelectedProductCode(null)} // Bấm quay lại đóng trang chi tiết
              className="flex items-center text-xs font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-extrabold break-words pr-1 leading-tight" title={activeDetailProduct?.tenSP}>
                {activeDetailProduct?.tenSP}
              </h2>
            </div>
          </div>

          {/* Nội dung chi tiết */}
          {activeDetailProduct && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Hình ảnh phóng lớn trực quan ở giữa */}
              {activeDetailProduct.hinhAnh ? (
                <div className="flex justify-center my-1.5">
                  <img 
                    src={activeDetailProduct.hinhAnh} 
                    alt={activeDetailProduct.tenSP}
                    className="w-32 h-32 object-cover rounded-xl border border-slate-200 shadow-sm bg-white p-1"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : null}

              {/* === BỘ LỌC THỜI GIAN ĐỘC LẬP NGAY TRONG TRANG CHI TIẾT (Giải quyết triệt để bất tiện của bạn) === */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn thời gian báo cáo</h3>
                <div className="grid grid-cols-4 gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                  {[
                    { id: 'today', label: 'Hôm nay' },
                    { id: 'week', label: 'Tuần này' },
                    { id: 'month', label: 'Tháng' },
                    { id: 'all', label: 'Tất cả' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setDetailTimeFilter(item.id)} // Bấm cái này dữ liệu chi tiết sẽ đổi ngay lập tức
                      className={`py-1.5 text-[10px] font-extrabold rounded transition-all duration-150 ${
                        detailTimeFilter === item.id 
                          ? 'bg-white text-red-600 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bộ lọc định mức (BOM) loại khung, ví dụ: Mê (3), Chân (2)... */}
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

              {/* Bảng chi tiết: Ngày | Tên khung (rút gọn) | Kế hoạch | Thực hiện | +- */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bảng lịch sử chi tiết</h3>
                <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-24">Ngày</th>
                        <th className="py-2.5 px-2 text-left">Tên khung</th>
                        <th className="py-2.5 px-2 text-right">Kế hoạch</th>
                        <th className="py-2.5 px-2 text-right">Thực hiện</th>
                        <th className="py-2.5 px-3 text-center w-14">+-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* DÒNG TỔNG CỘNG Ở TRÊN CÙNG TABLE */}
                      {(() => {
                        const historyRows = activeDetailProduct.history ? activeDetailProduct.history.filter(h => {
                          if (detailFrameFilter === 'all') return true;
                          return h.tenRutGon === detailFrameFilter;
                        }) : [];

                        if (historyRows.length === 0) return null;

                        const totalKeHoach = historyRows.reduce((sum, h) => sum + h.keHoach, 0);
                        const totalThucTe = historyRows.reduce((sum, h) => sum + h.thucTe, 0);
                        const totalChenhLech = totalThucTe - totalKeHoach;

                        return (
                          <tr className="bg-slate-100/90 font-black border-b border-slate-200/80">
                            <td className="py-2.5 px-3 text-center text-[10px] text-slate-600 font-extrabold">TỔNG</td>
                            <td className="py-2.5 px-2 text-slate-800 text-[11px]">Tất cả</td>
                            <td className="py-2.5 px-2 text-right text-slate-700">{totalKeHoach}</td>
                            <td className="py-2.5 px-2 text-right text-slate-900">{totalThucTe}</td>
                            <td className={`py-2.5 px-3 text-center ${totalChenhLech < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {totalChenhLech > 0 ? `+${totalChenhLech}` : totalChenhLech}
                            </td>
                          </tr>
                        );
                      })()}

                      {activeDetailProduct.history && activeDetailProduct.history.filter(h => {
                        if (detailFrameFilter === 'all') return true;
                        return h.tenRutGon === detailFrameFilter;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400 italic font-semibold">
                            Không có dữ liệu chi tiết
                          </td>
                        </tr>
                      ) : (
                        activeDetailProduct.history && activeDetailProduct.history
                          .filter(h => {
                            if (detailFrameFilter === 'all') return true;
                            return h.tenRutGon === detailFrameFilter;
                          })
                          .map((h, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-center text-slate-450 font-bold font-mono text-[10px]">
                                {h.ngay}
                              </td>
                              <td className="py-2.5 px-2 font-extrabold text-slate-700">
                                {h.tenRutGon}
                              </td>
                              <td className="py-2.5 px-2 text-right text-slate-600 font-bold">
                                {h.keHoach}
                              </td>
                              <td className="py-2.5 px-2 text-right text-slate-850 font-black">
                                {h.thucTe}
                              </td>
                              <td className={`py-2.5 px-3 text-center font-black ${
                                h.chenhLech < 0 ? 'text-red-500' : 'text-green-600'
                              }`}>
                                {h.chenhLech > 0 ? `+${h.chenhLech}` : h.chenhLech}
                              </td>
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
