# Placement Preparation Agent 🎓🤖

An AI-powered placement preparation hub that helps students prepare for interviews, analyze resumes, practice mock interviews, and solve daily coding challenges. The application is powered by the **Llama 3** model via the **Groq Cloud API** and uses a clean, modern dashboard with a Blue + White theme (supporting a dark mode toggle).

---

## Table of Contents
1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Local Setup Guide](#local-setup-guide)
5. [Groq API Key Configuration](#groq-api-key-configuration)
6. [Deployment Instructions](#deployment-instructions)
   - [Backend to Render](#backend-to-render)
   - [Frontend to Vercel](#frontend-to-vercel)
7. [Common Troubleshooting](#common-troubleshooting)

---

## Key Features

- **Personalized Placement Roadmap:** Generates a custom study timeline (7, 15, or 30 days) matching the student's language, college, skill level, and days remaining.
- **Resume Critic (ATS Scanner):** Calculates ATS matches, highlights resume strengths, points out mistakes, and lists missing technical keywords.
- **Interactive Mock Interviews:** Generates 10 Technical, 10 HR, and 10 Behavioral questions matching student preferences, with answers, common mistakes, and delivery tips.
- **Company Specific Blueprints:** Guides for TCS, Infosys, Accenture, Capgemini, Zoho, Amazon, Google, and Microsoft.
- **Daily Coding & Aptitude Challenges:** Refreshes problems from LeetCode and HackerRank, alongside aptitude math and SQL challenges.
- **Weakness Action Plan:** Inputs student weaknesses and generates targeted conceptual improvement plans.
- **Gamification & Utilities:** Placement countdown, today's goal cards, streak counters, global leaderboard simulation, achievements, PDF report print, JSON export, and bookmark managers.

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Bootstrap 5, FontAwesome, JavaScript (Vanilla ES6).
- **Backend:** Python Flask.
- **AI Engine:** Groq API (Llama 3 8B model in JSON mode).
- **Storage:** Local JSON File (`data.json`).
- **Deployment:** Render (Python Backend) & Vercel (Frontend Static assets / API endpoints).

---

## Folder Structure

```
Placement-Agent/
│
├── static/
│   ├── css/
│   │   └── style.css      # Theme variables, responsive sidebar, animations
│   ├── js/
│   │   └── app.js         # Fetch client, wizard control, charts, print/shares
│   └── images/            # Directory for images and assets
│
├── templates/
│   ├── index.html         # Landing hero & features showcase
│   ├── dashboard.html     # Profile wizard setup page
│   └── result.html        # Main dashboard recommendation portal
│
├── app.py                 # Flask server & Llama 3 prompt engineering
├── requirements.txt       # Python package dependencies
├── data.json              # Local flat-file database storage
├── .env                   # Configuration parameters (contains GROQ_API_KEY)
└── README.md              # Project documentation
```

---

## Local Setup Guide

### 1. Prerequisites
Ensure you have **Python 3.8+** installed. You can check your version using:
```bash
python --version
```

### 2. Clone/Extract the Code
Navigate to the root directory where the files are placed:
```bash
cd Placement-Agent
```

### 3. Initialize Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Create Configuration Environment
Verify that the `.env` file is in the project root:
```env
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 6. Run the Application
Start the Flask dev server:
```bash
python app.py
```
Open your browser and navigate to: **`http://localhost:5000`**

---

## Groq API Key Configuration

1. Visit the [Groq Cloud Console](https://console.groq.com/) and register for an account.
2. Navigate to **API Keys** and generate a new key.
3. Copy the key (starts with `gsk_...`).
4. Paste it in your `.env` file for the `GROQ_API_KEY` variable.

*Note: If no API key is specified, the application automatically switches to a robust local mock data generator, allowing you to test all frontend features, sidebars, resume evaluations, and mock structures offline!*

---

## Deployment Instructions

### Backend to Render

[Render](https://render.com/) is a cloud hosting service that easily hosts Flask backends.

1. **Push your code to GitHub** (Create a repository and commit all files except `venv` and the local `.env`).
2. Log in to your Render Dashboard.
3. Click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Configure the web service:
   - **Name:** `placement-prep-agent`
   - **Environment:** `Python 3`
   - **Region:** Choose closest region.
   - **Branch:** `main`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
6. Click **Advanced** and add your Environment Variables:
   - Key: `GROQ_API_KEY` | Value: `(your groq api key)`
7. Click **Create Web Service**. Render will build and host your app.

---

### Frontend to Vercel

If you deploy the application as a unified Flask app, deploying to Render serves both the frontend templates and backend API. However, if you wish to run the frontend independently on Vercel:

1. **Prepare static frontend:** Convert templates (`index.html`, `dashboard.html`, `result.html`) to static HTML files.
2. Change backend endpoints in `static/js/app.js` from relative paths (e.g. `/api/...`) to absolute paths matching your deployed Render backend (e.g. `https://placement-prep-agent.onrender.com/api/...`).
3. Connect your project to Vercel via GitHub.
4. Click **Deploy**. Vercel will host the frontend assets.

---

## Common Troubleshooting

### 1. `ModuleNotFoundError: No module named 'flask'`
* **Cause:** Python environment mismatch or missing pip installation.
* **Fix:** Verify your virtual environment is active (`venv\Scripts\activate`) and re-run `pip install -r requirements.txt`.

### 2. Groq API Errors (401 Unauthorized or Rate Limits)
* **Cause:** Missing or expired API key.
* **Fix:** Double check the `GROQ_API_KEY` value inside `.env` or your Render dashboard. Ensure you have tokens remaining on your Groq Console.

### 3. CSS/JS Loading Issue (404)
* **Cause:** Incorrect file placement.
* **Fix:** Ensure all CSS is in `static/css/style.css` and JS is in `static/js/app.js` relative to the workspace.

### 4. JSON Serialization Errors
* **Cause:** Special characters or improper escape sequences returned from Llama 3.
* **Fix:** We enforce `response_format={"type": "json_object"}` in `app.py` to prevent formatting failures.
"# prep-agent" 
