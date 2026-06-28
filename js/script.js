const els = {
  category: document.getElementById("category"),
  difficulty: document.getElementById("difficulty"),
  ttsToggle: document.getElementById("ttsToggle"),
  timerToggle: document.getElementById("timerToggle"),
  teamToggle: document.getElementById("teamToggle"),
  seconds: document.getElementById("seconds"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  questionText: document.getElementById("questionText"),
  questionImage: document.getElementById("questionImage"),
  answers: document.getElementById("answers"),
  message: document.getElementById("message"),
  progress: document.getElementById("progress"),
  categoryLabel: document.getElementById("categoryLabel"),
  timer: document.getElementById("timer"),
  showAnswerBtn: document.getElementById("showAnswerBtn"),
  nextBtn: document.getElementById("nextBtn"),
  finishBtn: document.getElementById("finishBtn"),
  scoreA: document.getElementById("scoreA"),
  scoreB: document.getElementById("scoreB"),
  teamA: document.getElementById("teamA"),
  teamB: document.getElementById("teamB"),
  teamBoard: document.getElementById("teamBoard"),
  highScores: document.getElementById("highScores"),
  clearScores: document.getElementById("clearScores"),
  fontUp: document.getElementById("fontUp"),
  fontDown: document.getElementById("fontDown"),
  darkToggle: document.getElementById("darkToggle"),
  presentationBtn: document.getElementById("presentationBtn"),
};

let state = {
  questions: [],
  index: 0,
  answered: false,
  scores: [0, 0],
  activeTeam: 0,
  timerId: null,
  timeLeft: 30,
  fontScale: 1,
};

const categoryNames = {
  9: "General Knowledge",
  11: "Movies",
  12: "Music",
  17: "Science & Nature",
  21: "Sports",
  22: "Geography",
  23: "History",
  24: "Politics",
  25: "Art",
  27: "Animals",
};

function decodeHTML(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function playTone(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = type === "correct" ? 740 : 190;
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.start();
  osc.stop(ctx.currentTime + 0.38);
  if (type === "correct")
    setTimeout(() => speak("Wonderful! Great answer."), 220);
}

function speak(text) {
  if (!els.ttsToggle.checked || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.replace(/[★]/g, ""));
  utter.rate = 0.86;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
}

async function fetchQuestions() {
  const params = new URLSearchParams({
    amount: "10",
    type: "multiple",
    difficulty: els.difficulty.value,
  });
  if (els.category.value) params.set("category", els.category.value);
  const url = `https://opentdb.com/api.php?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error while loading questions.");
  const data = await res.json();
  if (data.response_code !== 0 || !data.results?.length)
    throw new Error(
      "No questions found for that setup. Try another category or difficulty."
    );
  return data.results.map((q) => ({
    category: decodeHTML(q.category),
    difficulty: q.difficulty,
    question: decodeHTML(q.question),
    correct: decodeHTML(q.correct_answer),
    answers: shuffle(
      [q.correct_answer, ...q.incorrect_answers].map(decodeHTML)
    ),
    image: q.image || q.image_url || q.media || "",
  }));
}

async function startQuiz() {
  clearInterval(state.timerId);
  els.startBtn.disabled = true;
  els.message.textContent = "Loading fresh trivia questions...";
  try {
    state.questions = await fetchQuestions();
    state.index = 0;
    state.answered = false;
    state.scores = [0, 0];
    state.activeTeam = 0;
    updateScores();
    renderQuestion();
  } catch (err) {
    els.message.textContent = err.message;
  } finally {
    els.startBtn.disabled = false;
  }
}

function renderQuestion() {
  clearInterval(state.timerId);
  const q = state.questions[state.index];
  if (!q) return finishQuiz();
  state.answered = false;
  els.nextBtn.disabled = true;
  els.showAnswerBtn.disabled = false;
  els.questionText.textContent = q.question;
  els.categoryLabel.textContent = q.category;
  els.progress.textContent = `Question ${state.index + 1} / ${
    state.questions.length
  }`;
  els.message.textContent = els.teamToggle.checked
    ? `Team ${state.activeTeam + 1}, choose an answer.`
    : "Choose an answer.";
  els.answers.innerHTML = "";

  if (q.image) {
    els.questionImage.src = q.image;
    els.questionImage.style.display = "block";
  } else {
    els.questionImage.removeAttribute("src");
    els.questionImage.style.display = "none";
  }

  q.answers.forEach((answer, i) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.textContent = `${i + 1}. ${answer}`;
    btn.dataset.answer = answer;
    btn.onclick = () => chooseAnswer(btn, answer);
    els.answers.appendChild(btn);
  });

  els.teamBoard.classList.toggle("hidden", !els.teamToggle.checked);
  updateTeamHighlight();
  speak(`${q.question}. Choices are: ${q.answers.join(". ")}`);
  if (els.timerToggle.checked) startTimer();
  else els.timer.classList.add("hidden");
}

function startTimer() {
  state.timeLeft = Number(els.seconds.value) || 30;
  els.timer.textContent = state.timeLeft;
  els.timer.classList.remove("hidden");
  state.timerId = setInterval(() => {
    state.timeLeft--;
    els.timer.textContent = state.timeLeft;
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      revealCorrect("Time is up!");
    }
  }, 1000);
}

function chooseAnswer(button, answer) {
  if (state.answered) return;
  const q = state.questions[state.index];
  clearInterval(state.timerId);
  const correct = answer === q.correct;
  if (correct) {
    state.answered = true;
    button.classList.add("correct");
    state.scores[state.activeTeam]++;
    els.message.textContent = "Correct! Applause for the team!";
    playTone("correct");
    [...els.answers.children].forEach((b) => (b.disabled = true));
    els.nextBtn.disabled = false;
    els.showAnswerBtn.disabled = true;
  } else {
    button.classList.add("wrong");
    playTone("wrong");
    revealCorrect("Good try!");
  }
  updateScores();
}

function revealCorrect(prefix) {
  if (state.answered) return;
  state.answered = true;
  const q = state.questions[state.index];
  [...els.answers.children].forEach((b) => {
    b.disabled = true;
    if (b.dataset.answer === q.correct) b.classList.add("correct");
  });
  els.message.textContent = `${prefix} The correct answer is: ${q.correct}`;
  speak(`The correct answer is ${q.correct}`);
  els.nextBtn.disabled = false;
  els.showAnswerBtn.disabled = true;
}

function nextQuestion() {
  if (els.teamToggle.checked) state.activeTeam = state.activeTeam === 0 ? 1 : 0;
  state.index++;
  renderQuestion();
}

function updateScores() {
  els.scoreA.textContent = state.scores[0];
  els.scoreB.textContent = state.scores[1];
}

function updateTeamHighlight() {
  els.teamA.classList.toggle("active-team", state.activeTeam === 0);
  els.teamB.classList.toggle("active-team", state.activeTeam === 1);
}

function finishQuiz() {
  clearInterval(state.timerId);
  const total = state.scores[0] + state.scores[1];
  els.questionImage.style.display = "none";
  els.questionText.textContent = "Activity complete!";
  els.answers.innerHTML = "";
  els.showAnswerBtn.disabled = true;
  els.message.textContent = els.teamToggle.checked
    ? `Final score: Team Sunshine ${state.scores[0]}, Team Evergreen ${state.scores[1]}.`
    : `Final score: ${total}.`;
  saveHighScore(total);
  renderHighScores();
  speak(els.message.textContent);
}

function saveHighScore(score) {
  const scores = JSON.parse(localStorage.getItem("goldenTriviaScores") || "[]");
  scores.push({
    score,
    date: new Date().toLocaleDateString(),
    mode: els.teamToggle.checked ? "Team" : "Solo",
  });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(
    "goldenTriviaScores",
    JSON.stringify(scores.slice(0, 5))
  );
}

function renderHighScores() {
  const scores = JSON.parse(localStorage.getItem("goldenTriviaScores") || "[]");
  els.highScores.innerHTML = scores.length
    ? scores
        .map(
          (s) =>
            `<li><strong>${s.score}</strong> points · ${s.mode} · ${s.date}</li>`
        )
        .join("")
    : "<li>No scores yet</li>";
}

function resetQuiz() {
  clearInterval(state.timerId);
  speechSynthesis?.cancel?.();
  state = {
    ...state,
    questions: [],
    index: 0,
    answered: false,
    scores: [0, 0],
    activeTeam: 0,
  };
  updateScores();
  updateTeamHighlight();
  els.answers.innerHTML = "";
  els.questionText.textContent = "Choose your settings, then start the quiz.";
  els.progress.textContent = "Question 0 / 10";
  els.categoryLabel.textContent = "Ready";
  els.timer.classList.add("hidden");
  els.message.textContent =
    "Keyboard tip: use 1, 2, 3, 4 to answer. Press S to show the answer. Press N for next question.";
  els.nextBtn.disabled = true;
  els.showAnswerBtn.disabled = true;
}

els.startBtn.addEventListener("click", startQuiz);
els.showAnswerBtn.addEventListener("click", () =>
  revealCorrect("Here is the correct answer.")
);
els.nextBtn.addEventListener("click", nextQuestion);
els.finishBtn.addEventListener("click", finishQuiz);
els.resetBtn.addEventListener("click", resetQuiz);
els.clearScores.addEventListener("click", () => {
  localStorage.removeItem("goldenTriviaScores");
  renderHighScores();
});
els.darkToggle.addEventListener("click", () =>
  document.body.classList.toggle("dark")
);
els.fontUp.addEventListener("click", () => {
  state.fontScale = Math.min(1.35, state.fontScale + 0.08);
  document.documentElement.style.setProperty("--font-scale", state.fontScale);
});
els.fontDown.addEventListener("click", () => {
  state.fontScale = Math.max(0.9, state.fontScale - 0.08);
  document.documentElement.style.setProperty("--font-scale", state.fontScale);
});
els.presentationBtn.addEventListener("click", async () => {
  document.body.classList.toggle("presentation");
  if (
    document.body.classList.contains("presentation") &&
    document.documentElement.requestFullscreen
  ) {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {}
  } else if (document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch (e) {}
  }
});

document.addEventListener("keydown", (e) => {
  const number = Number(e.key);
  if (number >= 1 && number <= 4) els.answers.children[number - 1]?.click();
  if (e.key.toLowerCase() === "n" && !els.nextBtn.disabled) nextQuestion();
  if (e.key.toLowerCase() === "s" && !els.showAnswerBtn.disabled)
    revealCorrect("Here is the correct answer.");
  if (e.key === "Escape") document.body.classList.remove("presentation");
});

renderHighScores();
