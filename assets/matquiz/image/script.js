let selectedQuestions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;

// Swipe Event Variables
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function initializeQuiz() {
    // allQuizData என்பது லோட் செய்யப்பட்ட quizDataUnitX.js-ல் இருந்து நேரடியாக வரும்
    let quizData = [...allQuizData];

    // கேள்விகள் இல்லையென்றால் பிழையைத் தவிர்க்க
    if (quizData.length === 0) {
        document.getElementById("question-area").innerHTML = "<h3 style='text-align:center; padding: 30px;'>இந்த பகுதிக்கான கேள்விகள் இன்னும் சேர்க்கப்படவில்லை!</h3>";
        document.getElementById("palette-container").style.display = "none";
        document.querySelector(".footer").style.display = "none";
        return;
    }

    // 1. அனைத்து கேள்விகளையும் சீரற்ற முறையில் கலைக்க (Shuffle)
    quizData = shuffleArray(quizData);

    // 2. அதிலிருந்து முதல் 10 கேள்விகளை மட்டும் தேர்ந்தெடுக்க (Random 10 Questions)
    // குறிப்பு: ஒருவேளை 10-க்கும் குறைவான கேள்விகள் இருந்தாலும் இது பிழையின்றி வேலை செய்யும்
    quizData = quizData.slice(0, 10);

    selectedQuestions = quizData.map((q, idx) => {
        let optionsObj = q.options.map((text, oIdx) => ({
            text: text, isCorrect: oIdx === q.correct
        }));
        return {
            ...q,
            shuffledOptions: shuffleArray(optionsObj),
            answered: false,
            userSelectedIndex: null
        };
    });

    setupPalette();
    loadQuestion(0);
    setupSwipeListeners();
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function setupPalette() {
    const paletteContainer = document.getElementById("palette-container");
    paletteContainer.innerHTML = "";
    selectedQuestions.forEach((q, index) => {
        const numBtn = document.createElement("div");
        numBtn.classList.add("palette-number");
        numBtn.id = `palette-num-${index}`;
        // கேள்வியின் அசல் எண் (q.id) அல்லது வரிசை எண்ணை (index + 1) காட்டலாம்
        numBtn.innerText = index + 1;
        numBtn.onclick = () => loadQuestion(index);
        paletteContainer.appendChild(numBtn);
    });
}

function updatePaletteActiveState() {
    const numbers = document.querySelectorAll(".palette-number");
    numbers.forEach(num => num.classList.remove("active"));
    const activeNumber = document.getElementById(`palette-num-${currentQuestionIndex}`);
    if(activeNumber) {
        activeNumber.classList.add("active");
        activeNumber.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function renderMath() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([document.getElementById('question-area')]).catch(function (err) {
            console.log('MathJax rendering error: ' + err.message);
        });
    }
}

function loadQuestion(index) {
    currentQuestionIndex = index;
    document.getElementById("question-area").scrollTop = 0;
    updatePaletteActiveState();

    const q = selectedQuestions[currentQuestionIndex];
    let questionHTML = `(Q.No: ${index + 1}) ${q.question}`;
    if (q.image) {
        questionHTML += `<img src="${q.image}" class="question-image" alt="Question Image">`;
    }
    document.getElementById("question-text-container").innerHTML = questionHTML;

    const optionsList = document.getElementById("options");
    optionsList.innerHTML = "";

    q.shuffledOptions.forEach((opt, oIndex) => {
        const li = document.createElement("li");
        li.innerHTML = opt.text;
        if (q.answered) {
            li.classList.add("disabled");
            if (oIndex === q.userSelectedIndex) {
                li.classList.add(opt.isCorrect ? "correct" : "wrong");
            }
            if (opt.isCorrect) li.classList.add("correct");
        } else {
            li.setAttribute("onclick", `checkAnswer(${oIndex}, this)`);
        }
        optionsList.appendChild(li);
    });

    const expBox = document.getElementById("explanation");
    const nextBtn = document.getElementById("submit-btn");

    if (q.answered) {
        const expImage = document.getElementById("exp-image");
        if (q.explanationImage) {
            expImage.src = q.explanationImage;
            expImage.style.display = "block";
        } else {
            expImage.style.display = "none";
        }

        if (q.explanation) {
            document.getElementById("exp-text").innerHTML = q.explanation;
            expBox.style.display = "block";
        } else {
            expBox.style.display = "none";
        }

        nextBtn.style.display = "block";
        nextBtn.innerText = (currentQuestionIndex === selectedQuestions.length - 1) ? "முடிவுகளைக் காட்டு" : "அடுத்த கேள்வி";
    } else {
        expBox.style.display = "none";
        nextBtn.style.display = "none";
    }
    renderMath();
}

function checkAnswer(selectedIndex, selectedElement) {
    const q = selectedQuestions[currentQuestionIndex];
    if (q.answered) return;

    q.answered = true;
    q.userSelectedIndex = selectedIndex;

    if (q.shuffledOptions[selectedIndex].isCorrect) {
        correctAnswers++;
    } else {
        wrongAnswers++;
    }

    document.getElementById(`palette-num-${currentQuestionIndex}`).classList.add("attended");
    loadQuestion(currentQuestionIndex);
    setTimeout(() => { document.getElementById("question-area").scrollBy({ top: 150, behavior: 'smooth' }); }, 100);
}

function nextQuestion() {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        showResult();
    }
}

// --- SWIPE GESTURE LOGIC ---
function setupSwipeListeners() {
    const area = document.getElementById('question-area');

    area.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    area.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, {passive: true});
}

