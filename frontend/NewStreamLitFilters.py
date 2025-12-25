import streamlit as st
import pandas as pd
import requests
import json
from io import BytesIO
import altair as alt

# --- CONFIGURATION ---
API_BASE_URL = "https://yogeshagowda-drug-trust-score-api.hf.space" 

# --- STREAMLIT PAGE SETUP ---
st.set_page_config(
    page_title="Drug Trust Score Dashboard",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("💊 Drug Trust Score and Review Analysis")
st.markdown("---")

# --- UTILITY FUNCTIONS ---

@st.cache_data(ttl=3600) 
def fetch_drug_list():
    """Fetches the list of all available drugs from the FastAPI backend."""
    try:
        response = requests.get(f"{API_BASE_URL}/drugs")
        response.raise_for_status()
        print(response.json())
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Cannot connect to the API at {API_BASE_URL}. Please ensure the FastAPI server is running. Error: {e}")
        return []

@st.cache_data(ttl=600) 
def fetch_drug_analysis(drug_name: str):
    """Fetches the detailed analysis for a specific drug from the FastAPI backend."""
    try:
        response = requests.get(f"{API_BASE_URL}/analysis/{drug_name}")
        response.raise_for_status()
        print(response.json())
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            st.error(f"Drug '{drug_name}' not found or has no valid reviews in the database.")
            return None
        elif e.response.status_code == 500:
             st.error(f"Internal Server Error during analysis. Check the FastAPI console for the traceback.")
             return None
        else:
            st.error(f"An unexpected error occurred: {e}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Network error while fetching analysis: {e}")
        return None

# --- SIDEBAR AND INPUTS ---
drug_list = fetch_drug_list()

# Sidebar Selectbox
with st.sidebar:
    st.header("Selection")
    if drug_list and drug_list[0] not in ['Data Load Error', 'Data Processing Error']:
        selected_drug = st.selectbox(
            "Select a Drug for Analysis",
            options=drug_list,
            index=0
        )
    else:
        st.warning("Drug list is unavailable. Check API logs.")
        selected_drug = None

    if selected_drug:
        st.subheader("Filter Reviews")
        # Filters will be populated after data retrieval

# --- MAIN LOGIC ---

if selected_drug:
    data = fetch_drug_analysis(selected_drug)

    if data:
        st.header(f"Results for: {selected_drug}")

        # 1. Prepare DataFrames
        review_summary = data['review_summary']
        
        reviews_df = pd.DataFrame(data['all_classified_reviews'])
        
        # 📌 FIX: Data Cleaning with Defensive Checks (Resolves KeyError: 'age')
        if 'age' in reviews_df.columns:
            reviews_df['age'] = reviews_df['age'].fillna(0).astype(int)
        
        if 'useful_count' in reviews_df.columns:
            reviews_df['useful_count'] = reviews_df['useful_count'].fillna(0).astype(int)
        
        # 2. Display Key Metrics (Trust Score)
        col1, col2, col3 = st.columns(3)
        
        with col1:
            score = data['trust_score'] * 100
            st.metric(
                label="Overall Trust Score (0-100)", 
                value=f"{score:.2f}%", 
                delta=f"Based on {data['total_reviews']} reviews"
            )

        with col2:
            st.metric(label="Total Reviews Analyzed", value=f"{data['total_reviews']}")

        # 3. Sidebar Filters (Populated now that we have reviews_df)
        with st.sidebar:
            # Category Filter
            category_options = list(review_summary.keys())
            selected_categories = st.multiselect(
                "Review Categories",
                options=category_options,
                default=category_options
            )

            # Age Filter (only if column exists)
            if 'age' in reviews_df.columns and reviews_df['age'].max() > reviews_df['age'].min():
                min_age = int(reviews_df['age'].min())
                max_age = int(reviews_df['age'].max())
                age_range = st.slider(
                    "Age Range",
                    min_value=min_age,
                    max_value=max_age,
                    value=(min_age, max_age)
                )
            elif 'age' in reviews_df.columns:
                 age_range = (int(reviews_df['age'].min()), int(reviews_df['age'].max()) + 1)
            else:
                age_range = (0, 100)
            
            # Gender Filter (only if column exists)
            if 'gender' in reviews_df.columns:
                gender_options = reviews_df['gender'].unique().tolist()
                selected_genders = st.multiselect(
                    "Gender",
                    options=gender_options,
                    default=gender_options
                )
            else:
                selected_genders = []

        # 4. Apply Filtering (Defensive Check for predicted_category)
        filtered_df = reviews_df.copy() 
        
        if 'predicted_category' in reviews_df.columns: # 📌 FIX: Resolves KeyError: 'predicted_category'
            filtered_df = filtered_df[filtered_df['predicted_category'].isin(selected_categories)]
        else:
            st.warning("Category filtering is unavailable. The prediction model may have failed to run on the backend.")

        if 'age' in reviews_df.columns:
            filtered_df = filtered_df[
                (filtered_df['age'] >= age_range[0]) & 
                (filtered_df['age'] <= age_range[1])
            ]
        
        if 'gender' in reviews_df.columns and selected_genders:
            filtered_df = filtered_df[filtered_df['gender'].isin(selected_genders)]
        
        st.markdown("---")
        
        # 5. Review Breakdown Visualization
        st.subheader("Review Category Breakdown")

        summary_df = pd.DataFrame(
            list(review_summary.items()), 
            columns=['Category', 'Count']
        )

        chart_df = summary_df[summary_df['Count'] > 0]

        if not chart_df.empty:
            # 📌 FIX: Use standard Altair creation (assuming 'import altair as alt' is present)

            # 1. Clean the Category names for display
            chart_df['Category_Display'] = chart_df['Category'].str.replace('_', ' ')

            # 2. Define the Altair Chart
            base = alt.Chart(chart_df).encode(
                theta=alt.Theta("Count", stack=True)
            )

            pie = base.mark_arc(outerRadius=120, innerRadius=50).encode(
                color=alt.Color("Category_Display"),
                order=alt.Order("Count", sort="descending"),
                tooltip=["Category_Display", "Count"]
            )

            # 3. Pass the Altair object directly to st.altair_chart
            st.altair_chart(pie, use_container_width=True)
        else:
            st.info("No reviews found for visualization.")

        st.markdown("---")

        # 6. Display Filtered Reviews
        st.subheader(f"Filtered Reviews ({len(filtered_df)} of {data['total_reviews']})")

        if filtered_df.empty:
            st.info("No reviews match the current combination of filters (Category, Age, and Gender). Please adjust your filters.")
        else:
        # Select columns for display
            display_cols = ['review_text', 'predicted_category']
            if 'age' in filtered_df.columns:
                display_cols.append('age')
            if 'gender' in filtered_df.columns:
                display_cols.append('gender')
            if 'useful_count' in filtered_df.columns:
                display_cols.append('useful_count')

            st.dataframe(
                filtered_df[display_cols].rename(columns={'predicted_category': 'Category', 'review_text': 'Review Text', 'useful_count': 'Helpful Votes', 'age': 'Age', 'gender': 'Gender'}), 
                use_container_width=True
            )

            # Download Button
            csv = filtered_df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="Download Filtered Reviews as CSV",
                data=csv,
                file_name=f"{selected_drug}_filtered_reviews.csv",
                mime="text/csv",
            )