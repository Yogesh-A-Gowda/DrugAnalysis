import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Pill,
  Filter,
  TrendingUp,
  Users,
  Table as TableIcon,
  Loader2,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { type DrugAnalysis, type Filters } from './types';
import { fetchDrugList, fetchDrugAnalysis } from './services/drugService';
import { ReviewChart } from './components/ReviewChart';
import { ChatBot } from './components/ChatBot';
import { LandingPage } from './components/LandingPage';

const App: React.FC = () => {
  const [drugList, setDrugList] = useState<string[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<DrugAnalysis | null>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<Filters>({
    categories: [],
    ageRange: [0, 100],
    genders: [],
  });

  const availableGenders = useMemo(() => {
    const uniqueNormalized = Array.from(
      new Set(
        allReviews
          .map(r => r.gender?.trim().toLowerCase())
          .filter(g => g === 'male' || g === 'female')
      )
    );
    return uniqueNormalized.map(g => g.charAt(0).toUpperCase() + g.slice(1)).sort();
  }, [allReviews]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const loadDrugs = async () => {
      try {
        const list = await fetchDrugList();
        const unique = Array.from(
          new Set(list.filter(n => n?.trim()).map(n => n.trim().toLowerCase()))
        )
          .map(n => n.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
          .sort();
        setDrugList(unique);
      } catch (err) {
        console.error('Failed to load drug list', err);
      }
    };
    loadDrugs();
  }, []);

  const fetchAnalysisData = async (drugName: string, skip: number = 0) => {
    setLoading(true);
    try {
      const result = await fetchDrugAnalysis(drugName, skip, 50);
      if (result) {
        setData(result);
        if (skip === 0) {
          setAllReviews(result.all_classified_reviews);
          setFilters({
            categories: Object.keys(result.review_summary),
            ageRange: [0, 100],
            genders: [],
          });
        } else {
          setAllReviews(prev => [...prev, ...result.all_classified_reviews]);
        }
      }
    } catch (err) {
      setError('Failed to reach server.');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDrug) {
      setAllReviews([]);
      fetchAnalysisData(selectedDrug, 0);
    }
  }, [selectedDrug]);

  const filteredReviews = useMemo(() => {
    return allReviews.filter(r => {
      const catMatch = filters.categories.includes(r.predicted_category);
      const age = r.age || 0;
      const ageMatch = age >= filters.ageRange[0] && age <= filters.ageRange[1];

      const reviewGender = r.gender?.trim().toLowerCase();
      const genderMatch =
        filters.genders.length === 0 ||
        filters.genders.map(g => g.toLowerCase()).includes(reviewGender);

      return catMatch && ageMatch && genderMatch;
    });
  }, [allReviews, filters]);

  const sentimentDrivers = useMemo(() => {
    const counts: Record<string, number> = {};
    allReviews.forEach(r => {
      counts[r.predicted_category] = (counts[r.predicted_category] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [allReviews]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
            fixed inset-y-0 left-0 z-40 w-[85%] max-w-sm bg-slate-900 text-white p-5 shadow-2xl
            transition-transform duration-300 ease-in-out
            md:static md:w-80 md:max-w-none md:shrink-0 md:shadow-xl md:overflow-y-auto
            overflow-y-auto
          `}
        >
          <div className="flex items-center justify-between md:justify-start">
            <div className="flex items-center gap-3 mb-0 md:mb-10">
              <Pill className="text-blue-500" size={24} />
              <h1 className="text-xl font-bold tracking-tight">DrugInsight AI</h1>
            </div>

            <button
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-200"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 space-y-8 md:mt-0">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">
                Select Medication
              </label>
              <div className="relative w-full" ref={dropdownRef}>
                <div className="relative cursor-text" onClick={() => setIsDropdownOpen(true)}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search drug..."
                    value={isDropdownOpen ? searchTerm : selectedDrug}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 truncate"
                  />
                  <ChevronDown
                    size={16}
                    className={`absolute right-3.5 top-4 text-slate-500 transition-all ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {isDropdownOpen && (
                  <div className="absolute mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                    {drugList
                      .filter(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(drug => (
                        <div
                          key={drug}
                          onClick={() => {
                            setSelectedDrug(drug);
                            setIsDropdownOpen(false);
                            setSearchTerm('');
                            setSidebarOpen(false);
                          }}
                          className="p-3 text-sm hover:bg-blue-600 cursor-pointer truncate border border-slate-700"
                        >
                          {drug}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-6 text-blue-400">
                <Filter size={18} />
                <h2 className="font-semibold text-sm">Filters</h2>
              </div>

              {data && (
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">
                      Categories
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.keys(data.review_summary).map(cat => (
                        <label key={cat} className="flex items-center gap-3 text-sm cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filters.categories.includes(cat)}
                            onChange={() =>
                              setFilters(prev => ({
                                ...prev,
                                categories: prev.categories.includes(cat)
                                  ? prev.categories.filter(c => c !== cat)
                                  : [...prev.categories, cat],
                              }))
                            }
                            className="accent-blue-500"
                          />
                          <span className="text-slate-400 group-hover:text-white capitalize truncate">
                            {cat.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">
                      Gender
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableGenders.map(gender => (
                        <button
                          key={gender}
                          onClick={() =>
                            setFilters(prev => ({
                              ...prev,
                              genders: prev.genders.includes(gender)
                                ? prev.genders.filter(g => g !== gender)
                                : [...prev.genders, gender],
                            }))
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            filters.genders.includes(gender)
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest">
                      Age Range:{' '}
                      <span className="text-blue-400 font-mono">
                        {filters.ageRange[0]} - {filters.ageRange[1]}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.ageRange[1]}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          ageRange: [prev.ageRange[0], parseInt(e.target.value)],
                        }))
                      }
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-10 overflow-y-auto">
          {data ? (
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
              <div className="flex items-center justify-between gap-3 md:justify-between">
                <button
                  className="md:hidden p-2 rounded-lg bg-white border border-slate-200 shadow-sm"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <Menu size={18} />
                </button>

                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {selectedDrug} Analysis
                </h2>

                <div className="text-[10px] md:text-xs font-bold text-blue-600 flex items-center gap-2">
                  Loaded {allReviews.length} / {data.total_reviews} reviews
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <TrendingUp size={16} />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">
                      Trust Score
                    </h3>
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-slate-900">
                    {(data.trust_score * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Users size={16} />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">
                      Total Reviews
                    </h3>
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-slate-900">
                    {data.total_reviews}
                  </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 text-cyan-600 mb-2">
                    <TableIcon size={16} />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">
                      Filtered
                    </h3>
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-blue-600">
                    {filteredReviews.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Review Distribution</h3>
                  <ReviewChart data={data.review_summary} />
                </div>

                <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Key Sentiment Drivers</h3>
                  <div className="flex-1 space-y-5">
                    {sentimentDrivers.map(([cat, count]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="capitalize font-semibold text-slate-700">
                            {cat.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400">
                            {Math.round((count / allReviews.length) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-50 rounded-full">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${(count / allReviews.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[640px]">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                      <tr>
                        <th className="px-4 py-3 md:px-6 md:py-4">Review Content</th>
                        <th className="px-4 py-3 md:px-6 md:py-4">Classification</th>
                        <th className="px-4 py-3 md:px-6 md:py-4">Age/Gender</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredReviews.length > 0 ? (
                        filteredReviews.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 md:px-6 md:py-4 text-sm text-slate-700 line-clamp-2">
                              {r.review_text}
                            </td>
                            <td className="px-4 py-3 md:px-6 md:py-4">
                              <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                {r.predicted_category.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-slate-500 whitespace-nowrap">
                              {r.age ? `${r.age}y` : 'N/A'} • {r.gender || 'N/A'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">
                            No reviews match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {allReviews.length < data.total_reviews && (
                  <div className="p-6 md:p-8 flex justify-center border-t border-slate-50 bg-slate-50/50">
                    <button
                      onClick={() => fetchAnalysisData(selectedDrug, allReviews.length)}
                      disabled={loading}
                      className="flex items-center gap-3 px-6 py-3 md:px-10 md:py-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {loading && <Loader2 className="animate-spin" size={18} />}
                      Load More Reviews
                    </button>
                  </div>
                )}
              </div>

              <ChatBot drugData={data} />
            </div>
          ) : (
            <LandingPage
              drugCount={drugList.length}
              onSearchClick={() => {
                setSidebarOpen(true);
                setIsDropdownOpen(true);
                searchInputRef.current?.focus();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;









































