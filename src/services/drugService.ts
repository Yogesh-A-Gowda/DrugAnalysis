import { type DrugAnalysis } from '../types';

const API_BASE_URL = import.meta.env.VITE_HUGFACE;

export const fetchDrugList = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/drugs`);
    if (!response.ok) throw new Error('Failed to fetch drug list');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching drug list:", error);
    return [];
  }
};

export const fetchDrugAnalysis = async (
  drugName: string, 
  skip: number = 0, 
  limit: number = 50
): Promise<DrugAnalysis | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/analysis/${encodeURIComponent(drugName)}?skip=${skip}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch analysis');
    const data = await response.json();
    
    if (data.all_classified_reviews) {
      data.all_classified_reviews = data.all_classified_reviews.map((r: any) => ({
        ...r,
        age: r.age ? parseInt(r.age) : 0,
        useful_count: r.useful_count ? parseInt(r.useful_count) : 0
      }));
    }
    return data;
  } catch (error) {
    console.error(`Error fetching analysis:`, error);
    return null;
  }
};