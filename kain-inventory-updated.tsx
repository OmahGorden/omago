import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Package, BarChart3, Search, Filter, Download, Upload, Settings, Home } from 'lucide-react';
import * as XLSX from 'xlsx';

const KainInventoryApp = () => {
  const [transactions, setTransactions] = useState([]);
  const [appSettings, setAppSettings] = useState({
    appName: 'Omah Gorden',
    subtitle: 'Sistem Inventory Kain',
    logo: '🏠'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama: '',
    customer: '',
    alamat: '',
    statusBarang: 'MASUK',
    qty: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('transaksi');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterKain, setFilterKain] = useState('ALL');
  const [isNewKain, setIsNewKain] = useState(true);

  // Dapatkan daftar nama kain yang unik
  const getUniqueKainNames = () => {
    const names = transactions.map(t => t.nama);
    return [...new Set(names)].sort();
  };

  // Hitung sisa stok per jenis kain
  const calculateStock = () => {
    const stockMap = {};
    
    transactions.forEach(transaction => {
      const namaKain = transaction.nama.toLowerCase();
      if (!stockMap[namaKain]) {
        stockMap[namaKain] = {
          nama: transaction.nama,
          totalMasuk: 0,
          totalKeluar: 0,
          sisa: 0
        };
      }
      
      if (transaction.statusBarang === 'MASUK') {
        stockMap[namaKain].totalMasuk += parseInt(transaction.qty);
      } else {
        stockMap[namaKain].totalKeluar += parseInt(transaction.qty);
      }
      
      stockMap[namaKain].sisa = stockMap[namaKain].totalMasuk - stockMap[namaKain].totalKeluar;
    });
    
    return Object.values(stockMap);
  };

  // Hitung sisa kain untuk setiap transaksi
  const calculateSisaKain = (currentIndex) => {
    const currentTransaction = transactions[currentIndex];
    const namaKain = currentTransaction.nama.toLowerCase();
    
    let sisa = 0;
    for (let i = 0; i <= currentIndex; i++) {
      if (transactions[i].nama.toLowerCase() === namaKain) {
        if (transactions[i].statusBarang === 'MASUK') {
          sisa += parseInt(transactions[i].qty);
        } else {
          sisa -= parseInt(transactions[i].qty);
        }
      }
    }
    
    return sisa;
  };

  // Export ke Excel
  const exportToExcel = () => {
    const exportData = transactions.map((transaction, index) => ({
      No: index + 1,
      Tanggal: transaction.tanggal,
      'Nama Kain': transaction.nama,
      Customer: transaction.customer || '-',
      Alamat: transaction.alamat,
      'Status Barang': transaction.statusBarang,
      Quantity: transaction.qty,
      'Sisa Kain': calculateSisaKain(transactions.findIndex(t => t.id === transaction.id))
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi Kain");
    
    // Buat sheet ringkasan stok
    const stockData = calculateStock();
    const stockExportData = stockData.map((stock, index) => ({
      No: index + 1,
      'Nama Kain': stock.nama,
      'Total Masuk': stock.totalMasuk,
      'Total Keluar': stock.totalKeluar,
      'Sisa Stok': stock.sisa
    }));
    
    const ws2 = XLSX.utils.json_to_sheet(stockExportData);
    XLSX.utils.book_append_sheet(wb, ws2, "Ringkasan Stok");
    
    const fileName = `Laporan_Omah_Gorden_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Import dari Excel
  const importFromExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Convert imported data ke format yang sesuai
        const importedTransactions = jsonData.map((row, index) => ({
          id: Date.now() + index,
          tanggal: row.Tanggal || new Date().toISOString().split('T')[0],
          nama: row['Nama Kain'] || '',
          customer: row.Customer === '-' ? '' : (row.Customer || ''),
          alamat: row.Alamat || '',
          statusBarang: row['Status Barang'] || 'MASUK',
          qty: parseInt(row.Quantity) || 0
        }));

        setTransactions(prev => [...prev, ...importedTransactions]);
        alert(`Berhasil import ${importedTransactions.length} data transaksi!`);
      } catch (error) {
        alert('Error saat import file Excel. Pastikan format file sesuai.');
        console.error('Import error:', error);
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input file
    event.target.value = '';
  };

  const handleSubmit = () => {
    if (!formData.nama || !formData.qty) {
      alert('Nama dan Quantity harus diisi!');
      return;
    }
    
    const newTransaction = {
      id: Date.now(),
      ...formData,
      qty: parseInt(formData.qty)
    };
    
    setTransactions([...transactions, newTransaction]);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      nama: '',
      customer: '',
      alamat: '',
      statusBarang: 'MASUK',
      qty: ''
    });
    setShowForm(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.alamat.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || transaction.statusBarang === filterStatus;
    const matchesKain = filterKain === 'ALL' || transaction.nama === filterKain;
    return matchesSearch && matchesFilter && matchesKain;
  });

  const stockData = calculateStock();
  const uniqueKainNames = getUniqueKainNames();

  // Hitung sisa stok untuk kain yang difilter
  const getFilteredStockInfo = () => {
    if (filterKain === 'ALL') return null;
    
    const kainTransactions = transactions.filter(t => t.nama === filterKain);
    let totalMasuk = 0;
    let totalKeluar = 0;
    
    kainTransactions.forEach(t => {
      if (t.statusBarang === 'MASUK') {
        totalMasuk += parseInt(t.qty);
      } else {
        totalKeluar += parseInt(t.qty);
      }
    });
    
    return {
      nama: filterKain,
      totalMasuk,
      totalKeluar,
      sisa: totalMasuk - totalKeluar
    };
  };

  const filteredStockInfo = getFilteredStockInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">
          Omah Gorden
        </h1>
        <p className="text-green-100 text-sm mt-1">Sistem Inventory Kain</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="flex">
          <button
            onClick={() => setActiveTab('transaksi')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'transaksi'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transaksi
          </button>
          <button
            onClick={() => setActiveTab('stok')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'stok'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Ringkasan Stok
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'transaksi' && (
          <>
            {/* Search and Filter */}
            <div className="mb-4 space-y-3">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nama kain, customer, atau alamat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="MASUK">Masuk</option>
                  <option value="KELUAR">Keluar</option>
                </select>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Transaksi
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Filter Kain:</span>
                </div>
                <select
                  value={filterKain}
                  onChange={(e) => setFilterKain(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="ALL">Semua Kain</option>
                  {uniqueKainNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {filterKain !== 'ALL' && (
                  <button
                    onClick={() => setFilterKain('ALL')}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear Filter
                  </button>
                )}
                
                {/* Import/Export Buttons */}
                <div className="flex gap-2 ml-auto">
                  <label className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Import Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={importFromExcel}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={exportToExcel}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </button>
                </div>
              </div>
              
              {/* Show filtered stock info */}
              {filteredStockInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-bold text-green-800 mb-2">Ringkasan Stok: {filteredStockInfo.nama}</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-bold text-lg">{filteredStockInfo.totalMasuk}</div>
                      <div className="text-gray-600">Total Masuk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-bold text-lg">{filteredStockInfo.totalKeluar}</div>
                      <div className="text-gray-600">Total Keluar</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600 font-bold text-lg">{filteredStockInfo.sisa}</div>
                      <div className="text-gray-600">Sisa Stok</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-800 font-bold text-lg">{filteredTransactions.length}</div>
                      <div className="text-gray-600">Total Transaksi</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">No</th>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Nama Kain</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Alamat</th>
                      <th className="px-4 py-3 text-left">Status Barang</th>
                      <th className="px-4 py-3 text-left">QTY</th>
                      <th className="px-4 py-3 text-left">Sisa Kain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          Belum ada data transaksi. Tambah transaksi pertama atau import dari Excel.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((transaction, index) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3">{transaction.tanggal}</td>
                          <td className="px-4 py-3 font-medium">{transaction.nama}</td>
                          <td className="px-4 py-3">{transaction.customer || '-'}</td>
                          <td className="px-4 py-3">{transaction.alamat}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.statusBarang === 'MASUK' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.statusBarang}
                            </span>
                          </td>
                          <td className="px-4 py-3">{transaction.qty}</td>
                          <td className="px-4 py-3 font-medium">
                            {calculateSisaKain(transactions.findIndex(t => t.id === transaction.id))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'stok' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Ringkasan Stok Kain</h2>
              <button
                onClick={exportToExcel}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </button>
            </div>
            
            {stockData.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                Belum ada data stok. Tambah transaksi untuk melihat ringkasan stok.
              </div>
            ) : (
              <div className="grid gap-4">
                {stockData.map((stock, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg">{stock.nama}</h3>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-green-600">Masuk: {stock.totalMasuk}</span>
                          <span className="text-red-600">Keluar: {stock.totalKeluar}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${stock.sisa < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {stock.sisa}
                        </div>
                        <div className="text-sm text-gray-500">Sisa Stok</div>
                        {stock.sisa < 0 && (
                          <div className="text-xs text-red-500 mt-1">Stok Minus!</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Tambah Transaksi Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => handleInputChange('tanggal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Nama Kain</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewKain(false)}
                      className={`px-3 py-1 text-xs rounded ${
                        !isNewKain ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Pilih Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewKain(true)}
                      className={`px-3 py-1 text-xs rounded ${
                        isNewKain ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Tambah Baru
                    </button>
                  </div>
                  
                  {isNewKain ? (
                    <input
                      type="text"
                      value={formData.nama}
                      onChange={(e) => handleInputChange('nama', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Contoh: Angelo 1, Katun Premium, dll"
                      required
                    />
                  ) : (
                    <select
                      value={formData.nama}
                      onChange={(e) => handleInputChange('nama', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Pilih Kain Existing...</option>
                      {uniqueKainNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Nama customer/pelanggan"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Alamat</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => handleInputChange('alamat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Alamat customer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status Barang</label>
                <select
                  value={formData.statusBarang}
                  onChange={(e) => handleInputChange('statusBarang', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="MASUK">MASUK</option>
                  <option value="KELUAR">KELUAR</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.qty}
                  onChange={(e) => handleInputChange('qty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Jumlah kain"
                  min="1"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KainInventoryApp;