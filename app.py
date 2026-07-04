import os
import json
import random
from datetime import datetime, timedelta
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "placement_agent_secret_key_123")

# File path for local storage
DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

# Helper function to read from JSON file
def read_data():
    """Reads the JSON database file and returns its parsed contents."""
    if not os.path.exists(DATA_FILE):
        return {"leaderboard": [], "saved_profiles": [], "bookmarks": []}
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {DATA_FILE}: {e}")
        return {"leaderboard": [], "saved_profiles": [], "bookmarks": []}

# Helper function to write to JSON file
def write_data(data):
    """Writes the given data dict to the JSON database file."""
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error writing to {DATA_FILE}: {e}")
        return False

# Groq API Request Helper
def call_groq_api(system_prompt, user_prompt):
    """
    Calls the Groq Cloud API using the Llama 3 model in JSON Mode.
    If the API key is not configured or request fails, returns None (triggering fallback).
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Groq API key not found. Using local mock generator.")
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 4000
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return json.loads(content)
        else:
            print(f"Groq API returned error {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"Failed to communicate with Groq API: {e}")
        return None

# ========================================================
# FLASK ROUTING
# ========================================================

@app.route("/")
def home():
    """Renders the beautiful landing home page."""
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    """Renders the student dashboard form input page."""
    return render_template("dashboard.html")

@app.route("/result")
def result():
    """Renders the dynamic student progress and recommendations dashboard."""
    # We query the URL arguments or redirect back if no profile is set
    name = request.args.get("name")
    if not name:
        return render_template("dashboard.html")
    return render_template("result.html")

# ========================================================
# API ENDPOINTS
# ========================================================

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    """Fetches the placement leaderboard UI data."""
    data = read_data()
    return jsonify(data.get("leaderboard", []))

@app.route("/api/get-profile", methods=["GET"])
def get_profile():
    """Retrieves a saved student profile by name."""
    name = request.args.get("name")
    if not name:
        return jsonify({"success": False, "error": "Name parameter required"}), 400
    
    data = read_data()
    for profile in data.get("saved_profiles", []):
        if profile["name"].lower() == name.lower():
            return jsonify({"success": True, "profile": profile})
    
    return jsonify({"success": False, "error": "Profile not found"}), 404

@app.route("/api/save-profile", methods=["POST"])
def save_profile():
    """Saves or updates a student profile and bookmarks."""
    req_data = request.json
    if not req_data or "name" not in req_data:
        return jsonify({"success": False, "error": "Invalid profile data"}), 400
    
    data = read_data()
    profiles = data.get("saved_profiles", [])
    
    # Check if profile already exists, if so update it
    exists = False
    for i, profile in enumerate(profiles):
        if profile["name"].lower() == req_data["name"].lower():
            profiles[i] = req_data
            exists = True
            break
            
    if not exists:
        profiles.append(req_data)
        
    data["saved_profiles"] = profiles
    write_data(data)
    return jsonify({"success": True})

@app.route("/api/generate-roadmap", methods=["POST"])
def generate_roadmap():
    """
    Main endpoint that accepts student characteristics and returns a personalized
    AI preparation plan, DSA coding questions, interview guidelines, and resources.
    """
    user_data = request.json or {}
    name = user_data.get("name", "Student")
    college = user_data.get("college", "University")
    language = user_data.get("language", "Python")
    skill_level = user_data.get("skill_level", "Intermediate")
    target_company = user_data.get("target_company", "TCS")
    days_left = int(user_data.get("days_left", 30))
    strengths = user_data.get("strengths", "Problem solving")
    weaknesses = user_data.get("weaknesses", "Dynamic programming")
    resume_text = user_data.get("resume_text", "")

    # Prompt Engineering for Structured JSON Response
    system_prompt = """
    You are an expert AI Career Coach and Technical Recruiter. You generate comprehensive, structured placement preparation roadmaps.
    You MUST respond with a valid JSON object ONLY. Do not write markdown, code blocks, or conversational text.
    The JSON structure MUST follow this exact format:
    {
      "student_summary": "A 3-4 sentence professional summary of the candidate's strategy based on their profile.",
      "preparation_score": 72, 
      "confidence_score": 65,
      "motivation_quote": "A motivational quote selected to encourage the candidate.",
      "roadmap": [
        {"stage": "Stage name (e.g. Days 1-5)", "focus": "Core focus area", "tasks": ["Task 1", "Task 2"]}
      ],
      "coding_problems": [
        {"name": "Problem Name", "difficulty": "Easy/Medium/Hard", "topic": "Array/DP/etc", "why_solve": "Why this problem is important", "platform": "LeetCode/HackerRank/GeeksforGeeks"}
      ],
      "interview_questions": [
        {"question": "Technical question about the language or core subjects", "topic": "DSA/OOP/OS/DBMS/Networks/SQL", "expected_answer": "Key points expected in response", "common_mistakes": "What to avoid", "tips": "Expert answer tip"}
      ],
      "hr_questions": [
        {"question": "HR question", "expected_answer": "Structure of perfect response", "common_mistakes": "Avoid", "tips": "Tips"}
      ],
      "behavioral_questions": [
        {"question": "Behavioral question (STAR method)", "expected_answer": "Perfect answer structure", "common_mistakes": "Avoid", "tips": "Tips"}
      ],
      "system_design_questions": [
        {"question": "System design challenge (Only if candidate is Advanced, empty list otherwise)", "expected_answer": "Architecture design points", "common_mistakes": "Mistakes", "tips": "Tips"}
      ],
      "projects_to_build": [
        {"title": "Project Name", "description": "Brief project description tailored to target company.", "tech_stack": "Suggested Tech Stack"}
      ],
      "resume_suggestions": [
        "Suggestion 1", "Suggestion 2"
      ],
      "interview_tips": [
        "Tip 1", "Tip 2"
      ],
      "recommended_resources": [
        {"name": "Resource Name", "type": "Video/Book/Website", "url_or_info": "Resource location or link"}
      ],
      "one_week_plan": [
        {"day": "Day 1", "goal": "Daily study target", "tasks": ["Step 1", "Step 2"]}
      ]
    }
    """

    user_prompt = f"""
    Generate a personalized placement preparation guide for:
    Name: {name}
    College: {college}
    Programming Language Preferred: {language}
    Skill Level: {skill_level}
    Target Company: {target_company}
    Days Remaining for Interview: {days_left} days
    Strengths: {strengths}
    Weak Areas: {weaknesses}
    Resume Snippet (optional): {resume_text[:1000]}
    
    Ensure the questions match the preferred language ({language}) and target company ({target_company}).
    If the skill level is Advanced, include 2 System Design Questions.
    """

    # Call AI with Groq
    response_json = call_groq_api(system_prompt, user_prompt)

    # Fallback to local generator if API fails or API key is absent
    if not response_json:
        response_json = generate_mock_roadmap(name, college, language, skill_level, target_company, days_left, strengths, weaknesses)

    return jsonify(response_json)

@app.route("/api/analyze-resume", methods=["POST"])
def analyze_resume():
    """Analyzes a pasted resume and outputs specific guidelines and improvement plans."""
    req_data = request.json or {}
    resume_text = req_data.get("resume_text", "")
    target_company = req_data.get("target_company", "Generic")

    if not resume_text or len(resume_text.strip()) < 10:
        return jsonify({
            "success": False, 
            "error": "Resume content is too short. Please paste your full resume."
        })

    system_prompt = """
    You are an expert ATS (Applicant Tracking System) Specialist and Technical Resume Critic.
    Analyze the resume text and generate a structured JSON feedback report.
    Response must be a valid JSON object ONLY, in this exact format:
    {
      "ats_score": 75,
      "strengths": ["Strong action verbs", "Clear formatting"],
      "improvements": [
        {"section": "Education / Projects / Experience", "issue": "What is wrong", "suggestion": "How to fix it with an example"}
      ],
      "skills_to_add": ["Skill 1", "Skill 2"],
      "verdict": "Overall summary feedback in 2 sentences."
    }
    """
    
    user_prompt = f"""
    Analyze the following resume details for a candidate aiming to join {target_company}:
    Resume Content: {resume_text[:4000]}
    """

    response_json = call_groq_api(system_prompt, user_prompt)

    if not response_json:
        response_json = {
            "ats_score": random.randint(65, 82),
            "strengths": [
                "Good representation of Preferred Programming Language.",
                "Education credentials properly formatted.",
                "Clean structural hierarchy."
            ],
            "improvements": [
                {
                    "section": "Project Metrics",
                    "issue": "Lack of quantitative achievements.",
                    "suggestion": "Quantify outcomes (e.g., 'Optimized query execution time by 30% using Redis indexing')."
                },
                {
                    "section": "Technical Profile Summary",
                    "issue": "Vague objectives listed.",
                    "suggestion": "Replace objectives with a direct list of core technical skills matching target roles."
                }
            ],
            "skills_to_add": ["Docker", "Unit Testing (PyTest/JUnit)", "System Design"],
            "verdict": f"The resume is structured well but lacks metric-driven results. Aligning your projects closer to {target_company}'s domain will raise your score above 85%."
        }

    return jsonify({"success": True, "analysis": response_json})

@app.route("/api/company-prep", methods=["POST"])
def company_prep():
    """Generates company-specific pattern details, interview structure, and tips."""
    req_data = request.json or {}
    company = req_data.get("company", "Amazon")

    system_prompt = """
    You are an IT Placement Officer. Generate a company interview profile.
    Response must be a valid JSON object ONLY, in this exact format:
    {
      "pattern": "Description of online rounds, technical rounds, and HR rounds.",
      "difficulty": "Easy/Medium/Hard",
      "faq": [
        {"q": "Frequently Asked Question", "a": "Brief guide on how to answer."}
      ],
      "coding_difficulty": "Easy/Medium/Hard",
      "tips": ["Prep tip 1", "Prep tip 2"]
    }
    """
    
    user_prompt = f"Generate interview guide details for company: {company}"
    
    response_json = call_groq_api(system_prompt, user_prompt)

    if not response_json:
        # Static templates for common companies
        companies_db = {
            "tcs": {
                "pattern": "Round 1: NQT (Aptitude, Verbal, Coding). Round 2: Technical Interview. Round 3: MR & HR.",
                "difficulty": "Easy to Medium",
                "faq": [
                    {"q": "What is the difference between compiler and interpreter?", "a": "Explain source conversion timing and efficiency difference."},
                    {"q": "Explain static variables in OOP.", "a": "Explain that they are shared across instances and stored in class-level memory."}
                ],
                "coding_difficulty": "Easy",
                "tips": ["Strong command on basics of C/C++/Java/Python", "Prepare basic coding problems (palindromes, strings, arrays)", "Be ready to explain your final year project"]
            },
            "infosys": {
                "pattern": "Round 1: Online Assessment (Pseudo Code, Puzzle Solving, Verbal, DBMS). Round 2: Technical & HR.",
                "difficulty": "Easy to Medium",
                "faq": [
                    {"q": "What is normalization in DBMS?", "a": "Explain reduction of redundancy from 1NF to 3NF/BCNF."},
                    {"q": "Explain pointer referencing vs dereferencing.", "a": "Reference gets address; dereference gets value at address."}
                ],
                "coding_difficulty": "Easy to Medium",
                "tips": ["Focus heavily on Pseudo-code and logical puzzles for round 1", "Revise SQL queries (Joins and Subqueries)", "Prepare behavioral responses about team projects"]
            },
            "accenture": {
                "pattern": "Round 1: Cognitive and Technical Assessment (Pseudo Code, Networking, Cloud). Round 2: Communication Test. Round 3: HR Interview.",
                "difficulty": "Medium",
                "faq": [
                    {"q": "Explain cloud service models (IaaS, PaaS, SaaS).", "a": "Give clear real-world definitions (e.g. AWS EC2 vs Heroku vs Gmail)."},
                    {"q": "What is DNS?", "a": "It translates domain names to IP addresses."}
                ],
                "coding_difficulty": "Medium",
                "tips": ["Review basics of networking and cloud concepts", "Practice verbal communication and reading exercises", "Prepare STAR method stories for HR Round"]
            },
            "zoho": {
                "pattern": "Round 1: Written Test (Aptitude & Basic Programming). Round 2: Basic Programming Round. Round 3: Advanced Programming Round (Design/App Dev). Round 4: Technical & HR.",
                "difficulty": "Hard",
                "faq": [
                    {"q": "Implement an auto-complete feature algorithm.", "a": "Explain using Trie data structures for prefixes."},
                    {"q": "How to design a database schema for an invoice system?", "a": "Explain relational linking between Customers, Invoices, and Items."}
                ],
                "coding_difficulty": "Hard",
                "tips": ["Learn low-level system design and OOP concepts", "Be ready to code on paper or a whiteboard from scratch without IDE help", "Practice recursion and pointer manipulation"]
            },
            "amazon": {
                "pattern": "Round 1: Online Assessment (Coding + Work Style Simulation). Round 2: Technical Interview 1 (DSA). Round 3: Technical Interview 2 (System Design/DSA). Round 4: Bar Raiser (Leadership Principles).",
                "difficulty": "Hard",
                "faq": [
                    {"q": "How do you reverse a linked list in blocks of K size?", "a": "Use a recursive approach keeping track of next pointer nodes."},
                    {"q": "Explain Amazon Leadership Principle: Customer Obsession.", "a": "Share a time you compromised short-term gains to satisfy a customer / user."}
                ],
                "coding_difficulty": "Hard",
                "tips": ["Memorize and practice the 16 Amazon Leadership Principles", "Practice medium to hard LeetCode questions (Trees, Graphs, DP)", "Learn scalability and high-level architecture basics"]
            },
            "google": {
                "pattern": "Round 1: Coding Screen. Round 2: Coding Interview 1. Round 3: Coding Interview 2. Round 4: Coding Interview 3. Round 5: Googlyness & Leadership.",
                "difficulty": "Hard",
                "faq": [
                    {"q": "Find shortest path in weighted grid with blockages.", "a": "Discuss Dijkstra's algorithm and optimization using min-heaps."},
                    {"q": "How would you handle scale in Google Maps caching?", "a": "Use distributed caching, LRU policies, and geographic sharding."}
                ],
                "coding_difficulty": "Hard",
                "tips": ["Be highly comfortable with graph traversals, topological sort, and DP", "Always state time and space complexity first and optimize", "Think out loud during coding sessions"]
            }
        }
        
        comp_key = company.lower()
        if comp_key in companies_db:
            response_json = companies_db[comp_key]
        else:
            response_json = {
                "pattern": "Round 1: Coding Assessment. Round 2: Technical Interview (DSA/OOP). Round 3: HR / Managerial Assessment.",
                "difficulty": "Medium",
                "faq": [
                    {"q": f"Why do you want to join {company}?", "a": "Explain how their values and product ecosystem match your career objectives."},
                    {"q": "Explain the difference between SQL and NoSQL.", "a": "Tabular relational schema vs document/key-value horizontal scaling structures."}
                ],
                "coding_difficulty": "Medium",
                "tips": [f"Learn about {company}'s tech stack and flagship software.", "Solve LeetCode Medium problems.", "Explain projects clearly with database design details."]
            }
            
    return jsonify(response_json)

@app.route("/api/mock-interview", methods=["POST"])
def mock_interview():
    """Generates an interactive set of 10 tech, 10 HR, and 10 behavioral questions for practice."""
    req_data = request.json or {}
    language = req_data.get("language", "Python")
    company = req_data.get("target_company", "Generic")
    skill = req_data.get("skill_level", "Intermediate")

    system_prompt = """
    You are an AI Interviewer. Generate a list of questions for a mock interview simulation.
    Response must be a valid JSON object ONLY, in this exact format:
    {
      "technical": [
        {"question": "Technical question text", "expected_answer": "Points to mention", "common_mistakes": "Avoid these statements", "tips": "Tip for delivering"}
      ],
      "hr": [
        {"question": "HR question text", "expected_answer": "Points to mention", "common_mistakes": "Avoid these statements", "tips": "Tip for delivering"}
      ],
      "behavioral": [
        {"question": "Behavioral question text", "expected_answer": "STAR method points", "common_mistakes": "Avoid these statements", "tips": "Tip for delivering"}
      ]
    }
    Generate exactly 10 questions in each array (technical, hr, behavioral).
    """

    user_prompt = f"Generate mock interview questions for a {skill} level candidate preferred in {language} targeting {company}."
    
    response_json = call_groq_api(system_prompt, user_prompt)

    if not response_json:
        # Fallback Generator with Mock Interview Lists (reduced size to save bandwidth if requested, but prompt wants 10 so we give 10 robust ones)
        response_json = generate_mock_interview_list(language, company, skill)

    return jsonify(response_json)

@app.route("/api/daily-challenge", methods=["GET"])
def daily_challenge():
    """Generates a daily coding, aptitude, and interview question."""
    # We can seed it with the current date to keep it stable for 24 hours
    day_seed = datetime.now().strftime("%Y-%m-%d")
    random.seed(day_seed)
    
    coding_challenges = [
        {"name": "Reverse Linked List", "platform": "LeetCode", "difficulty": "Easy", "why": "Tests pointers and spatial understanding in linked list mutations.", "link": "https://leetcode.com/problems/reverse-linked-list/"},
        {"name": "Longest Substring Without Repeating Characters", "platform": "LeetCode", "difficulty": "Medium", "why": "Excellent for practicing sliding window arrays.", "link": "https://leetcode.com/problems/longest-substring-without-repeating-characters/"},
        {"name": "Merge K Sorted Lists", "platform": "LeetCode", "difficulty": "Hard", "why": "Tests priority queue and divide-and-conquer strategies.", "link": "https://leetcode.com/problems/merge-k-sorted-lists/"},
        {"name": "Subarray Sum Equals K", "platform": "LeetCode", "difficulty": "Medium", "why": "Tests hashmap prefix sums.", "link": "https://leetcode.com/problems/subarray-sum-equals-k/"}
    ]
    
    aptitude_challenges = [
        {"q": "A train covers a distance of 12 km in 10 minutes. If it takes 6 seconds to pass a telegraph post, what is the length of the train?", "options": ["100 m", "120 m", "150 m", "180 m"], "answer": "120 m", "explanation": "Speed = 12 km / (10/60) hr = 72 km/hr = 72 * 5/18 m/s = 20 m/s. Length of train = speed * time to pass post = 20 m/s * 6 s = 120 m."},
        {"q": "A and B can complete a work in 15 days and 10 days respectively. They started working together, but A left after 2 days. In how many days will the remaining work be finished?", "options": ["6 days", "6.6 days", "5 days", "7 days"], "answer": "6 days", "explanation": "Work rate: A = 1/15, B = 1/10. Together rate = 1/15 + 1/10 = 1/6. In 2 days work done = 2/6 = 1/3. Remaining work = 2/3. B takes (2/3) / (1/10) = 20/3 = 6.67 days total (6 days remaining)."}
    ]
    
    interview_challenges = [
        {"q": "What is the difference between abstract classes and interfaces?", "answer": "Abstract classes allow instance fields and concrete methods, whereas interfaces before Java 8 were strictly specifications (interfaces allow multiple inheritance but abstract classes do not)."},
        {"q": "What are transactions in DBMS? Explain ACID properties.", "answer": "A transaction is a single logical unit of database work. ACID stands for Atomicity (all or nothing), Consistency (preserves integrity), Isolation (concurrent executions do not interfere), and Durability (persistence after commit)."}
    ]

    selected_coding = random.choice(coding_challenges)
    selected_apt = random.choice(aptitude_challenges)
    selected_int = random.choice(interview_challenges)

    # reset random seed to dynamic values for future calls
    random.seed(None)

    return jsonify({
        "success": True,
        "date": day_seed,
        "coding": selected_coding,
        "aptitude": selected_apt,
        "interview": selected_int
    })

@app.route("/api/weakness-detector", methods=["POST"])
def weakness_detector():
    """Generates a structured revision and practice plan for student weak areas."""
    req_data = request.json or {}
    weakness = req_data.get("weaknesses", "")

    if not weakness:
        return jsonify({"success": False, "error": "Please provide your weak areas."})

    system_prompt = """
    You are an expert Interview Coach. Generate an improvement action plan for candidate weaknesses.
    Response must be a valid JSON object ONLY, in this exact format:
    {
      "analysis": "Briefly analyze why students find these concepts difficult.",
      "checklist": ["Action item 1", "Action item 2"],
      "learning_schedule": [
        {"day": "Day 1-2", "activity": "Conceptual study", "resource": "Suggested site/video"},
        {"day": "Day 3-4", "activity": "Practice simple problems", "resource": "Platform"},
        {"day": "Day 5-7", "activity": "Mock drills and complex problems", "resource": "Platform"}
      ],
      "pro_tip": "One key advice for tackling these topics under pressure."
    }
    """

    user_prompt = f"Analyze and make an improvement plan for the following weak topics: {weakness}"

    response_json = call_groq_api(system_prompt, user_prompt)

    if not response_json:
        response_json = {
            "analysis": f"Concepts around '{weakness}' are highly logical and require strong visualization. Candidates often fail to construct base cases or trace memory changes properly.",
            "checklist": [
                "Dry run code on paper to trace loops and pointer changes.",
                "Solve at least 5 classic questions related to the topic on LeetCode.",
                "Review time and space complexity models for this topic."
            ],
            "learning_schedule": [
                {"day": "Day 1", "activity": f"Watch conceptual walkthroughs explaining the fundamentals of {weakness}.", "resource": "GeeksforGeeks / YouTube"},
                {"day": "Day 2-3", "activity": "Implement 3 simple problems on paper first, then code them.", "resource": "HackerRank"},
                {"day": "Day 4-5", "activity": "Apply template patterns (e.g. recursion formulas, database indexing) to medium problems.", "resource": "LeetCode"}
            ],
            "pro_tip": "Don't try to memorize formulas. Map the state changes manually to visual blocks (diagrams, tables) to build intuitive understanding."
        }

    return jsonify({"success": True, "data": response_json})


# ========================================================
# ROBUST FALLBACK MOCK DATA GENERATORS
# ========================================================

def generate_mock_roadmap(name, college, language, skill_level, target_company, days_left, strengths, weaknesses):
    """Generates detailed, realistic preparation data when Groq API key is missing or offline."""
    
    # Dynamic scores based on inputs
    prep_score = random.randint(55, 78)
    conf_score = random.randint(60, 82)
    if skill_level.lower() == "beginner":
        prep_score -= 10
    elif skill_level.lower() == "advanced":
        prep_score += 12
        conf_score += 8
    
    prep_score = max(30, min(95, prep_score))
    conf_score = max(40, min(98, conf_score))

    quotes = [
        "Believe you can and you're halfway there. - Theodore Roosevelt",
        "Opportunities don't happen, you create them. - Chris Grosser",
        "Success is the sum of small efforts, repeated day in and day out. - Robert Collier",
        "The only way to do great work is to love what you do. - Steve Jobs"
    ]
    
    # Custom Roadmap Timeline based on days left
    roadmap = []
    if days_left <= 7:
        roadmap = [
            {"stage": "Days 1-2: Core Revisions", "focus": f"Review {language} syntax, time complexities, and database basics.", "tasks": ["Solve 3 Easy DSA problems daily", "Revise OOPS concepts", "Review Resume projects"]},
            {"stage": "Days 3-4: Company Patterns", "focus": f"Focus heavily on {target_company} past interview papers.", "tasks": ["Study SQL Joins and Query optimization", "Review frequently asked questions", "Draft HR responses using STAR method"]},
            {"stage": "Days 5-7: Mock Drills & Rest", "focus": "Time-based mock simulations and stress reduction.", "tasks": ["Take a timed coding test", "Conduct mock interview with a peer", "Review bookmark logs and rest"]}
        ]
    elif days_left <= 15:
        roadmap = [
            {"stage": "Days 1-4: DSA Mastery", "focus": f"Strengthen array, string, and hashmap concepts in {language}.", "tasks": ["Solve 5 LeetCode Easy-Medium problems", "Implement Stack & Queue from scratch", "Revise recursion basics"]},
            {"stage": "Days 5-9: Core Subjects & Weak Areas", "focus": f"Focus on CS Fundamentals and improving {weaknesses}.", "tasks": ["Study DBMS normalization & SQL queries", "Study OS thread concurrency and memory paging", "Practice 4 medium problems on {weaknesses}"]},
            {"stage": "Days 10-12: Company Prep & Projects", "focus": f"Tailor preparation to {target_company} profile.", "tasks": ["Practice {target_company} coding questions", "Review the architecture and deployment of resume projects", "Build a high-level design outline"]},
            {"stage": "Days 13-15: Mock Sessions", "focus": "Interviews and behavioral readiness.", "tasks": ["Practice 10 HR questions on camera", "Simulate coding rounds under time pressure", "Double check resume formatting"]}
        ]
    else:
        roadmap = [
            {"stage": "Days 1-10: Foundation & Language Depth", "focus": f"Deep dive into {language} features (garbage collection, memory model) and basic DSA.", "tasks": ["Complete 15 Easy DSA coding challenges", "Re-implement OOP pillars (inheritance, polymorphism, abstraction)", "Analyze core collection structures"]},
            {"stage": "Days 11-20: Advanced DSA & Core Subjects", "focus": f"Tackle medium complexity algorithms and study OS, DBMS, Networks.", "tasks": ["Focus on Trees, Graphs, and Dynamic Programming", "Practice SQL queries on LeetCode Database section", "Study HTTP protocols, TCP vs UDP, and routing models"]},
            {"stage": "Days 21-25: Weakness Focus & System Design", "focus": f"Address {weaknesses} and study system design patterns.", "tasks": ["Allocate 4 hours daily to solve {weaknesses} problems", "Understand vertical vs horizontal scaling", "Review load balancers and database replication"]},
            {"stage": "Days 26-30: Ultimate Review & Mock Run", "focus": "Mock interviews and final checks.", "tasks": ["Simulate 3 mock interviews (2 Tech, 1 HR)", "Run resume through an ATS scan", "Review formula cards and key cheat sheets"]}
        ]

    # Weekly detailed plans
    one_week_plan = []
    for day in range(1, min(8, days_left + 1)):
        one_week_plan.append({
            "day": f"Day {day}",
            "goal": f"Master {language} collections and solve {target_company} basic templates",
            "tasks": [
                f"Solve 2 questions regarding Arrays/Strings in {language}",
                "Read 3 OOP concept sheets",
                "Practice 1 Mock interview prompt"
            ]
        })

    # Recommended Resources
    resources = [
        {"name": "LeetCode Top Interview 150", "type": "Website", "url_or_info": "https://leetcode.com/studyplan/top-interview-150/"},
        {"name": "GeeksforGeeks Placement Preparation Course", "type": "Website", "url_or_info": "https://www.geeksforgeeks.org/placement-preparation-course/"},
        {"name": f"Core {language} Documentation & Design Guides", "type": "Documentation", "url_or_info": "Official Reference Docs"},
        {"name": "Grokking the System Design Interview", "type": "Book", "url_or_info": "System Design Reference Handbook"}
    ]

    # Coding Problems
    coding_problems = [
        {"name": "Two Sum", "difficulty": "Easy", "topic": "Arrays & Hashing", "why_solve": f"Extremely popular warm-up question for {target_company} interviews.", "platform": "LeetCode"},
        {"name": "Reverse String", "difficulty": "Easy", "topic": "Two Pointers", "why_solve": "Tests memory mutation and pointer logic in a basic loop structure.", "platform": "HackerRank"},
        {"name": "Longest Palindromic Substring", "difficulty": "Medium", "topic": "String / Dynamic Programming", "why_solve": "Pushes understanding of string expansion, palindromes, and DP arrays.", "platform": "LeetCode"},
        {"name": "Search in Rotated Sorted Array", "difficulty": "Medium", "topic": "Binary Search", "why_solve": "Standard modification of binary search frequently asked in advanced tech screening rounds.", "platform": "GeeksforGeeks"},
        {"name": "Edit Distance", "difficulty": "Hard", "topic": "Dynamic Programming", "why_solve": f"Tests optimization skills, string operations, and matrix transitions. (Crucial for high tiers like {target_company}).", "platform": "Codeforces"}
    ]

    # Interview Questions
    interview_questions = [
        {
            "question": f"Explain memory management in {language}.",
            "topic": "Language Core",
            "expected_answer": f"Highlight stack allocation for reference pointers and heap allocation for objects. Explain how garbage collection is triggered.",
            "common_mistakes": "Saying memory is unlimited or not mentioning garbage collection.",
            "tips": "Discuss reference counting or mark-and-sweep phases."
        },
        {
            "question": "What is the difference between TCP and UDP?",
            "topic": "Networking",
            "expected_answer": "TCP is connection-oriented, reliable, guarantees ordering, and has flow control. UDP is connectionless, fast, unreliable, and has no ordering guarantees.",
            "common_mistakes": "Saying UDP is never used. Correct this by giving real-world examples (TCP for Web, UDP for Video calls).",
            "tips": "Use a tabular comparison format during explanation."
        },
        {
            "question": "What are the difference between primary keys, unique keys, and foreign keys?",
            "topic": "DBMS",
            "expected_answer": "Primary Key uniquely identifies row, cannot be NULL (1 per table). Unique Key uniquely identifies rows but allows NULL (multiple allowed). Foreign Key links rows between tables to enforce referential integrity.",
            "common_mistakes": "Confusing unique key constraints with primary key attributes.",
            "tips": "Illustrate with a simple ER diagram mapping schema relationships."
        },
        {
            "question": "What is a deadlock and what are the 4 conditions to meet deadlocks?",
            "topic": "Operating Systems",
            "expected_answer": "Deadlock is a state where processes are blocked waiting for resources held by each other. Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.",
            "common_mistakes": "Forgetting the names of the conditions or failing to define circular wait.",
            "tips": "Mention Coffman conditions for deadlocks and prevention/avoidance methods (e.g. Banker's Algorithm)."
        }
    ]

    # HR & Behavioral Questions
    hr_questions = [
        {
            "question": "Tell me about yourself.",
            "expected_answer": "Use Present-Past-Future framework. Talk about current education/role, past achievements/projects, and future career alignment with the company.",
            "common_mistakes": "Reciting the entire resume line-by-line or listing family details.",
            "tips": "Keep it under 2 minutes and project confidence."
        },
        {
            "question": "Why should we hire you?",
            "expected_answer": "Align your skills directly with target job requirements. Show passion, mention a problem you solved, and state how you will add value immediately.",
            "common_mistakes": "Giving generic answers like 'I am hardworking and loyal'.",
            "tips": "Cite relevant domain achievements or certifications."
        }
    ]

    behavioral_questions = [
        {
            "question": "Tell me about a time you handled pressure and tight deadlines.",
            "expected_answer": "Explain the situation, task, actions (prioritizing, communicating, distributing workload), and positive result.",
            "common_mistakes": "Claiming you never feel stressed or stating you failed the deadline without context.",
            "tips": "Emphasize collaboration and time management tools."
        }
    ]

    # System Design (Only if Advanced)
    system_design_questions = []
    if skill_level.lower() == "advanced":
        system_design_questions = [
            {
                "question": "Design a Rate Limiter.",
                "expected_answer": "Discuss algorithms (Token Bucket, Leaky Bucket, Fixed Window, Sliding Window Log). Discuss distribution using Redis and handling race conditions.",
                "common_mistakes": "Not talking about scalability or failing to explain how tokens are refilled.",
                "tips": "Start with API signature requirements, then proceed to high-level architecture diagrams."
            },
            {
                "question": "Design a URL Shortener like Bitly.",
                "expected_answer": "Explain hashing (MD5/Base62), URL redirects, database read/write ratios, cache setups (Redis), and scale estimation for storage.",
                "common_mistakes": "Overlooking collision issues or omitting database scaling structures.",
                "tips": "Draw traffic estimations (QPS) before designing the storage schema."
            }
        ]

    # Projects
    projects = [
        {
            "title": "Smart Mock Interview Evaluator",
            "description": "An interactive web portal where candidates answer AI-generated technical questions, storing results locally to track performance metrics.",
            "tech_stack": f"HTML/CSS, Flask, {language}, JSON Data Store"
        },
        {
            "title": f"Distributed Task Scheduler in {language}",
            "description": f"Tailored for {target_company}'s tech demands, this utility queues tasks, handles thread execution models, and supports priorities.",
            "tech_stack": f"{language}, Threads, Socket Programming"
        }
    ]

    # ATS Resume Suggestions
    resume_suggestions = [
        "Include metrics and conversion figures in your projects section.",
        f"Format your preferred language ({language}) directly under a primary Technical Skills header.",
        "Remove old high school details and focus on college engineering projects.",
        "Add a link to your active GitHub and LinkedIn profiles."
    ]

    # Interview Tips
    interview_tips = [
        f"Research the latest products and press releases of {target_company} before entering the room.",
        "When asked coding questions, explain your approach first before putting down code.",
        "Have 2 meaningful questions prepared to ask the interviewer at the end of the session.",
        "Keep a notebook handy to trace algorithm inputs if necessary."
    ]

    return {
        "student_summary": f"Based on preferred coding language ({language}) and targeting {target_company}, the plan focuses on addressing weaknesses in '{weaknesses}' while leveraging strengths in '{strengths}'. With {days_left} days left, a structured plan is designed to maximize key coding templates, review core subjects (DBMS, OS), and practice company-specific mocks to boost performance.",
        "preparation_score": prep_score,
        "confidence_score": conf_score,
        "motivation_quote": random.choice(quotes),
        "roadmap": roadmap,
        "coding_problems": coding_problems,
        "interview_questions": interview_questions,
        "hr_questions": hr_questions,
        "behavioral_questions": behavioral_questions,
        "system_design_questions": system_design_questions,
        "projects_to_build": projects,
        "resume_suggestions": resume_suggestions,
        "interview_tips": interview_tips,
        "recommended_resources": resources,
        "one_week_plan": one_week_plan
    }

def generate_mock_interview_list(language, company, skill):
    """Generates 10 Technical, 10 HR, and 10 Behavioral questions with mock data."""
    technical = []
    hr = []
    behavioral = []
    
    # Let's populate 10 technical questions
    topics = ["OOP", "DSA", "OS", "DBMS", "Networks", "SQL", "Language Basics", "Web Architecture", "Complexity", "Security"]
    for i, topic in enumerate(topics):
        technical.append({
            "question": f"Question {i+1} ({topic}): Explain the concepts of {topic} and how they are handled in {language} for a {skill} engineer at {company}.",
            "expected_answer": f"Highlight core definitions of {topic}, structural examples, and reference points.",
            "common_mistakes": f"Giving vague descriptions of {topic} without code syntax samples.",
            "tips": "Illustrate concepts with simple logic examples."
        })
        
    # 10 HR questions
    hr_questions_pool = [
        "Tell me about yourself.",
        "Why do you want to join our company?",
        "What are your greatest strengths and weaknesses?",
        "Where do you see yourself in 5 years?",
        "Why should we hire you over other candidates?",
        "Describe your dream job environment.",
        "How do you handle conflict with teammates?",
        "What are your salary expectations?",
        "Are you willing to relocate or work in shifts?",
        "Do you have any questions for us?"
    ]
    for q in hr_questions_pool:
        hr.append({
            "question": q,
            "expected_answer": "Structure response clearly, aligning personal career growth with company goals.",
            "common_mistakes": "Being unprepared or giving generic or negative answers.",
            "tips": "Smile, maintain eye contact, and speak calmly."
        })
        
    # 10 Behavioral questions
    behavioral_questions_pool = [
        "Describe a time you had to work with a difficult team member.",
        "Give an example of a time you failed and what you learned from it.",
        "Tell me about a challenging project and how you managed it.",
        "Describe a situation where you had to quickly learn a new technology.",
        "Tell me about a time you went above and beyond for a project.",
        "How do you prioritize tasks when facing multiple tight deadlines?",
        "Tell me about a time you made a mistake and how you corrected it.",
        "Describe a time you had to convince others of your idea.",
        "Tell me about a time you worked under minimal supervision.",
        "Give an example of how you resolved a technical dispute in a group project."
    ]
    for q in behavioral_questions_pool:
        behavioral.append({
            "question": q,
            "expected_answer": "Apply the STAR method: Situation, Task, Action, and Result.",
            "common_mistakes": "Speaking negatively of peers or failing to detail the resulting impact.",
            "tips": "Focus on your individual contributions and lessons learned."
        })
        
    return {
        "technical": technical,
        "hr": hr,
        "behavioral": behavioral
    }

if __name__ == "__main__":
    # Check/Initialize data.json file if empty
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        initial_data = {
            "leaderboard": [
                {"rank": 1, "name": "Aarav Sharma", "college": "IIT Delhi", "score": 98, "streak": 32, "badges": ["DSA Master", "7-Day Streak"]},
                {"rank": 2, "name": "Ananya Iyer", "college": "BITS Pilani", "score": 95, "streak": 25, "badges": ["SQL Wizard", "Speed Coding"]},
                {"rank": 3, "name": "Rohan Gupta", "college": "DTU", "score": 92, "streak": 18, "badges": ["OS Guru", "14-Day Streak"]},
                {"rank": 4, "name": "Pooja Patel", "college": "VIT Vellore", "score": 89, "streak": 12, "badges": ["Networking Pro"]},
                {"rank": 5, "name": "Kabir Mehta", "college": "RVCE Bangalore", "score": 86, "streak": 8, "badges": ["Resume Star"]}
            ],
            "saved_profiles": [],
            "bookmarks": []
        }
        write_data(initial_data)
        
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
