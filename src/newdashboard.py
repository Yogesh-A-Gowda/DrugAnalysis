# src/dashboard.py
import streamlit as st
import pandas as pd
import plotly.express as px
import os

# -----------------------------
# Paths
# -----------------------------
DATA_PATH = "https://raw.githubusercontent.com/Yogesh-A-Gowda/DrugAnalysis/main/src/data/drug_reviews_with_categories.csv"
TRUST_SCORES_PATH = "https://raw.githubusercontent.com/Yogesh-A-Gowda/DrugAnalysis/main/src/data/trust_scores.csv"

# Validate files
if not os.path.exists(DATA_PATH):
    st.error(f"❌ Data file not found: {DATA_PATH}")
    st.stop()

if not os.path.exists(TRUST_SCORES_PATH):
    st.warning(f"⚠️ Trust scores file not found: {TRUST_SCORES_PATH}")
    st.info("Using live computation from reviews.")
    TRUST_SCORES_PATH = None

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
        df['predicted_category'] = df['predicted_category'].astype(str).str.strip()
        return df
    except Exception as e:
        st.error(f"❌ Failed to load data: {str(e)}")
        st.stop()

@st.cache_data
def load_trust_scores():
    if TRUST_SCORES_PATH and os.path.exists(TRUST_SCORES_PATH):
        trust_df = pd.read_csv(TRUST_SCORES_PATH)
        trust_df['drug_name'] = trust_df['drug_name'].str.lower().str.strip()
        # aggregate to avoid duplicates
        trust_df = trust_df.groupby('drug_name', as_index=False)['trust_score'].mean()
        return trust_df.set_index('drug_name')['trust_score']
    else:
        # Compute from data
        df = load_data()
        category_scores = {
            "Positive_Experience": +1.0,
            "Severe_Side_Effects": -1.0,
            "Ineffective": -0.8,
            "Dependency/Addiction": -0.9,
            "Dosage_Issues": -0.5,
            "Mixed_Feedback": 0.0
        }
        df['score'] = df['predicted_category'].map(category_scores)
        trust_scores = df.groupby('drug_name')['score'].mean()
        trust_scores = (trust_scores + 1) / 2  # scale 0–1
        trust_scores = trust_scores.fillna(0.0)
        return trust_scores

df = load_data()
trust_scores = load_trust_scores()

# -----------------------------
# Sidebar Filters
# -----------------------------
st.sidebar.header("🔍 Filters")

# Trust Score Filter
min_trust = st.sidebar.slider("🏆 Min Trust Score", 0.0, 1.0, 0.0, 0.05)

# Filter available drugs
available_drugs = trust_scores[trust_scores >= min_trust].index.tolist()
available_drugs = sorted(set(available_drugs) & set(df['drug_name'].unique()))
available_drugs = sorted(available_drugs)

if not available_drugs:
    st.warning("⚠️ No drugs meet the minimum trust threshold.")
    st.stop()

st.sidebar.markdown(f"**📦 {len(available_drugs)} drugs available**")

selected_drug = st.sidebar.selectbox("💊 Select Drug", available_drugs)

# Age Filter
min_age = int(df['age'].min()) if df['age'].notna().any() else 10
max_age = int(df['age'].max()) if df['age'].notna().any() else 100
age_range = st.sidebar.slider("📅 Age Range", min_age, max_age, (18, 70))

# Gender Filter
gender_filter = st.sidebar.selectbox("👤 Gender", ["All", "male", "female"])

# -----------------------------
# Apply Filters
# -----------------------------
filtered_df = df[df['drug_name'] == selected_drug]

# Age: keep if NaN or in range
if 'age' in filtered_df.columns:
    age_mask = (
        filtered_df['age'].isna() |
        ((filtered_df['age'] >= age_range[0]) & (filtered_df['age'] <= age_range[1]))
    )
    filtered_df = filtered_df[age_mask]

