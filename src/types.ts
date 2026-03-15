export interface Review {
  review_text: string;
  predicted_category: string;
  age?: number;
  gender?: string;
  useful_count?: number;
}

export interface DrugAnalysis {
  drug_name: string;
  trust_score: number;
  total_reviews: number;
  review_summary: Record<string, number>;
  all_classified_reviews: Review[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Filters {
  categories: string[];
  ageRange: [number, number];
  genders: string[];
}