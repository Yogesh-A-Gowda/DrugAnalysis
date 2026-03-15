import React, { useState, useEffect, useMemo } from 'react';
import { Pill, Search, Filter, AlertCircle, TrendingUp, Users, Table as TableIcon, Download, Loader2 } from 'lucide-react';
import { type DrugAnalysis, type Filters } from './types';
import { fetchDrugList, fetchDrugAnalysis } from './services/drugService';
import { ReviewChart } from './components/ReviewChart';
import { ChatBot } from './components/ChatBot';

// Requirement: Global cache to prevent repeated API calls
const analysisCache: Record<string, DrugAnalysis> = {};

const App: React.FC = () => {
  const [drugList, setDrugList] = useState<string[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<string>('');
  const [data, setData] = useState<DrugAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    categories: [],
    ageRange: [0, 120],
    genders: []
  });

  // Load drug list and filter out invalid entries
  useEffect(() => {
    const loadDrugs = async () => {
      try {
        const list = await fetchDrugList();
        // Filter out drugs that are known to be empty/broken to prevent 404s
        const validList = list.filter((name: string) => name && name.trim() !== "");
        setDrugList(validList);
      } catch (err) {
        console.error("Failed to load drug list", err);
      }
    };
    loadDrugs();
  }, []);

  // Helper: Update filter state when new data arrives
  const updateFiltersFromData = (result: DrugAnalysis) => {
    const categories = Object.keys(result.review_summary);
    const uniqueGenders = Array.from(new Set(result.all_classified_reviews.map(r => r.gender).filter(Boolean))) as string[];
    const ages = result.all_classified_reviews.map(r => r.age).filter(a => a !== undefined) as number[];
    
    setFilters({
      categories,
      ageRange: [ages.length ? Math.min(...ages) : 0, ages.length ? Math.max(...ages) : 100],
      genders: uniqueGenders
    });
  };

  // Fetch Analysis with Caching Logic
  useEffect(() => {
    if (!selectedDrug) {
      setData(null);
      return;
    }

    const loadAnalysis = async () => {
      // Check Cache First
      if (analysisCache[selectedDrug]) {
        setData(analysisCache[selectedDrug]);
        updateFiltersFromData(analysisCache[selectedDrug]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const result = await fetchDrugAnalysis(selectedDrug);
        if (result) {
          analysisCache[selectedDrug] = result; // Store in cache
          setData(result);
          updateFiltersFromData(result);
        } else {
          setError(`No data found for ${selectedDrug}`);
        }
      } catch (err) {
        setError("Network error: Could not reach analysis server.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [selectedDrug]);

  const filteredReviews = useMemo(() => {
    if (!data) return [];
    return data.all_classified_reviews.filter((review) => {
      const catMatch = filters.categories.includes(review.predicted_category);
      const ageMatch = !review.age || (review.age >= filters.ageRange[0] && review.age <= filters.ageRange[1]);
      const genderMatch = filters.genders.length === 0 || !review.gender || filters.genders.includes(review.gender);
      return catMatch && ageMatch && genderMatch;
    });
  }, [data, filters]);

  const handleDownload = () => {
    if (!filteredReviews.length) return;
    const headers = ['Review Text', 'Category', 'Age', 'Gender'];
    const csvContent = [
      headers.join(','),
      ...filteredReviews.map(r => [
        `"${r.review_text.replace(/"/g, '""')}"`,
        r.predicted_category,
        r.age || 'N/A',
        r.gender || 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedDrug}_reviews.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 text-white p-6 shrink-0 shadow-xl overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Pill className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DrugInsight AI</h1>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-[0.2em]">Select Medication</label>
            <div className="relative">
              <select 
                value={selectedDrug}
                onChange={(e) => setSelectedDrug(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 pr-10 appearance-none focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none cursor-pointer truncate"
              >
                <option value="" className="bg-slate-900">Choose a drug...</option>
                {drugList.map(drug => (
                  <option key={drug} value={drug} className="bg-slate-900">{drug}</option>
                ))}
              </select>
              <Search className="absolute right-3.5 top-4 text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-6 text-blue-400">
              <Filter size={18} />
              <h2 className="font-semibold text-sm">Review Filters</h2>
            </div>

            {data ? (
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">CATEGORIES</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(data.review_summary).map(cat => (
                      <label key={cat} className="flex items-center gap-3 text-sm cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={filters.categories.includes(cat)}
                          onChange={() => {
                            setFilters((prev: Filters) => ({
                              ...prev,
                              categories: prev.categories.includes(cat)
                                ? prev.categories.filter((c: string) => c !== cat)
                                : [...prev.categories, cat]
                            }));
                          }}
                          className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20 w-4 h-4"
                        />
                        <span className="text-slate-400 group-hover:text-white transition-colors capitalize">
                          {cat.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">
                    AGE RANGE: <span className="text-blue-400">{filters.ageRange[0]} - {filters.ageRange[1]}</span>
                  </label>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={filters.ageRange[1]}
                    onChange={(e) => setFilters((prev: Filters) => ({ ...prev, ageRange: [prev.ageRange[0], parseInt(e.target.value)] }))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">Select a drug to enable filters</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-10">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-40">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="text-slate-500 font-medium">Analyzing reviews for {selectedDrug}...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="text-amber-500" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Unavailable</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                We couldn't retrieve clinical data for <span className="font-semibold text-slate-700">{selectedDrug}</span>. This may be due to insufficient sample size.
              </p>
              <button onClick={() => setSelectedDrug('')} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Select another drug
              </button>
            </div>
          ) : data ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest mb-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    AI Analysis Active
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">{selectedDrug} Analysis</h2>
                </div>
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-blue-600 mb-4">
                    <TrendingUp size={20} />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">Trust Score</h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900">{(data.trust_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${data.trust_score * 100}%` }} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-indigo-600 mb-4">
                    <Users size={20} />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">Sample Size</h3>
                  </div>
                  <div className="text-4xl font-black text-slate-900">{data.total_reviews}</div>
                  <p className="text-slate-400 text-xs mt-2">Verified Testimonials</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-cyan-600 mb-4">
                    <TableIcon size={20} />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">Filtered Results</h3>
                  </div>
                  <div className="text-4xl font-black text-slate-900">{filteredReviews.length}</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Distribution</h3>
                  <ReviewChart data={data.review_summary} />
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Key Sentiment Drivers</h3>
                  <div className="flex-1 space-y-5">
                    {(Object.entries(data.review_summary) as [string, number][]).sort(([,a], [,b]) => b - a).slice(0, 5).map(([cat, count]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="capitalize font-semibold text-slate-700">{cat.replace(/_/g, ' ')}</span>
                          <span className="text-slate-400">{Math.round((count / data.total_reviews) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-50 rounded-full">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / data.total_reviews) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Feed */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                   <h3 className="text-lg font-bold text-slate-900">Patient Testimonials</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-6 py-4">Review Content</th>
                        <th className="px-6 py-4">Classification</th>
                        <th className="px-6 py-4">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredReviews.length > 0 ? (
                        filteredReviews.map((review, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <p className="text-slate-700 text-sm leading-relaxed max-w-xl line-clamp-2 hover:line-clamp-none cursor-pointer transition-all">
                                {review.review_text}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                {review.predicted_category.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-xs text-slate-500 whitespace-nowrap">
                                {review.age ? `${review.age}y` : 'N/A'} • {review.gender || 'N/A'}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-20 text-center text-slate-400 italic">No matches found for active filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <ChatBot drugData={data}/>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-40 text-center">
              <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-8 rotate-3">
                <Pill size={48} className="text-blue-600 -rotate-12" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">DrugInsight AI Analysis</h2>
              <p className="text-slate-500 max-w-xs leading-relaxed">
                Select a medication from the sidebar to visualize patient feedback trends and trust metrics.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;