# Gender
if gender_filter != "All" and 'gender' in filtered_df.columns:
    gender_mask = (
        filtered_df['gender'].isna() |
        (filtered_df['gender'] == gender_filter)
    )
    filtered_df = filtered_df[gender_mask]

# -----------------------------
# Dashboard Header
# -----------------------------
st.title("💊 DrugTrust AI Dashboard")
st.markdown("#### AI-powered insights from real patient reviews")

current_trust = trust_scores.get(selected_drug, 0.0)

# ensure scalar
if isinstance(current_trust, pd.Series):
    current_trust = current_trust.iloc[0]

col1, col2 = st.columns(2)
with col1:
    st.metric("Trust Score", f"{float(current_trust):.2f}")

if len(filtered_df) == 0:
    st.info("ℹ️ No reviews match the current filters. Try adjusting age/gender.")
else:
    total = len(filtered_df)
    pos = len(filtered_df[filtered_df['predicted_category'] == "Positive_Experience"])
    neg = len(filtered_df[filtered_df['predicted_category'] == "Severe_Side_Effects"])
    mixed = len(filtered_df[filtered_df['predicted_category'] == "Mixed_Feedback"])

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Reviews", total)
    col2.metric("Positive", pos)
    col3.metric("Side Effects", neg)
    col4.metric("Mixed", mixed)

# -----------------------------
# Tabs
# -----------------------------
tab1, tab2, tab3, tab4 = st.tabs(["📊 Overview", "✅ Positive Effects", "⚠️ Side Effects", "🔄 Mixed Feedback"])

# Tab 1: Overview
with tab1:
    if len(filtered_df) == 0:
        st.write("No data to display.")
    else:
        cat_counts = filtered_df['predicted_category'].value_counts().reset_index()
        cat_counts.columns = ['Category', 'Count']
        fig1 = px.pie(cat_counts, values='Count', names='Category', title="Review Categories")
        st.plotly_chart(fig1)

        if 'age' in filtered_df.columns and filtered_df['age'].notna().any():
            fig2 = px.histogram(filtered_df, x='age', nbins=10, title="Reviewer Age Distribution")
            st.plotly_chart(fig2)

# Tab 2: Positive Effects
with tab2:
    pos_reviews = filtered_df[filtered_df['predicted_category'] == "Positive_Experience"]
    if len(pos_reviews) == 0:
        st.info("No positive reviews match the filters.")
    else:
        for _, row in pos_reviews.iterrows():
            with st.container():
                st.markdown(f"💬 *“{row['review_text'][:300]}{'...' if len(row['review_text']) > 300 else ''}”*")
                meta = f"👤 {row.get('gender', 'Unknown')}, {row.get('age', 'Unknown')} yrs"
                st.caption(meta)
            st.divider()

# Tab 3: Side Effects
with tab3:
    neg_reviews = filtered_df[filtered_df['predicted_category'] == "Severe_Side_Effects"]
    if len(neg_reviews) == 0:
        st.info("No severe side effects reported.")
    else:
        for _, row in neg_reviews.iterrows():
            with st.container():
                st.markdown(f"⚠️ *“{row['review_text'][:300]}{'...' if len(row['review_text']) > 300 else ''}”*")
                meta = f"👤 {row.get('gender', 'Unknown')}, {row.get('age', 'Unknown')} yrs"
                st.caption(meta)
            st.divider()

# Tab 4: Mixed Feedback
with tab4:
    mixed_reviews = filtered_df[filtered_df['predicted_category'] == "Mixed_Feedback"]
    if len(mixed_reviews) == 0:
        st.info("No mixed feedback found.")
    else:
        for _, row in mixed_reviews.iterrows():
            with st.container():
                st.markdown(f"🔄 *“{row['review_text'][:300]}{'...' if len(row['review_text']) > 300 else ''}”*")
                meta = f"👤 {row.get('gender', 'Unknown')}, {row.get('age', 'Unknown')} yrs"
                st.caption(meta)
            st.divider()
