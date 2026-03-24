import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { Search, FileSpreadsheet, List, FileText, Download, AlertCircle, Loader2, Info, Upload, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

const parseThresholdStr = (str) => {
  const match = str.match(/^(.+?\(\d{4}.*?\))\s*(?:([dr])\s+)?(.*)$/);
  if (match) {
    let typeStr = '-';
    if (match[2] === 'd') typeStr = '觉察阈 (d)';
    else if (match[2] === 'r') typeStr = '识别阈 (r)';
    return {
      author: match[1].trim(),
      type: typeStr,
      value: match[3].trim()
    };
  }
  return { author: str, type: '-', value: '-' };
};

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchMode, setSearchMode] = useState('single'); // 'single' or 'bulk'
  const [singleQuery, setSingleQuery] = useState('');
  const [bulkQuery, setBulkQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(['空气', '水', '其他介质']);
  const [exactMatch, setExactMatch] = useState(true); // Default to exact match
  const fileInputRef = useRef(null);

  // Use deferred values for smooth typing
  const deferredSingleQuery = useDeferredValue(singleQuery);
  const deferredBulkQuery = useDeferredValue(bulkQuery);
  
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}aroma_data_merged.json`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data", err);
        setLoading(false);
      });
  }, []);

  const results = useMemo(() => {
    if (!data.length) return [];
    
    const mediaFilteredData = data.filter(item => selectedMedia.includes(item.medium));
    
    if (searchMode === 'single') {
      if (!deferredSingleQuery.trim()) return [];
      const q = deferredSingleQuery.toLowerCase().trim();
      return mediaFilteredData.filter(item => {
        const cas = (item.cas || "").toLowerCase();
        const en = (item.english_name || "").toLowerCase();
        const cn = (item.chinese_name || "").toLowerCase();
        if (exactMatch) {
          return cas === q || en === q || cn === q;
        } else {
          return cas.includes(q) || en.includes(q) || cn.includes(q);
        }
      });
    } else {
      if (!deferredBulkQuery.trim()) return [];
      const lines = deferredBulkQuery.split('\n').map(l => l.toLowerCase().trim()).filter(Boolean);
      if (!lines.length) return [];
      
      const matched = [];
      const addedKeys = new Set();
      
      lines.forEach(line => {
        // Find all records that match
        const matches = mediaFilteredData.filter(item => {
          const cas = (item.cas || "").toLowerCase();
          const en = (item.english_name || "").toLowerCase();
          const cn = (item.chinese_name || "").toLowerCase();
          if (exactMatch) {
            return cas === line || en === line || cn === line;
          } else {
            return cas === line || en === line || cn === line || cas.includes(line) || en.includes(line) || cn.includes(line);
          }
        });
        matches.forEach(m => {
          // Since a compound might have multiple records (Air, Water, etc.), we key by CAS + Medium
          const key = (m.cas || "") + (m.medium || "");
          if (!addedKeys.has(key)) {
            addedKeys.add(key);
            matched.push(m);
          }
        });
      });
      return matched;
    }
  }, [data, deferredSingleQuery, deferredBulkQuery, searchMode, selectedMedia, exactMatch]);

  const toggleMedium = (medium) => {
    setSelectedMedia(prev => 
      prev.includes(medium) 
        ? prev.filter(m => m !== medium)
        : [...prev, medium]
    );
  };

  const exportCSV = () => {
    if (!results.length) return;
    
    const headers = ['序号', 'CAS号', '化合物中文名', '化合物英文名', '检索介质', '文献来源', '阈值类型(d/r)', '阈值(ppm)'];
    const rows = [headers.join(',')];
    
    results.forEach((item, index) => {
      const cas = `"${item.cas || ''}"`;
      const cn = `"${(item.chinese_name || '').replace(/"/g, '""')}"`;
      const en = `"${(item.english_name || '').replace(/"/g, '""')}"`;
      const medium = `"${item.medium || ''}"`;
      
      const thresholds = item.threshold_data || [];
      if (thresholds.length === 0) {
        rows.push([index + 1, cas, cn, en, medium, '""', '""', '""'].join(','));
      } else {
        thresholds.forEach((thStr, tIdx) => {
          const parsed = parseThresholdStr(thStr);
          // Only show index on the first row of the compound
          rows.push([
            tIdx === 0 ? index + 1 : "",
            tIdx === 0 ? cas : '""',
            tIdx === 0 ? cn : '""',
            tIdx === 0 ? en : '""',
            tIdx === 0 ? medium : '""',
            `"${parsed.author.replace(/"/g, '""')}"`,
            `"${parsed.type.replace(/"/g, '""')}"`,
            `"${parsed.value.replace(/"/g, '""')}"`
          ].join(','));
        });
      }
    });

    const csvContent = "\uFEFF" + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `香气阈值查询导出_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const extractedValues = [];
        jsonData.forEach(row => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              if (cell !== undefined && cell !== null && cell.toString().trim() !== '') {
                extractedValues.push(cell.toString().trim());
              }
            });
          }
        });
        
        if (extractedValues.length > 0) {
          const newLines = extractedValues.join('\n');
          setBulkQuery(prev => prev ? prev + '\n' + newLines : newLines);
        }
      } catch (err) {
        console.error("Error reading file:", err);
        alert("无法解析该文件，请确保它是有效的 CSV 或 Excel 格式。");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 tracking-tight drop-shadow-sm">
            香气风味描述与阈值库
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            精准聚合文献级香气阈值数据。支持通过 CAS 号、中英文名进行单物质检索或批量清单匹配查询。
          </p>
          {loading && (
            <div className="flex items-center justify-center mt-6 text-blue-500 bg-blue-50 py-2 px-4 rounded-full inline-flex mx-auto shadow-sm border border-blue-100">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span className="font-medium">正在解析本地阈值大数据库...</span>
            </div>
          )}
        </header>

        {/* Search Controls */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-6 md:p-8 mb-8 transition-all">
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setSearchMode('single')}
                className={`flex items-center px-6 py-3 rounded-full font-semibold transition-all duration-300 ${searchMode === 'single' ? 'bg-blue-600 text-white shadow-md shadow-blue-200 translate-y-[-2px]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Search className="w-5 h-5 mr-2" />
                搜索框模式
              </button>
              <button 
                onClick={() => setSearchMode('bulk')}
                className={`flex items-center px-6 py-3 rounded-full font-semibold transition-all duration-300 ${searchMode === 'bulk' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-y-[-2px]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <List className="w-5 h-5 mr-2" />
                批量匹配模式
              </button>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-full shadow-inner border border-slate-200">
              <button 
                onClick={() => setExactMatch(true)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                  exactMatch ? 'bg-white text-indigo-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 bg-transparent shadow-none border border-transparent'
                }`}
              >
                精确检索
              </button>
              <button 
                onClick={() => setExactMatch(false)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                  !exactMatch ? 'bg-white text-indigo-700 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 bg-transparent shadow-none border border-transparent'
                }`}
              >
                模糊检索
              </button>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {searchMode === 'single' ? (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-14 pr-4 py-4 md:text-lg bg-white border-2 border-slate-200 rounded-2xl focus:ring-0 focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-400"
                  placeholder={exactMatch ? "输入化合物中文名、英文名或 CAS 号进行【精确】检索 (例如: 64-19-7, 乙酸)" : "输入化合物中文名、英文名或 CAS 号进行【模糊】检索 (例如: 64-19-7, 乙酸)"}
                  value={singleQuery}
                  onChange={(e) => setSingleQuery(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center">
                    <FileText className="w-4 h-4 mr-1 text-indigo-500" />
                    请输入需要匹配的物质名单（每行一个记录）
                  </label>
                  <div>
                    <input
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload" 
                      className="cursor-pointer text-xs flex items-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      导入 CSV / Excel 表格
                    </label>
                  </div>
                </div>
                <textarea
                  className="block w-full p-5 md:text-lg bg-white border-2 border-slate-200 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-300 resize-y min-h-[160px] leading-relaxed"
                  placeholder="每一行填写一个物质名称或 CAS 号，或者点击上方按钮导入表格..."
                  value={bulkQuery}
                  onChange={(e) => setBulkQuery(e.target.value)}
                ></textarea>
                <p className="mt-3 text-sm text-slate-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 opacity-70" />
                  支持中英文混排、支持 CAS 号与模糊匹配。直接提取出相关阈值记录结果。
                </p>
              </div>
            )}
          </div>

          {/* Medium Filter Controls */}
          <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in duration-700">
            <span className="block text-sm font-semibold text-slate-600 mb-3">检测介质过滤:</span>
            <div className="flex flex-wrap gap-3">
              {['空气', '水', '其他介质'].map(medium => (
                <button
                  key={medium}
                  onClick={() => toggleMedium(medium)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm border ${
                    selectedMedia.includes(medium) 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-indigo-100/50'
                      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedMedia.includes(medium) ? (medium === '空气' ? 'bg-sky-400' : medium === '水' ? 'bg-blue-400' : 'bg-emerald-400') : 'bg-slate-200'
                    }`} />
                    {medium}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {!loading && (singleQuery.trim() || bulkQuery.trim()) && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                匹配结果 
                <span className="ml-3 text-sm font-medium bg-blue-100 text-blue-700 py-1 px-3 rounded-full">
                  共找到 {results.length} 条记录
                </span>
              </h2>
              
              {results.length > 0 && (
                <button 
                  onClick={exportCSV}
                  className="flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  导出为 CSV
                </button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-600 mb-2">未找到匹配的化合物记录</h3>
                <p className="text-slate-400">请尝试检查拼写，或使用 CAS 号进行精确定位寻找。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {results.map((item, idx) => (
                  <div key={`${item.cas}-${item.medium}-${idx}`} className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 p-6 md:p-8 transition-all duration-300 group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 border-b border-slate-100 pb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-slate-800">{item.chinese_name || item.english_name}</h3>
                          <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2.5 py-1 rounded-md border border-slate-200">
                            CAS: {item.cas}
                          </span>
                        </div>
                        {item.chinese_name && (
                          <p className="text-slate-500 font-medium">{item.english_name}</p>
                        )}
                      </div>
                      
                      <div className="mt-4 md:mt-0 flex shrink-0">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${item.medium === '空气' ? 'bg-sky-100 text-sky-700 border border-sky-200' : item.medium === '水' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          检测介质: {item.medium}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        研究文献与阈值数据记录
                      </h4>
                      {item.threshold_data && item.threshold_data.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                              <tr className="bg-slate-200/50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-3 py-2 rounded-l-lg font-medium">文献来源</th>
                                <th className="px-3 py-2 font-medium">阈值类型</th>
                                <th className="px-3 py-2 rounded-r-lg font-medium">阈值 (ppm)</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {item.threshold_data.map((th, idx) => {
                                const parsed = parseThresholdStr(th);
                                return (
                                  <tr key={idx} className="border-b border-slate-200/60 last:border-0 hover:bg-slate-100 transition-colors">
                                    <td className="px-3 py-2.5 text-slate-700 font-medium">{parsed.author}</td>
                                    <td className="px-3 py-2.5 text-slate-500">{parsed.type}</td>
                                    <td className="px-3 py-2.5 text-blue-600 font-mono tracking-tight">{parsed.value}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 py-2">暂无阈值详细记录</div>
                      )}
                    </div>

                    {/* External Database Search Links */}
                    <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mr-2 flex items-center">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        香气描述外链查询:
                      </span>
                      <a
                        href={`https://www.google.com/search?q=site:thegoodscentscompany.com+"${item.cas}"`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-medium border border-slate-200 hover:border-rose-200 transition-colors"
                      >
                        The Good Scents Company
                      </a>
                      <a
                        href={`https://www.femaflavor.org/flavor-library?cas=${item.cas}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-lg text-xs font-medium border border-slate-200 hover:border-amber-200 transition-colors"
                      >
                        FEMA Flavor
                      </a>
                      <a
                        href={`https://www.google.com/search?q=site:perflavory.com+"${item.cas}"`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-lg text-xs font-medium border border-slate-200 hover:border-purple-200 transition-colors"
                      >
                        Perflavory
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
