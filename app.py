import streamlit as st
import google.generativeai as genai
import PyPDF2
from gtts import gTTS
import os

# --- 1. PAGE SETUP ---
st.set_page_config(page_title="NyayaBot", page_icon="⚖️")
st.title("⚖️ NyayaBot: Legal Aid")
st.warning("⚠️ Disclaimer: Not a lawyer. For awareness only.")

# --- 2. SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Settings")
    api_key = st.text_input(
        "Google API Key",
        value=os.getenv("GEMINI_API_KEY", ""),
        type="password",
    )
    uploaded_files = st.file_uploader("Upload Law PDFs", accept_multiple_files=True)
    process_btn = st.button("📂 Load PDFs")

# --- 3. SESSION STATE ---
if "pdf_text" not in st.session_state:
    st.session_state.pdf_text = ""
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- 4. PROCESS PDFs ---
if process_btn and api_key and uploaded_files:
    with st.spinner("🤖 Reading Laws..."):
        try:
            full_text = ""
            for file in uploaded_files:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    full_text += page.extract_text()
            st.session_state.pdf_text = full_text
            st.success("✅ Laws Loaded! Ready to Ask.")
        except Exception as e:
            st.error(f"Error reading PDF: {str(e)}")

# --- 5. CHAT INTERFACE ---
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if query := st.chat_input("Ask about your rights..."):
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)
    
    with st.chat_message("assistant"):
        if not api_key:
            st.error("🔑 Please add API Key in sidebar")
        elif not st.session_state.pdf_text:
            st.error("📄 Please upload PDFs first")
        else:
            try:
                with st.spinner("Thinking..."):
                    genai.configure(api_key=api_key)
                    model = genai.GenerativeModel("gemini-2.5-flash")
                    
                    # Prompt Engineering
                    prompt = f"""
You are a careful legal information assistant for India.
Use only the supplied document context. Do not invent sections, cases, dates,
or legal rules. If the context does not answer the question, say that clearly.
Separate confirmed information from uncertainty, use plain language, and end
with: Consult a qualified lawyer for advice about a real case.

DOCUMENT CONTEXT:
{st.session_state.pdf_text}

QUESTION:
{query}
"""
                    
                    response = model.generate_content(prompt)
                    ans = response.text
                    
                    st.markdown(ans)
                    
                    # --- VOICE BUTTON ---
                    if st.button("🔊 Speak Answer"):
                        tts = gTTS(text=ans, lang='en')
                        tts.save("resp.mp3")
                        st.audio("resp.mp3")
                    
                    st.session_state.messages.append({"role": "assistant", "content": ans})
            except Exception as e:
                st.error(f"AI Error: {str(e)}")