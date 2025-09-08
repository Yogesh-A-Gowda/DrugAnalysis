# src/dashboard.py
import streamlit as st
import pandas as pd
import plotly.express as px
import os

# -----------------------------
# Paths
# -----------------------------
DATA_PATH = "./data/drug_reviews_with_categories.csv"

if not os.path.exists(DATA_PATH):
    st.error(f"❌ Data file not found: {DATA_PATH}")
    st.markdown("Please ensure your processed data is saved at `../data/drug_reviews_with_categories.csv`")
    st.stop()

# -----------------------------
# Load Data
# -----------------------------
@st.cache_data
def load_data():
    try:
        df = pd.read_csv(DATA_PATH)
        if 'drug_review' in df.columns:
            df.rename(columns={'drug_review': 'review_text'}, inplace=True)
        if 'drug_name' not in df.columns:
            st.error("❌ 'drug_name' column missing in data")
            st.stop()
        df['drug_name'] = df['drug_name'].str.lower().str.strip()
        return df
    except Exception as e:
        st.error(f"❌ Failed to load data: {str(e)}")
        st.stop()

df = load_data()

# -----------------------------
# Dashboard UI
# -----------------------------
st.title("💊 DrugTrust AI Dashboard")
st.markdown("AI-powered insights from real patient reviews")

# Sidebar Filters
st.sidebar.header("🔍 Search & Filter")
all_drugs = sorted(df['drug_name'].dropna().unique())
selected_drug = st.sidebar.selectbox("Select Drug", all_drugs)

min_age = int(df['age'].min()) if df['age'].notna().any() else 10
max_age = int(df['age'].max()) if df['age'].notna().any() else 100
age_range = st.sidebar.slider("Age Range", min_age, max_age, (18, 70))
gender_filter = st.sidebar.selectbox("Gender", ["All", "male", "female"])

# Filter Data
filtered_df = df[df['drug_name'] == selected_drug]
filtered_df = filtered_df[
    (filtered_df['age'] >= age_range[0]) &
    (filtered_df['age'] <= age_range[1])
]
if gender_filter != "All":
    filtered_df = filtered_df[filtered_df['gender'] == gender_filter]

if filtered_df.empty:
    st.warning("⚠️ No reviews found for these filters.")
    st.stop()

# -----------------------------
# Compute Trust Score
# -----------------------------
category_scores = {
    "Positive_Experience": +1.0,
    "Severe_Side_Effects": -1.0,
    "Ineffective": -0.8,
    "Dependency/Addiction": -0.9,
    "Dosage_Issues": -0.5,
    "Mixed_Feedback": 0.0
}
raw_score = filtered_df['predicted_category'].map(category_scores).mean()
trust_score = (raw_score + 1) / 2  # 0–1 scale

# Metrics
col1, col2, col3, col4 = st.columns(4)
col1.metric("Trust Score", f"{trust_score:.2f}")
col2.metric("Total Reviews", len(filtered_df))
col3.metric("Positive", len(filtered_df[filtered_df['predicted_category'] == "Positive_Experience"]))
col4.metric("Side Effects", len(filtered_df[filtered_df['predicted_category'] == "Severe_Side_Effects"]))

# -----------------------------
# Tabs: Overview + 3 Feedback Types
# -----------------------------
tab1, tab2, tab3, tab4 = st.tabs(["📊 Overview", "✅ Positive Effects", "⚠️ Side Effects", "🔄 Mixed Feedback"])

# Tab 1: Overview (Charts)
with tab1:
    st.subheader("Feedback Categories")
    cat_counts = filtered_df['predicted_category'].value_counts().reset_index()
    cat_counts.columns = ['Category', 'Count']
    fig1 = px.pie(cat_counts, values='Count', names='Category', title="Review Categories")
    st.plotly_chart(fig1)

    if 'age' in filtered_df.columns and filtered_df['age'].notna().any():
        st.subheader("Reviewer Age Distribution")
        fig2 = px.histogram(filtered_df, x='age', nbins=10, title="Age of Patients")
        st.plotly_chart(fig2)

# Tab 2: Positive Effects
with tab2:
    st.subheader("📋 Patient-Reported Positive Effects")
    pos_reviews = filtered_df[filtered_df['predicted_category'] == "Positive_Experience"]
    if len(pos_reviews) == 0:
        st.write("No positive reviews found for these filters.")
    else:
        for _, row in pos_reviews.head(50).iterrows():
            with st.container():
                st.markdown(f"💬 *“{row['review_text'][:300]}{'...' if len(row['review_text']) > 300 else ''}”*")
                meta = f"👤 {row.get('gender', 'Unknown')}, {row.get('age', 'Unknown')} yrs"
                st.caption(meta)
            st.divider()

# Tab 3: Side Effects
with tab3:
    st.subheader("📋 Patient-Reported Side Effects")
    neg_reviews = filtered_df[filtered_df['predicted_category'] == "Severe_Side_Effects"]
    if len(neg_reviews) == 0:
        st.write("No severe side effects reported for these filters.")
    else:
        for _, row in neg_reviews.head(50).iterrows():
            with st.container():
                st.markdown(f"⚠️ *“{row['review_text'][:300]}{'...' if len(row['review_text']) > 300 else ''}”*")
                meta = f"👤 {row.get('gender', 'Unknown')}, {row.get('age', 'Unknown')} yrs"
                st.caption(meta)
            st.divider()

# Tab 4: Mixed Feedback
with tab4:
    st.subheader("📋 Patient-Reported Mixed Feedback")
    mixed_reviews = filtered_df[filtered_df['predicted_category'] == "Mixed_Feedback"]
    if len(mixed_reviews) == 0:
        st.write("No mixed feedback found for these filters.")
    else:
        for _, row in mixed_reviews.head(50).iterrows():
            with st.container():
                st.markdown(f"🔄 *“{row['review_text'][:300]}{'...' if len(row['review_text']) > 300 else ''}”*")
                meta = f"👤 {row.get('gender', 'Unknown')}, {row.get('age', 'Unknown')} yrs"
                st.caption(meta)
            st.divider()