/* ========================================================
   Placement Preparation Agent - Client JavaScript
   ======================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Theme
    initTheme();
    
    // Router / Page Checker
    const path = window.location.pathname;
    if (path === "/" || path === "/index.html") {
        initHomePage();
    } else if (path === "/dashboard" || path.includes("dashboard.html")) {
        initDashboardWizard();
    } else if (path === "/result" || path.includes("result.html")) {
        initResultDashboard();
    }
});

// ========================================================
// THEME MANAGEMENT (DARK / LIGHT MODE)
// ========================================================
function initTheme() {
    const themeToggle = document.getElementById("themeToggle");
    const currentTheme = localStorage.getItem("theme");

    if (currentTheme === "dark") {
        document.body.classList.add("dark-theme");
        if (themeToggle) themeToggle.checked = true;
    }

    if (themeToggle) {
        themeToggle.addEventListener("change", function () {
            if (this.checked) {
                document.body.classList.add("dark-theme");
                localStorage.setItem("theme", "dark");
                showToast("Dark Mode Enabled", "success");
            } else {
                document.body.classList.remove("dark-theme");
                localStorage.setItem("theme", "light");
                showToast("Light Mode Enabled", "success");
            }
        });
    }
}

// ========================================================
// TOAST NOTIFICATIONS
// ========================================================
function showToast(message, type = "success") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-custom ${type}`;
    
    let icon = "fa-check-circle";
    if (type === "error") icon = "fa-times-circle";
    if (type === "warning") icon = "fa-exclamation-triangle";
    
    toast.innerHTML = `
        <i class="fas ${icon}" style="font-size: 1.25rem;"></i>
        <div>
            <strong style="display:block; font-size:0.9rem;">${type.toUpperCase()}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted);">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Fade out after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = "toast-in 0.4s reverse forwards";
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}

// ========================================================
// HOME PAGE ACTIONS
// ========================================================
function initHomePage() {
    console.log("Home Page Initialized");
}

// ========================================================
// FORM WIZARD (DASHBOARD)
// ========================================================
function initDashboardWizard() {
    const steps = document.querySelectorAll(".form-step");
    const progress = document.querySelector(".wizard-progress-bar");
    const stepCircles = document.querySelectorAll(".wizard-step");
    let currentStep = 0;

    function updateWizard() {
        steps.forEach((step, idx) => {
            step.classList.toggle("active", idx === currentStep);
        });

        stepCircles.forEach((circle, idx) => {
            circle.classList.toggle("active", idx === currentStep);
            circle.classList.toggle("completed", idx < currentStep);
        });

        if (progress) {
            const width = ((currentStep) / (steps.length - 1)) * 100;
            progress.style.width = `${width}%`;
        }
    }

    // Navigation buttons
    document.querySelectorAll(".btn-next").forEach(btn => {
        btn.addEventListener("click", () => {
            if (validateStep(currentStep)) {
                currentStep++;
                updateWizard();
            }
        });
    });

    document.querySelectorAll(".btn-prev").forEach(btn => {
        btn.addEventListener("click", () => {
            currentStep--;
            updateWizard();
        });
    });

    // Form Submission
    const form = document.getElementById("profileForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!validateStep(currentStep)) return;

            // Gather inputs
            const profile = {
                name: document.getElementById("studentName").value.trim(),
                college: document.getElementById("collegeName").value.trim(),
                language: document.getElementById("progLanguage").value,
                skill_level: document.querySelector('input[name="skillLevel"]:checked').value,
                target_company: document.getElementById("targetCompany").value,
                days_left: document.getElementById("daysRemaining").value,
                strengths: document.getElementById("strengths").value.trim(),
                weaknesses: document.getElementById("weaknesses").value.trim(),
                resume_text: document.getElementById("resumePaste").value.trim(),
                streak: 1, // Start streak
                badges: ["Placement Explorer"],
                bookmarks: []
            };

            // Loading state overlay
            showLoader(true);

            try {
                const response = await fetch("/api/generate-roadmap", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(profile)
                });

                if (!response.ok) throw new Error("API call failed");

                const resultData = await response.json();
                
                // Add details back to local profiles
                profile.roadmapData = resultData;
                profile.preparation_score = resultData.preparation_score;
                profile.confidence_score = resultData.confidence_score;
                
                // Save to local storage
                localStorage.setItem("current_student", JSON.stringify(profile));

                // Save to database data.json
                await fetch("/api/save-profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(profile)
                });

                showLoader(false);
                showToast("Roadmap Generated Successfully!", "success");
                
                // Redirect to result page
                window.location.href = `/result?name=${encodeURIComponent(profile.name)}`;
            } catch (err) {
                console.error(err);
                showLoader(false);
                showToast("Error communicating with AI server. Try again.", "error");
            }
        });
    }

    function validateStep(stepIdx) {
        if (stepIdx === 0) {
            const name = document.getElementById("studentName").value.trim();
            const college = document.getElementById("collegeName").value.trim();
            if (!name || !college) {
                showToast("Please fill in both Name and College.", "warning");
                return false;
            }
        } else if (stepIdx === 1) {
            const target = document.getElementById("targetCompany").value;
            const days = document.getElementById("daysRemaining").value;
            if (!target || !days || days <= 0) {
                showToast("Please enter target company and positive days remaining.", "warning");
                return false;
            }
        }
        return true;
    }
}

// Loader overlay helper
function showLoader(show) {
    const overlay = document.getElementById("loaderOverlay");
    if (!overlay) return;

    if (show) {
        overlay.style.display = "flex";
        // Rotate random coaching tips during loading
        const tips = [
            "Llama 3 is analyzing your target company parameters...",
            "Customizing practice problems from Leetcode & HackerRank...",
            "Developing revision schedules for OS & DBMS core elements...",
            "Synthesizing structured templates for HR STAR scenarios...",
            "Assembling your confidence and preparation score indicators..."
        ];
        const tipEl = overlay.querySelector(".loader-tip");
        let idx = 0;
        const interval = setInterval(() => {
            if (overlay.style.display === "none") {
                clearInterval(interval);
                return;
            }
            if (tipEl) tipEl.textContent = tips[idx % tips.length];
            idx++;
        }, 2000);
    } else {
        overlay.style.display = "none";
    }
}

// ========================================================
// INTERACTIVE RECOMMENDATION PORTAL (RESULT)
// ========================================================
let currentStudentData = null;

async function initResultDashboard() {
    // 1. Get query parameters
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get("name");

    // 2. Fetch local storage cached profile
    let localData = localStorage.getItem("current_student");
    if (localData) {
        currentStudentData = JSON.parse(localData);
    }

    // 3. Fallback: Fetch from database if local cache doesn't match URL or doesn't exist
    if (!currentStudentData || currentStudentData.name.toLowerCase() !== urlName.toLowerCase()) {
        try {
            const resp = await fetch(`/api/get-profile?name=${encodeURIComponent(urlName)}`);
            if (resp.ok) {
                const dbData = await resp.json();
                if (dbData.success) {
                    currentStudentData = dbData.profile;
                    localStorage.setItem("current_student", JSON.stringify(currentStudentData));
                }
            }
        } catch (e) {
            console.error("Failed to load profile from database:", e);
        }
    }

    if (!currentStudentData) {
        showToast("Profile not found. Redirecting to wizard.", "error");
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
        return;
    }

    // 4. Render user metrics
    renderDashboardCore();

    // 5. Sidebar Navigation mechanics
    setupSidebarNavigation();

    // 6. Init modules
    renderRoadmapTab();
    initResumeTab();
    initCompanyPrepTab();
    initMockInterviewTab();
    initDailyChallengeTab();
    initWeaknessTab();
    renderLeaderboard();
    setupExtraActionButtons();
}

// Render student stats on main headers
function renderDashboardCore() {
    document.getElementById("studentNameHeader").textContent = currentStudentData.name;
    document.getElementById("collegeText").textContent = currentStudentData.college;
    document.getElementById("companyText").textContent = currentStudentData.target_company;
    document.getElementById("languageText").textContent = currentStudentData.language;
    document.getElementById("levelText").textContent = currentStudentData.skill_level;
    document.getElementById("badgeCount").textContent = currentStudentData.badges ? currentStudentData.badges.length : 1;
    document.getElementById("streakVal").textContent = currentStudentData.streak || 1;

    // Progress ring renders
    const prepScore = currentStudentData.preparation_score || 60;
    const confScore = currentStudentData.confidence_score || 55;
    
    setCirclePercentage("prepCircle", prepScore);
    document.getElementById("prepTextVal").textContent = `${prepScore}%`;
    
    // Confidence score horizontal bar
    const bar = document.getElementById("confidenceBar");
    if (bar) {
        bar.style.width = `${confScore}%`;
        bar.textContent = `${confScore}%`;
    }

    // Interview date countdown timer
    setupCountdown(currentStudentData.days_left);

    // Achievements Badges
    const badgeGrid = document.getElementById("achievementsGrid");
    if (badgeGrid && currentStudentData.badges) {
        badgeGrid.innerHTML = currentStudentData.badges.map(b => `
            <div class="col-4 col-sm-3 col-md-2">
                <div class="achievement-badge-card">
                    <span class="achievement-badge-icon">🏆</span>
                    <strong style="font-size:0.75rem; display:block; margin-top:5px; color:var(--text-main);">${b}</strong>
                </div>
            </div>
        `).join('');
    }
}

// Helper to set SVG circle dash
function setCirclePercentage(id, percent) {
    const circle = document.getElementById(id);
    if (!circle) return;
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Countdown timer calculator
function setupCountdown(days) {
    const countdownEl = document.getElementById("countdownTimer");
    if (!countdownEl) return;

    let totalSeconds = parseInt(days) * 24 * 60 * 60;

    const interval = setInterval(() => {
        if (totalSeconds <= 0) {
            clearInterval(interval);
            countdownEl.textContent = "Interview Day!";
            return;
        }
        totalSeconds--;
        const d = Math.floor(totalSeconds / (3600*24));
        const h = Math.floor((totalSeconds % (3600*24)) / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        countdownEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
    }, 1000);
}

// Sidebar logic
function setupSidebarNavigation() {
    const links = document.querySelectorAll(".nav-item-link");
    const sections = document.querySelectorAll(".tab-section");

    links.forEach(link => {
        link.addEventListener("click", function() {
            const target = this.getAttribute("data-tab");
            
            // Remove active classes
            links.forEach(l => l.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            // Add active status
            this.classList.add("active");
            const targetSec = document.getElementById(target);
            if (targetSec) targetSec.classList.add("active");

            // Toggle mobile sidebar closing
            const sidebar = document.querySelector(".sidebar");
            if (sidebar) sidebar.classList.remove("active");
        });
    });

    // Mobile sidebar toggle button
    const toggleBtn = document.getElementById("mobileSidebarToggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const sidebar = document.querySelector(".sidebar");
            if (sidebar) sidebar.classList.toggle("active");
        });
    }
}

// ========================================================
// TAB 1: AI ROADMAP & CODING RECOMMENDATIONS
// ========================================================
function renderRoadmapTab() {
    const rd = currentStudentData.roadmapData;
    if (!rd) return;

    // Quote
    const quoteEl = document.getElementById("motivationQuote");
    if (quoteEl) quoteEl.textContent = `"${rd.motivation_quote || 'Strive for progress, not perfection.'}"`;

    // Summary
    const sumEl = document.getElementById("roadmapSummary");
    if (sumEl) sumEl.textContent = rd.student_summary;

    // Timeline Roadmap list
    const timelineContainer = document.getElementById("timelineContainer");
    if (timelineContainer && rd.roadmap) {
        timelineContainer.innerHTML = rd.roadmap.map((stage, idx) => `
            <div class="roadmap-timeline-item">
                <h5 class="mb-1 text-primary">${stage.stage}</h5>
                <p class="mb-2 fw-semibold text-main">${stage.focus}</p>
                <ul class="ps-3 text-muted" style="font-size:0.9rem;">
                    ${stage.tasks.map(t => `<li class="mb-1">${t}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }

    // Coding problems (Table)
    const codingBody = document.getElementById("codingProblemsBody");
    if (codingBody && rd.coding_problems) {
        codingBody.innerHTML = rd.coding_problems.map((prob, idx) => {
            const diffClass = `badge-${prob.difficulty.toLowerCase()}`;
            return `
                <tr>
                    <td class="fw-semibold">${prob.name}</td>
                    <td><span class="item-badge ${diffClass}">${prob.difficulty}</span></td>
                    <td>${prob.topic}</td>
                    <td style="font-size:0.85rem;" class="text-muted">${prob.why_solve}</td>
                    <td><span class="badge bg-secondary">${prob.platform}</span></td>
                    <td>
                        <button class="bookmark-btn ${isBookmarked(prob.name) ? 'active' : ''}" 
                                onclick="toggleBookmarkQuestion('${escapeHTML(prob.name)}', '${escapeHTML(prob.topic)}')">
                            <i class="fas fa-bookmark"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Interview Questions Accordion
    renderQuestionsAccordion("techQuestionsAccordion", rd.interview_questions, "Tech");
    renderQuestionsAccordion("hrQuestionsAccordion", rd.hr_questions, "HR");
    renderQuestionsAccordion("behavioralQuestionsAccordion", rd.behavioral_questions, "Behavioral");
    
    // System Design (if exists)
    const sysDesignSection = document.getElementById("sysDesignSection");
    if (sysDesignSection) {
        if (rd.system_design_questions && rd.system_design_questions.length > 0) {
            sysDesignSection.style.display = "block";
            renderQuestionsAccordion("sysDesignAccordion", rd.system_design_questions, "SysDesign");
        } else {
            sysDesignSection.style.display = "none";
        }
    }

    // Recommended Projects
    const projectsList = document.getElementById("projectsList");
    if (projectsList && rd.projects_to_build) {
        projectsList.innerHTML = rd.projects_to_build.map(proj => `
            <div class="col-md-6 mb-3">
                <div class="card p-3 border-color" style="background-color: var(--bg-primary); border-radius: var(--border-radius-md);">
                    <h6 class="text-primary mb-2">${proj.title}</h6>
                    <p class="small text-muted mb-2">${proj.description}</p>
                    <span class="badge bg-primary-light text-primary align-self-start" style="font-size:0.75rem;">${proj.tech_stack}</span>
                </div>
            </div>
        `).join('');
    }

    // Resources & Study Tips
    const resourcesList = document.getElementById("resourcesList");
    if (resourcesList && rd.recommended_resources) {
        resourcesList.innerHTML = rd.recommended_resources.map(res => `
            <li class="mb-2">
                <strong>[${res.type}]</strong> 
                <a href="${res.url_or_info.startsWith('http') ? res.url_or_info : '#'}" target="_blank">${res.name}</a>
                <span class="text-muted d-block small">${res.url_or_info}</span>
            </li>
        `).join('');
    }

    // Daily Schedule
    const oneWeekContainer = document.getElementById("oneWeekPlanContainer");
    if (oneWeekContainer && rd.one_week_plan) {
        oneWeekContainer.innerHTML = rd.one_week_plan.map(d => `
            <div class="card p-3 mb-2 border-color" style="background-color: var(--bg-card); border-radius: var(--border-radius-md);">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong class="text-primary">${d.day}</strong>
                    <span class="small text-muted fw-semibold">${d.goal}</span>
                </div>
                <ul class="small text-muted ps-3 mb-0">
                    ${d.tasks.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }
}

// Bookmark storage check
function isBookmarked(name) {
    if (!currentStudentData.bookmarks) return false;
    return currentStudentData.bookmarks.some(b => b.name === name);
}

// Interactive QA Accordion rendering helper
function renderQuestionsAccordion(containerId, questions, prefix) {
    const container = document.getElementById(containerId);
    if (!container || !questions) return;

    container.innerHTML = questions.map((qa, idx) => {
        const uniqueId = `${prefix}_qa_${idx}`;
        return `
            <div class="qa-card">
                <div class="qa-header" onclick="toggleQA('${uniqueId}')">
                    <span>${qa.question}</span>
                    <i class="fas fa-chevron-down text-muted" id="icon_${uniqueId}"></i>
                </div>
                <div class="qa-body" id="body_${uniqueId}">
                    ${qa.topic ? `<div class="qa-meta">Topic: ${qa.topic}</div>` : ''}
                    <div class="mb-3">
                        <strong class="text-success d-block mb-1"><i class="fas fa-check-circle"></i> Expected Key Points:</strong>
                        <p class="small text-main mb-0">${qa.expected_answer}</p>
                    </div>
                    <div class="mb-3">
                        <strong class="text-danger d-block mb-1"><i class="fas fa-times-circle"></i> Common Mistakes to Avoid:</strong>
                        <p class="small text-muted mb-0">${qa.common_mistakes}</p>
                    </div>
                    <div>
                        <strong class="text-primary d-block mb-1"><i class="fas fa-lightbulb"></i> Expert Delivery Tip:</strong>
                        <p class="small text-muted mb-0">${qa.tips}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Accordion Toggle
window.toggleQA = function(id) {
    const body = document.getElementById(`body_${id}`);
    const icon = document.getElementById(`icon_${id}`);
    if (!body) return;

    if (body.style.display === "block") {
        body.style.display = "none";
        if (icon) icon.className = "fas fa-chevron-down text-muted";
    } else {
        body.style.display = "block";
        if (icon) icon.className = "fas fa-chevron-up text-primary";
    }
};

// Toggle bookmark questions
window.toggleBookmarkQuestion = async function(name, topic) {
    if (!currentStudentData.bookmarks) currentStudentData.bookmarks = [];
    
    const idx = currentStudentData.bookmarks.findIndex(b => b.name === name);
    if (idx > -1) {
        currentStudentData.bookmarks.splice(idx, 1);
        showToast("Bookmark Removed", "warning");
    } else {
        currentStudentData.bookmarks.push({ name, topic, date: new Date().toLocaleDateString() });
        showToast("Question Bookmarked", "success");
    }

    // Save state
    localStorage.setItem("current_student", JSON.stringify(currentStudentData));
    await fetch("/api/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentStudentData)
    });

    // Re-render
    renderRoadmapTab();
    renderBookmarksPanel();
};

// Render Bookmarks panel
function renderBookmarksPanel() {
    const list = document.getElementById("bookmarksList");
    if (!list) return;

    const bms = currentStudentData.bookmarks || [];
    if (bms.length === 0) {
        list.innerHTML = `<p class="small text-muted">No bookmarked questions yet.</p>`;
        return;
    }

    list.innerHTML = bms.map(b => `
        <div class="d-flex justify-content-between align-items-center p-2 mb-2 bg-primary-light rounded border-color">
            <div>
                <strong class="small text-main" style="display:block;">${b.name}</strong>
                <span class="badge bg-secondary" style="font-size:0.65rem;">${b.topic}</span>
            </div>
            <button class="btn btn-sm text-danger" onclick="toggleBookmarkQuestion('${escapeHTML(b.name)}', '${escapeHTML(b.topic)}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// ========================================================
// TAB 2: RESUME ANALYZER
// ========================================================
function initResumeTab() {
    const form = document.getElementById("resumeAnalysisForm");
    const resultBox = document.getElementById("resumeAnalysisResult");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = document.getElementById("resumeTextPaste").value.trim();
            if (!text || text.length < 10) {
                showToast("Please paste a valid resume string", "warning");
                return;
            }

            showLoader(true);
            try {
                const resp = await fetch("/api/analyze-resume", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        resume_text: text,
                        target_company: currentStudentData.target_company
                    })
                });
                const result = await resp.json();
                showLoader(false);

                if (result.success && resultBox) {
                    const an = result.analysis;
                    resultBox.style.display = "block";
                    
                    document.getElementById("atsScoreVal").textContent = `${an.ats_score}%`;
                    document.getElementById("atsScoreBar").style.width = `${an.ats_score}%`;
                    document.getElementById("atsVerdictText").textContent = an.verdict;
                    
                    document.getElementById("atsStrengthsList").innerHTML = an.strengths.map(s => `
                        <li><i class="fas fa-check text-success me-2"></i> ${s}</li>
                    `).join('');
                    
                    document.getElementById("atsImprovementsList").innerHTML = an.improvements.map(i => `
                        <li class="mb-2">
                            <strong class="text-danger d-block">${i.section}:</strong>
                            <p class="small text-muted mb-1">${i.issue}</p>
                            <span class="badge bg-success-light text-success">${i.suggestion}</span>
                        </li>
                    `).join('');
                    
                    document.getElementById("atsSkillsList").innerHTML = an.skills_to_add.map(s => `
                        <span class="badge bg-primary text-white me-2 mb-2">${s}</span>
                    `).join('');

                    showToast("Resume scan complete!", "success");

                    // Award Achievement badge if score >= 80
                    if (an.ats_score >= 80) {
                        awardBadge("Resume Critic Master");
                    }
                }
            } catch (err) {
                showLoader(false);
                showToast("ATS Analysis failed.", "error");
            }
        });
    }
}

// ========================================================
// TAB 3: COMPANY PREPARATION SPECIFICS
// ========================================================
function initCompanyPrepTab() {
    const btns = document.querySelectorAll(".company-select-btn");
    btns.forEach(btn => {
        btn.addEventListener("click", function() {
            // Remove active classes from other buttons
            btns.forEach(b => b.classList.remove("active", "btn-primary"));
            btns.forEach(b => b.classList.add("btn-outline-primary"));

            this.classList.add("active", "btn-primary");
            this.classList.remove("btn-outline-primary");

            const company = this.getAttribute("data-company");
            fetchCompanyProfile(company);
        });
    });

    // Fetch initial profile
    const activeBtn = document.querySelector(".company-select-btn.active");
    if (activeBtn) {
        fetchCompanyProfile(activeBtn.getAttribute("data-company"));
    }
}

async function fetchCompanyProfile(company) {
    const container = document.getElementById("companyPrepDetails");
    if (!container) return;

    container.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Retrieving profile rules for ${company}...</p>
        </div>
    `;

    try {
        const resp = await fetch("/api/company-prep", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company })
        });
        const details = await resp.json();

        const diffClass = `badge-${details.coding_difficulty.toLowerCase().split(' ')[0]}`;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-4">
                    <h5 class="text-primary mb-3">Interview Pattern</h5>
                    <p class="small text-main bg-primary-light p-3 rounded" style="line-height:1.7;">
                        ${details.pattern}
                    </p>
                    <div class="d-flex gap-4 mt-3">
                        <div>
                            <span class="small text-muted d-block">Overall Difficulty</span>
                            <span class="fw-bold">${details.difficulty}</span>
                        </div>
                        <div>
                            <span class="small text-muted d-block">Coding Difficulty</span>
                            <span class="item-badge ${diffClass}">${details.coding_difficulty}</span>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 mb-4">
                    <h5 class="text-primary mb-3">Preparation Rules & Tips</h5>
                    <ul class="small text-muted ps-3">
                        ${details.tips.map(t => `<li class="mb-2">${t}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="mt-2">
                <h5 class="text-primary mb-3">Frequently Asked Questions</h5>
                ${details.faq.map((fq, idx) => `
                    <div class="card p-3 mb-2 border-color" style="background-color: var(--bg-card); border-radius: var(--border-radius-md);">
                        <strong class="text-main small d-block mb-1">Q: ${fq.q}</strong>
                        <p class="small text-muted mb-0">A: ${fq.a}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="text-danger">Failed to fetch company details.</p>`;
    }
}

// ========================================================
// TAB 4: MOCK INTERVIEW INTERACTIVES
// ========================================================
let activeMockData = null;
let currentMockCategory = 'technical';
let currentMockIdx = 0;

function initMockInterviewTab() {
    const launchBtn = document.getElementById("startMockBtn");
    const setupBox = document.getElementById("mockSetupPanel");
    const playBox = document.getElementById("mockPlayPanel");

    if (launchBtn) {
        launchBtn.addEventListener("click", async () => {
            showLoader(true);
            try {
                const resp = await fetch("/api/mock-interview", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language: currentStudentData.language,
                        target_company: currentStudentData.target_company,
                        skill_level: currentStudentData.skill_level
                    })
                });
                activeMockData = await resp.json();
                showLoader(false);

                if (activeMockData) {
                    setupBox.style.display = "none";
                    playBox.style.display = "block";
                    currentMockCategory = 'technical';
                    currentMockIdx = 0;
                    renderMockQuestion();
                    
                    awardBadge("Mock Commenced");
                }
            } catch (err) {
                showLoader(false);
                showToast("Could not generate mock questions.", "error");
            }
        });
    }

    // Category switch buttons
    const catBtns = document.querySelectorAll(".mock-cat-btn");
    catBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            catBtns.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            currentMockCategory = this.getAttribute("data-cat");
            currentMockIdx = 0;
            renderMockQuestion();
        });
    });

    // Next / Prev mock question triggers
    document.getElementById("mockNextBtn").addEventListener("click", () => {
        const pool = activeMockData[currentMockCategory];
        if (currentMockIdx < pool.length - 1) {
            currentMockIdx++;
            renderMockQuestion();
        } else {
            showToast("You've completed this section. Switch categories or submit feedback!", "warning");
        }
    });

    document.getElementById("mockPrevBtn").addEventListener("click", () => {
        if (currentMockIdx > 0) {
            currentMockIdx--;
            renderMockQuestion();
        }
    });

    // Interactive Expected answers toggle
    document.getElementById("showAnswerBtn").addEventListener("click", () => {
        const container = document.getElementById("mockAnswerDetails");
        if (container.style.display === "block") {
            container.style.display = "none";
        } else {
            container.style.display = "block";
        }
    });
}

function renderMockQuestion() {
    if (!activeMockData) return;
    const pool = activeMockData[currentMockCategory];
    const qObj = pool[currentMockIdx];

    document.getElementById("mockIndexTracker").textContent = `Question ${currentMockIdx + 1} of ${pool.length}`;
    document.getElementById("mockQuestionText").textContent = qObj.question;
    
    // Hide details by default
    document.getElementById("mockAnswerDetails").style.display = "none";
    document.getElementById("mockExpectText").textContent = qObj.expected_answer;
    document.getElementById("mockMistakeText").textContent = qObj.common_mistakes;
    document.getElementById("mockTipText").textContent = qObj.tips;
}

// ========================================================
// TAB 5: DAILY CHALLENGE GENERATOR
// ========================================================
async function initDailyChallengeTab() {
    const list = document.getElementById("dailyChallengeContainer");
    if (!list) return;

    try {
        const resp = await fetch("/api/daily-challenge");
        const data = await resp.json();

        if (data.success) {
            list.innerHTML = `
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <div class="card p-3 border-color text-center h-100" style="background-color:var(--bg-card); border-radius:var(--border-radius-md);">
                            <span style="font-size:2rem;">💻</span>
                            <h5 class="text-primary mt-2">Coding Problem</h5>
                            <strong class="d-block text-main mb-1">${data.coding.name}</strong>
                            <span class="badge bg-secondary mb-2">${data.coding.difficulty} | ${data.coding.platform}</span>
                            <p class="small text-muted mb-3">${data.coding.why}</p>
                            <a href="${data.coding.link}" target="_blank" class="btn btn-sm btn-primary-custom w-100 mt-auto">Solve on Web</a>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-3">
                        <div class="card p-3 border-color text-center h-100" style="background-color:var(--bg-card); border-radius:var(--border-radius-md);">
                            <span style="font-size:2rem;">🧮</span>
                            <h5 class="text-primary mt-2">Aptitude Challenge</h5>
                            <p class="small text-main mb-3 text-start">${data.aptitude.q}</p>
                            <div class="text-start mb-3">
                                ${data.aptitude.options.map(opt => `
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="aptOpt" id="opt_${opt}" value="${opt}">
                                        <label class="form-check-label small text-muted" for="opt_${opt}">${opt}</label>
                                    </div>
                                `).join('')}
                            </div>
                            <button onclick="checkAptitudeAnswer('${escapeHTML(data.aptitude.answer)}', '${escapeHTML(data.aptitude.explanation)}')" class="btn btn-sm btn-secondary-custom w-100 mt-auto">Submit Answer</button>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-3">
                        <div class="card p-3 border-color text-center h-100" style="background-color:var(--bg-card); border-radius:var(--border-radius-md);">
                            <span style="font-size:2rem;">💬</span>
                            <h5 class="text-primary mt-2">Interview Query</h5>
                            <strong class="d-block text-main mb-2 text-start">${data.interview.q}</strong>
                            <button id="showDailyAnsBtn" class="btn btn-sm btn-outline-primary w-100 mt-auto">Toggle Explanation</button>
                            <p class="small text-success text-start mt-3" id="dailyAnsText" style="display:none; line-height:1.6;">
                                <strong>Expected Answer:</strong><br>${data.interview.answer}
                            </p>
                        </div>
                    </div>
                </div>
            `;

            // Toggle daily answer event listener
            document.getElementById("showDailyAnsBtn").addEventListener("click", function() {
                const el = document.getElementById("dailyAnsText");
                el.style.display = el.style.display === "none" ? "block" : "none";
            });
        }
    } catch (e) {
        list.innerHTML = `<p class="text-danger">Failed to retrieve daily challenge items.</p>`;
    }
}

window.checkAptitudeAnswer = function(answer, explanation) {
    const selected = document.querySelector('input[name="aptOpt"]:checked');
    if (!selected) {
        showToast("Please select an option first.", "warning");
        return;
    }

    if (selected.value === answer) {
        showToast("Correct! Bravo.", "success");
        // Award Streak increase
        currentStudentData.streak = (currentStudentData.streak || 1) + 1;
        document.getElementById("streakVal").textContent = currentStudentData.streak;
        localStorage.setItem("current_student", JSON.stringify(currentStudentData));
        
        // Custom pop-up details
        alert(`Correct!\n\nExplanation: ${explanation}`);
    } else {
        showToast("Incorrect Answer. Try again!", "error");
        alert(`Incorrect!\n\nExplanation: ${explanation}`);
    }
};

// ========================================================
// TAB 6: WEAKNESS DETECTOR
// ========================================================
function initWeaknessTab() {
    const form = document.getElementById("weaknessForm");
    const resultBox = document.getElementById("weaknessResult");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = document.getElementById("weaknessTopicInput").value.trim();
            if (!text) {
                showToast("Please enter topics to inspect", "warning");
                return;
            }

            showLoader(true);
            try {
                const resp = await fetch("/api/weakness-detector", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ weaknesses: text })
                });
                const result = await resp.json();
                showLoader(false);

                if (result.success && resultBox) {
                    const dt = result.data;
                    resultBox.style.display = "block";
                    
                    document.getElementById("weaknessOverview").textContent = dt.analysis;
                    document.getElementById("weaknessProTip").textContent = dt.pro_tip;
                    
                    document.getElementById("weaknessChecklist").innerHTML = dt.checklist.map(c => `
                        <li><i class="fas fa-check-circle text-success me-2"></i> ${c}</li>
                    `).join('');
                    
                    document.getElementById("weaknessTimeline").innerHTML = dt.learning_schedule.map(sch => `
                        <div class="mb-3">
                            <strong class="text-primary">${sch.day} (${sch.activity})</strong>
                            <p class="small text-muted mb-0">Resource: ${sch.resource}</p>
                        </div>
                    `).join('');

                    showToast("Tailored Action Plan Generated", "success");
                }
            } catch (err) {
                showLoader(false);
                showToast("Error processing request.", "error");
            }
        });
    }
}

// ========================================================
// TAB 7: LEADERBOARD UI
// ========================================================
async function renderLeaderboard() {
    const body = document.getElementById("leaderboardBody");
    if (!body) return;

    try {
        const resp = await fetch("/api/leaderboard");
        const list = await resp.json();

        // Include current student in leaderboard if score is set
        const exists = list.some(std => std.name.toLowerCase() === currentStudentData.name.toLowerCase());
        if (!exists) {
            list.push({
                rank: 6,
                name: currentStudentData.name,
                college: currentStudentData.college,
                score: currentStudentData.preparation_score || 60,
                streak: currentStudentData.streak || 1,
                badges: currentStudentData.badges || ["Explorer"]
            });
        }

        // Sort descending by score
        list.sort((a,b) => b.score - a.score);

        body.innerHTML = list.map((item, idx) => {
            const isMe = item.name.toLowerCase() === currentStudentData.name.toLowerCase();
            return `
                <tr style="${isMe ? 'background-color: rgba(37,99,235,0.08); font-weight:600;' : ''}">
                    <td><strong>#${idx + 1}</strong></td>
                    <td>${item.name} ${isMe ? '<span class="badge bg-primary">You</span>' : ''}</td>
                    <td>${item.college}</td>
                    <td><strong class="text-primary">${item.score} pts</strong></td>
                    <td>🔥 ${item.streak} days</td>
                    <td>
                        ${item.badges ? item.badges.slice(0, 2).map(b => `<span class="badge bg-secondary me-1" style="font-size:0.65rem;">${b}</span>`).join('') : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

// Helper to award badges dynamically
async function awardBadge(badgeName) {
    if (!currentStudentData.badges) currentStudentData.badges = [];
    if (!currentStudentData.badges.includes(badgeName)) {
        currentStudentData.badges.push(badgeName);
        localStorage.setItem("current_student", JSON.stringify(currentStudentData));
        
        await fetch("/api/save-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentStudentData)
        });

        showToast(`Unlocked Achievement: ${badgeName}!`, "success");
        renderDashboardCore();
    }
}

// ========================================================
// UTILITY ACTIONS (DOWNLOAD PDF, EXPORT, SHARE, COPY)
// ========================================================
function setupExtraActionButtons() {
    // Print Report
    const printBtn = document.getElementById("printReportBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => { window.print(); });
    }

    // Export Plan (JSON download)
    const exportBtn = document.getElementById("exportPlanBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const blob = new Blob([JSON.stringify(currentStudentData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${currentStudentData.name.replace(/\s+/g, "_")}_prep_plan.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Plan exported successfully!", "success");
        });
    }

    // Copy Motivation / Summary
    const copyBtn = document.getElementById("copyResponseBtn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const text = document.getElementById("roadmapSummary").textContent;
            navigator.clipboard.writeText(text).then(() => {
                showToast("Summary copied to clipboard!", "success");
            }).catch(() => {
                showToast("Copy failed", "error");
            });
        });
    }

    // Share link
    const shareBtn = document.getElementById("sharePlanBtn");
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                showToast("Shareable link copied!", "success");
            }).catch(() => {
                showToast("Share failed", "error");
            });
        });
    }
}

// HTML Character Escaper to prevent raw template injects
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