function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX < 0) {
            if (currentQuestionIndex < selectedQuestions.length - 1) {
                loadQuestion(currentQuestionIndex + 1);
            }
        } else {
            if (currentQuestionIndex > 0) {
                loadQuestion(currentQuestionIndex - 1);
            }
        }
    }
}

// --- RESULT & HISTORY LOGIC ---
// --- புதிய பங்க்ஷன்: ஒவ்வொரு பாடத்திற்கும்/யூனிட்டிற்கும் தனித்தனி பெயர் உருவாக்க ---
function getHistoryKey() {
    // 1. URL-ல் இருந்து பக்கத்தின் பெயரை எடுப்பது (உம்: 'mathsquiz.html' லிருந்து 'mathsquiz')
    let path = window.location.pathname;
    let pageName = path.split("/").pop().replace(".html", "") || "quiz";

    // 2. URL-ல் இருந்து Unit நம்பரை எடுப்பது
    const urlParams = new URLSearchParams(window.location.search);
    const unitParam = urlParams.get('unit') || '1';

    // 3. இரண்டையும் சேர்த்து ஒரு தனித்துவமான Key-ஐ உருவாக்குவது
    // உதாரணம்: "nmmsHistory_mathsquiz_unit_1"
    return `nmmsHistory_${pageName}_unit_${unitParam}`;
}

// --- RESULT & HISTORY LOGIC ---
function showResult() {
    document.getElementById("quiz-box").style.display = "none";
    document.getElementById("result-box").style.display = "flex";

    let total = selectedQuestions.length;
    let unattempted = total - (correctAnswers + wrongAnswers);

    let correctPct = (correctAnswers / total) * 100;
    let wrongPct = (wrongAnswers / total) * 100;
    let wrongEnd = correctPct + wrongPct;

    let pieChart = document.getElementById("pie-chart");
    let borderColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#888888';
    pieChart.style.background = `conic-gradient(#28a745 0% ${correctPct}%, #dc3545 ${correctPct}% ${wrongEnd}%, ${borderColor} ${wrongEnd}% 100%)`;

    document.getElementById("correct-count").innerText = correctAnswers;
    document.getElementById("wrong-count").innerText = wrongAnswers;
    document.getElementById("unattempted-count").innerText = unattempted;
    document.getElementById("score-text").innerHTML = `மதிப்பெண்: <span class="score-highlight">${correctAnswers}</span> / ${total}`;

    // மதிப்பெண்ணைச் சேமித்து, பட்டியலைக் காட்டு
    saveScoreToHistory(correctAnswers, total);
    displayScoreHistory();
}

function saveScoreToHistory(score, total) {
    let storageKey = getHistoryKey(); // தனித்துவமான Key-ஐ பெறுதல்
    let history = JSON.parse(localStorage.getItem(storageKey)) || [];

    let now = new Date();
    let dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    let timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    let record = {
        score: score,
        total: total,
        date: now.toLocaleDateString('en-IN', dateOptions),
        time: now.toLocaleTimeString('en-IN', timeOptions)
    };

    history.unshift(record);
    if (history.length > 10) history.pop();

    // அந்தந்த பாடம் மற்றும் யூனிட்டிற்கான Key-ல் சேமித்தல்
    localStorage.setItem(storageKey, JSON.stringify(history));
}

function displayScoreHistory() {
    let storageKey = getHistoryKey(); // தனித்துவமான Key-ஐ பெறுதல்
    let history = JSON.parse(localStorage.getItem(storageKey)) || [];
    let historyList = document.getElementById("history-list");
    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = "<li style='justify-content:center'>முந்தைய தரவுகள் இல்லை</li>";
        return;
    }

    history.forEach(record => {
        let li = document.createElement("li");
        // இங்கு Unit பெயரைக் காட்டத் தேவையில்லை, ஏனென்றால் இந்த பட்டியல் அந்த Unit-க்கு மட்டுமே உரியது
        li.innerHTML = `<span>${record.date} | ${record.time}</span> <span class="history-score">${record.score} / ${record.total}</span>`;
        historyList.appendChild(li);
    });
}

// --- DYNAMIC SCRIPT / JSON LOADER ---
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const unitParam = urlParams.get('unit') || '1';

    // First try fetching JSON data directly
    fetch(`data/unit${unitParam}.json`)
        .then(res => {
            if (res.ok) return res.json();
            throw new Error('JSON not found');
        })
        .then(data => {
            window.allQuizData = data;
            if (window.MathJax && window.MathJax.startup) {
                window.MathJax.startup.promise.then(() => {
                    initializeQuiz();
                }).catch(() => initializeQuiz());
            } else {
                initializeQuiz();
            }
        })
        .catch(() => {
            // Fallback to .js script tag loading
            const script = document.createElement('script');
            script.src = `data/unit${unitParam}.js`;

            script.onload = function() {
                if (window.MathJax && window.MathJax.startup) {
                    window.MathJax.startup.promise.then(() => {
                        initializeQuiz();
                    }).catch((err) => console.log('MathJax init error: ', err));
                } else {
                    initializeQuiz();
                }
            };

            script.onerror = function() {
                document.getElementById("quiz-box").style.display = "none";
                document.body.innerHTML = `<div style="text-align:center; margin-top:50px; font-family:sans-serif; color:#333;">
                    <h2>மன்னிக்கவும்!</h2>
                    <p><strong>data/unit${unitParam}.json</strong> / <strong>.js</strong> என்ற ஃபைல் காணப்படவில்லை.</p>
                </div>`;
            };

            document.head.appendChild(script);
        });
};