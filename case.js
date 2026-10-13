(() => {
  "use strict";

  const DATA = window.COLD_LOGS_CASE;
  const client = window.coldLogsSupabase;
  const $ = (id) => document.getElementById(id);
  const VALID_PHASES = new Set(["round1", "checkpoint1", "round2", "checkpoint2", "round3", "final", "review"]);
  const state = {
    session: null,
    teamId: "TEAM-UNKNOWN",
    phase: "round1",
    finalIndex: 0,
    checkpointAnswers: {},
    completedCheckpoints: [],
    round3Complete: false,
    finalAnswers: {},
    events: [],
    strikes: 0,
    startedAt: null,
    submitted: false,
    timedOut: false,
    autoSubmitInProgress: false,
    lastPayload: null
  };

  let timerHandle = null;
  let saveLabelTimer = null;
  let alertTimer = null;
  const draftKey = () => `coldlogs:draft:${state.teamId}:${DATA.id}`;
  const allEvidence = () => DATA.rounds.filter((round) => isRoundUnlocked(round.id)).flatMap((round) => round.evidence);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function teamFromEmail(email) {
    return ((email || "TEAM-UNKNOWN").split("@")[0] || "TEAM-UNKNOWN").toUpperCase();
  }

  function showToast(message, duration = 3800) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), duration);
  }

  function showAlert(message, duration = 6500) {
    const alert = $("caseAlert");
    alert.textContent = message;
    alert.classList.remove("hidden");
    window.clearTimeout(alertTimer);
    if (duration > 0) alertTimer = window.setTimeout(() => alert.classList.add("hidden"), duration);
  }

  function setSaveIndicator(message, saved = true) {
    const node = $("saveIndicator");
    node.textContent = message;
    node.style.color = saved ? "#fff18b" : "#e0b91d";
  }

  function addEvent(type, detail = "") {
    if (state.submitted) return;
    state.events.push({
      type,
      detail: String(detail).slice(0, 240),
      at: new Date().toISOString(),
      phase: state.phase,
      question_id: state.phase === "final" ? DATA.finalQuestions[state.finalIndex]?.id || null : null
    });
    state.events = state.events.slice(-150);
    persistDraft(false);
  }

  function persistDraft(showSaved = true) {
    try {
      localStorage.setItem(draftKey(), JSON.stringify({
        phase: state.phase,
        finalIndex: state.finalIndex,
        checkpointAnswers: state.checkpointAnswers,
        completedCheckpoints: state.completedCheckpoints,
        round3Complete: state.round3Complete,
        finalAnswers: state.finalAnswers,
        events: state.events.slice(-150),
        strikes: state.strikes,
        startedAt: state.startedAt,
        timedOut: state.timedOut,
        savedAt: new Date().toISOString()
      }));
      if (showSaved) {
        setSaveIndicator(`SAVED ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
        window.clearTimeout(saveLabelTimer);
        saveLabelTimer = window.setTimeout(() => {
          if (!state.submitted) setSaveIndicator("DRAFT SAVED LOCALLY");
        }, 2500);
      }
    } catch {
      setSaveIndicator("LOCAL SAVE UNAVAILABLE", false);
    }
  }

  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey()) || "null");
      if (!saved || typeof saved !== "object") return false;
      state.phase = VALID_PHASES.has(saved.phase) ? saved.phase : "round1";
      state.finalIndex = Math.min(Math.max(Number(saved.finalIndex) || 0, 0), DATA.finalQuestions.length - 1);
      state.checkpointAnswers = saved.checkpointAnswers && typeof saved.checkpointAnswers === "object" ? saved.checkpointAnswers : {};
      state.completedCheckpoints = Array.isArray(saved.completedCheckpoints) ? saved.completedCheckpoints.filter((id) => ["checkpoint1", "checkpoint2"].includes(id)) : [];
      state.round3Complete = Boolean(saved.round3Complete);
      state.finalAnswers = saved.finalAnswers && typeof saved.finalAnswers === "object" ? saved.finalAnswers : {};
      state.events = Array.isArray(saved.events) ? saved.events.slice(-150) : [];
      state.strikes = Math.max(0, Number(saved.strikes) || 0);
      state.startedAt = saved.startedAt || null;
      state.timedOut = Boolean(saved.timedOut);
      return Boolean(state.startedAt);
    } catch {
      return false;
    }
  }

  function getElapsedSeconds() {
    if (!state.startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000));
  }

  function getRemainingSeconds() {
    return Math.max(0, DATA.timeLimitSeconds - getElapsedSeconds());
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateTimer() {
    const active = Boolean(state.startedAt) && !state.submitted;
    const remaining = state.timedOut ? 0 : getRemainingSeconds();
    $("timerValue").textContent = formatTime(remaining);
    $("timerBar").style.width = `${Math.max(0, (remaining / DATA.timeLimitSeconds) * 100)}%`;
    $("timerState").textContent = !active ? (state.startedAt ? "PAUSED / SUBMITTED" : "NOT STARTED") : (state.timedOut ? "TIME EXPIRED" : "RUNNING");
    $("timerMessage").textContent = state.timedOut
      ? "Time limit reached · your current work is being submitted"
      : remaining <= 60
        ? "Less than one minute remaining · finish your report now"
        : remaining <= 300
          ? "Five-minute warning · finalise your written answers"
          : "35 minutes total · about 30 minutes investigating + 5 minutes to write";

    if (state.startedAt && !state.submitted && !state.timedOut && remaining === 0) {
      state.timedOut = true;
      addEvent("time_limit_reached", "35-minute case limit elapsed");
      persistDraft();
      showAlert("TIME LIMIT REACHED — your saved checkpoint and report responses will be submitted and marked as time-expired.", 0);
      finalizeSubmission(true, "time_expired");
    }
  }

  function startTimer() {
    window.clearInterval(timerHandle);
    updateTimer();
    timerHandle = window.setInterval(updateTimer, 1000);
  }

  function isRoundUnlocked(roundId) {
    if (roundId === "round1") return Boolean(state.startedAt);
    if (roundId === "round2") return Boolean(state.startedAt) && state.completedCheckpoints.includes("checkpoint1");
    if (roundId === "round3") return Boolean(state.startedAt) && state.completedCheckpoints.includes("checkpoint2");
    return false;
  }


  // Completion flags are derived from checkpoint responses so a reload cannot lose unlocked rounds.
  Object.defineProperty(state, "checkpoint1Complete", {
    get() { return state.completedCheckpoints.includes("checkpoint1"); }, enumerable: true
  });
  Object.defineProperty(state, "checkpoint2Complete", {
    get() { return state.completedCheckpoints.includes("checkpoint2"); }, enumerable: true
  });

  function renderHandbooks() {
    $("handbookList").innerHTML = DATA.handbook.map((item) => `
      <button type="button" class="handbook-card" data-open-handbook="${escapeHTML(item.id)}">
        <span class="file-icon">PDF</span>
        <span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.description)}</small></span>
      </button>`).join("");
    $("handbookList").querySelectorAll("[data-open-handbook]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = DATA.handbook.find((document) => document.id === button.dataset.openHandbook);
        if (item) openEvidence(item, true);
      });
    });
  }

  function renderObjectives() {
    $("caseBrief").textContent = DATA.brief;
    $("caseObjectives").innerHTML = DATA.objectives.map((item, index) => `
      <span class="objective-chip">0${index + 1} / ${escapeHTML(item)}</span>`).join("");
  }

  function isStageDone(stage) {
    if (stage === "round1") return ["checkpoint1", "round2", "checkpoint2", "round3", "final", "review"].includes(state.phase) || state.checkpoint1Complete;
    if (stage === "checkpoint1") return state.completedCheckpoints.includes("checkpoint1");
    if (stage === "round2") return ["checkpoint2", "round3", "final", "review"].includes(state.phase) || state.checkpoint2Complete;
    if (stage === "checkpoint2") return state.completedCheckpoints.includes("checkpoint2");
    if (stage === "round3") return state.round3Complete || state.submitted;
    if (stage === "final") return state.phase === "review" || state.submitted;
    return false;
  }

  function renderPhaseTrack() {
    document.querySelectorAll("[data-phase-step]").forEach((node) => {
      const stage = node.dataset.phaseStep;
      node.classList.toggle("active", stage === state.phase || (state.phase === "review" && stage === "final"));
      node.classList.toggle("done", isStageDone(stage));
    });
  }

  function renderEvidence() {
    const roundsToShow = DATA.rounds.filter((round) => isRoundUnlocked(round.id));
    if (!roundsToShow.length) {
      $("evidenceHost").innerHTML = `<p class="panel-help">Begin the investigation to release the first evidence pack.</p>`;
      return;
    }
    $("evidenceHost").innerHTML = roundsToShow.map((round) => `
      <section class="evidence-group">
        <header class="evidence-group-heading"><div><strong>ROUND ${escapeHTML(round.number)} / ${escapeHTML(round.title)}</strong><small>${escapeHTML(round.subtitle)}</small></div><span class="group-index">${String(round.evidence.length).padStart(2, "0")} FILES</span></header>
        ${round.evidence.map((item) => `
          <article class="evidence-card">
            <div>
              <div class="evidence-meta"><span class="evidence-id">${escapeHTML(item.id)}</span><span class="evidence-format">${item.format === "pdf" ? "PDF" : "TXT"}</span></div>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.description)}</p>
              <div class="evidence-stamp">${escapeHTML(item.stamp)}<br>${escapeHTML(item.sourceName)}</div>
            </div>
            <button class="open-evidence" type="button" data-open-evidence="${escapeHTML(item.id)}">OPEN ↗</button>
          </article>`).join("")}
      </section>`).join("");

    $("evidenceHost").querySelectorAll("[data-open-evidence]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = allEvidence().find((document) => document.id === button.dataset.openEvidence);
        if (item) openEvidence(item, false);
      });
    });
  }

  async function openEvidence(item, isHandbook = false) {
    const dialog = $("evidenceDialog");
    $("dialogTitle").textContent = item.title;
    $("dialogMeta").textContent = `${item.id} · ${item.stamp || "CASE HANDBOOK"}`;
    $("dialogSource").textContent = item.sourceName || item.href;
    $("downloadEvidence").href = item.href;
    $("downloadEvidence").download = item.sourceName || item.href.split("/").pop();
    $("evidenceViewer").replaceChildren();
    if (item.format === "text") {
      const pre = document.createElement("pre");
      pre.textContent = "Loading source record…";
      $("evidenceViewer").appendChild(pre);
      try {
        const response = await fetch(item.href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        pre.textContent = await response.text();
      } catch {
        pre.textContent = "Unable to load the text file here. Use DOWNLOAD SOURCE to open the supplied original.";
      }
    } else {
      const iframe = document.createElement("iframe");
      iframe.title = `Evidence document: ${item.title}`;
      iframe.src = item.href;
      iframe.loading = "lazy";
      $("evidenceViewer").appendChild(iframe);
    }
    if (!isHandbook) addEvent("evidence_opened", `${item.id} / ${item.sourceName}`);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeEvidence() {
    const dialog = $("evidenceDialog");
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    $("evidenceViewer").replaceChildren();
  }

  function renderGateCopy() {
    const draftExists = Boolean(state.startedAt);
    $("continueCaseBtn").classList.toggle("hidden", !draftExists || state.submitted);
  }

  function setPhase(phase) {
    state.phase = phase;
    persistDraft();
    renderApp();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderRound(roundId) {
    const round = DATA.rounds.find((item) => item.id === roundId);
    if (!round) return;
    const checkpoint = round.checkpoint;
    const isInitialRound = roundId === "round1";
    const isAuditRound = roundId === "round2";
    const isLastEvidenceRound = roundId === "round3";
    const note = isInitialRound
      ? "Start with what is directly recorded. Keep the USB-write alert, access permissions, code similarities and interview claims as separate clues until they can be connected."
      : isAuditRound
        ? "Cross-check repository heads, export IDs, sizes and hashes against CI, gateway, endpoint, USB, campus-access and submitted-package records. An IP address or token owner does not by itself identify the person who operated it."
        : "Use the recovered stamp and alias logs to connect the technical transfer chain. Confirm the relevant DHCP lease window before mapping an IP to a device; registration and device presence do not automatically establish who was using it. The final report remains locked until you continue below.";
    const actionLabel = isLastEvidenceRound ? "OPEN FINAL REPORT" : (isAuditRound ? "CONTINUE TO CHECKPOINT 2" : "CONTINUE TO CHECKPOINT 1");
    const actionNote = isLastEvidenceRound
      ? "Last evidence pack released. Finish the original 11 questions and cite the filename plus timestamp or record ID for each important claim."
      : isAuditRound
        ? "Review and correlate every exhibit before submitting Checkpoint 2. Earlier evidence remains available."
        : "Review every initial exhibit before submitting your provisional theory. Earlier evidence remains available.";
    $("activityLabel").textContent = `EVIDENCE ROUND ${round.number}`;
    $("activityHost").innerHTML = `
      <p class="section-kicker">${escapeHTML(round.subtitle)}</p>
      <h2 class="activity-title">${escapeHTML(round.title)}<span class="yellow">.</span></h2>
      <p class="activity-intro">${escapeHTML(round.description)}</p>
      <div class="activity-callout"><span>⌬</span><p><strong>Investigator's note</strong><br>${escapeHTML(note)}</p></div>
      <div class="round-summary"><div><strong>${String(round.evidence.length).padStart(2, "0")}</strong><span>FILES RELEASED</span></div><div><strong>${round.number}/03</strong><span>EVIDENCE ROUND</span></div><div><strong>IST</strong><span>TIME STANDARD</span></div></div>
      <div class="activity-actions"><span class="action-note">${escapeHTML(actionNote)}</span><button class="primary-button" id="openCheckpointBtn" type="button">${actionLabel} <span>→</span></button></div>`;
    $("openCheckpointBtn").addEventListener("click", () => {
      if (isLastEvidenceRound) {
        state.round3Complete = true;
        addEvent("round_completed", "Reviewed final evidence pack / Round 3");
        persistDraft();
        showToast("Final evidence pack reviewed. The 11-question report is now open.");
        setPhase("final");
      } else if (checkpoint) {
        setPhase(checkpoint.id);
      }
    });
  }

  function renderCheckpoint(checkpointId) {
    const round = DATA.rounds.find((item) => item.checkpoint?.id === checkpointId);
    if (!round) return;
    const checkpoint = round.checkpoint;
    $("activityLabel").textContent = checkpointId === "checkpoint1" ? "CHECKPOINT / PROVISIONAL THEORY" : "CHECKPOINT / EVIDENCE CORRELATION";
    $("activityHost").innerHTML = `
      <p class="section-kicker">ROUND ${round.number} CHECKPOINT</p>
      <h2 class="activity-title">${escapeHTML(checkpoint.title)}<span class="yellow">.</span></h2>
      <p class="activity-intro">${escapeHTML(checkpoint.intro)}</p>
      <div class="activity-callout"><span>!</span><p><strong>Evidence discipline</strong><br>Every important claim should include a filename plus timestamp or record ID. “Unknown” is an acceptable evidence-based conclusion when the available records do not establish a link.</p></div>
      <form class="checkpoint-form" id="checkpointForm" novalidate>
        ${checkpoint.prompts.map((prompt, index) => {
          const value = state.checkpointAnswers[prompt.id] || "";
          return `<div class="checkpoint-field"><label for="${prompt.id}"><span class="yellow">0${index + 1} /</span> ${escapeHTML(prompt.prompt)}</label><span class="field-hint">${escapeHTML(prompt.help)}</span><textarea class="response-text" id="${prompt.id}" name="${prompt.id}" maxlength="${prompt.maxLength}" placeholder="Write a short, evidence-based response…" required>${escapeHTML(value)}</textarea><div class="field-count"><span>SHORT CHECKPOINT RESPONSE</span><span id="count-${prompt.id}">${value.length} / ${prompt.maxLength}</span></div></div>`;
        }).join("")}
        <div class="activity-actions"><span class="action-note">This checkpoint is saved in your browser as you type.</span><button class="primary-button" type="submit">${checkpointId === "checkpoint1" ? "SUBMIT & UNLOCK ROUND 2" : "SUBMIT & UNLOCK ROUND 3"} <span>→</span></button></div>
      </form>`;

    const form = $("checkpointForm");
    checkpoint.prompts.forEach((prompt) => {
      const textarea = $(prompt.id);
      textarea.addEventListener("input", () => {
        state.checkpointAnswers[prompt.id] = textarea.value;
        $(`count-${prompt.id}`).textContent = `${textarea.value.length} / ${prompt.maxLength}`;
        persistDraft();
      });
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      let firstEmpty = null;
      checkpoint.prompts.forEach((prompt) => {
        const value = String($(prompt.id).value || "").trim();
        state.checkpointAnswers[prompt.id] = $(prompt.id).value;
        if (!value && !firstEmpty) firstEmpty = $(prompt.id);
      });
      if (firstEmpty) {
        showToast("Complete all checkpoint responses before continuing.");
        firstEmpty.focus();
        persistDraft();
        return;
      }
      if (!state.completedCheckpoints.includes(checkpointId)) state.completedCheckpoints.push(checkpointId);
      addEvent("checkpoint_submitted", checkpointId);
      persistDraft();
      if (checkpointId === "checkpoint1") {
        showToast("Checkpoint 1 saved. Round 2 is now unlocked.");
        setPhase("round2");
      } else {
        showToast("Checkpoint 2 saved. The final evidence pack is now unlocked.");
        state.finalIndex = 0;
        setPhase("round3");
      }
    });
  }

  function renderFinalQuestion() {
    const question = DATA.finalQuestions[state.finalIndex];
    const total = DATA.finalQuestions.length;
    const index = state.finalIndex + 1;
    const value = state.finalAnswers[question.id] || "";
    $("activityLabel").textContent = "FINAL REPORT / QUESTIONS 01–11";
    $("activityHost").innerHTML = `
      <p class="section-kicker">FINAL SUBMISSION · QUESTION ${String(index).padStart(2, "0")} OF ${String(total).padStart(2, "0")}</p>
      <h2 class="activity-title">Build the case<span class="yellow">.</span></h2>
      <p class="activity-intro">Answer in order and keep the final numbered report concise (about one page overall). Cite filenames with timestamps or record IDs, and label inferences and remaining uncertainty.</p>
      <div class="question-progress"><span>QUESTION ${index} / ${total}</span><span>${Math.round(index / total * 100)}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${index / total * 100}%"></div></div>
      <div class="final-question-wrap">
        <p class="final-question-tag">QUESTION ${String(index).padStart(2, "0")}</p>
        <h3 class="final-question">${escapeHTML(question.prompt)}</h3>
        <p class="final-help">${escapeHTML(question.help)}</p>
        <div class="final-field"><textarea id="finalAnswer" class="response-text" maxlength="${question.maxLength}" placeholder="Write your answer with filename + timestamp or record ID citations…" aria-label="Answer to question ${index}" required>${escapeHTML(value)}</textarea><div class="field-count"><span>WRITTEN RESPONSE · CITE THE RECORD</span><span id="finalCount">${value.length} / ${question.maxLength}</span></div></div>
      </div>
      <div class="question-nav"><button class="secondary-button" id="previousQuestion" type="button" ${index === 1 ? "disabled" : ""}>← PREVIOUS</button><button class="primary-button" id="nextQuestion" type="button">${index === total ? "REVIEW FINAL REPORT" : "SAVE & CONTINUE"} <span>→</span></button></div>`;

    const textarea = $("finalAnswer");
    textarea.addEventListener("input", () => {
      state.finalAnswers[question.id] = textarea.value;
      $("finalCount").textContent = `${textarea.value.length} / ${question.maxLength}`;
      persistDraft();
    });
    $("previousQuestion").addEventListener("click", () => {
      saveCurrentFinalAnswer();
      state.finalIndex = Math.max(0, state.finalIndex - 1);
      persistDraft();
      renderFinalQuestion();
    });
    $("nextQuestion").addEventListener("click", () => {
      saveCurrentFinalAnswer();
      if (!String(state.finalAnswers[question.id] || "").trim()) {
        showToast("Write an answer before moving to the next question.");
        textarea.focus();
        return;
      }
      if (state.finalIndex === total - 1) {
        state.phase = "review";
      } else {
        state.finalIndex += 1;
      }
      persistDraft();
      renderApp();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function saveCurrentFinalAnswer() {
    const question = DATA.finalQuestions[state.finalIndex];
    const textarea = $("finalAnswer");
    if (question && textarea) state.finalAnswers[question.id] = textarea.value;
    persistDraft();
  }

  function buildResponseRows() {
    const checkpointRows = DATA.rounds.flatMap((round) => (round.checkpoint?.prompts || []).map((prompt) => ({
      id: prompt.id,
      phase: round.checkpoint.id,
      question: prompt.prompt,
      answer: state.checkpointAnswers[prompt.id] || ""
    })));
    const finalRows = DATA.finalQuestions.map((question) => ({
      id: question.id,
      phase: "final",
      question: question.prompt,
      answer: state.finalAnswers[question.id] || ""
    }));
    return [...checkpointRows, ...finalRows];
  }

  function renderReview() {
    const rows = buildResponseRows();
    const completeFinalCount = DATA.finalQuestions.filter((question) => String(state.finalAnswers[question.id] || "").trim()).length;
    $("activityLabel").textContent = "FINAL REVIEW / SUBMISSION PREVIEW";
    $("activityHost").innerHTML = `
      <p class="section-kicker">FINAL QUALITY CHECK</p>
      <h2 class="activity-title">Review your findings<span class="yellow">.</span></h2>
      <p class="activity-intro">Make sure your final answers explain the record links and keep proved facts separate from inferences. The case brief asks for answers numbered 1–11 and a concise final submission.</p>
      <div class="round-summary"><div><strong>${completeFinalCount}/11</strong><span>FINAL ANSWERS</span></div><div><strong>${state.strikes}</strong><span>FOCUS EVENTS</span></div><div><strong>${formatTime(getRemainingSeconds())}</strong><span>TIME LEFT</span></div></div>
      <div class="review-list">${rows.map((row, index) => `<article class="review-item"><span class="review-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHTML(row.question)}</h3><p class="${String(row.answer).trim() ? "" : "review-empty"}">${escapeHTML(String(row.answer).trim() || "No response entered")}</p></div></article>`).join("")}</div>
      <div class="activity-actions"><span class="action-note">Submission includes checkpoints, final answers, and logged browser focus events.</span><button class="secondary-button" id="editFinalAnswers" type="button">← EDIT ANSWERS</button><button class="primary-button" id="toSubmitReview" type="button">CONTINUE TO SUBMIT <span>→</span></button></div>`;
    $("editFinalAnswers").addEventListener("click", () => setPhase("final"));
    $("toSubmitReview").addEventListener("click", renderSubmissionReview);
  }

  function renderSubmissionReview() {
    $("activityLabel").textContent = "SUBMISSION AUTHORIZATION";
    $("activityHost").innerHTML = `
      <p class="section-kicker">ONE LAST CHECK</p>
      <h2 class="activity-title">Submit the case<span class="yellow">.</span></h2>
      <p class="activity-intro">Your responses will be sent for organizer evaluation. This page does not reveal or store a client-side answer key. If the database upload fails, download the JSON backup and send it to the organizer.</p>
      <div class="activity-callout"><span>⌬</span><p><strong>Before you submit</strong><br>Confirm that each conclusion cites the relevant filename and timestamp/record ID, and that any remaining uncertainty is clearly stated.</p></div>
      <label class="confirmation"><input id="submitConfirmation" type="checkbox"><span>I have reviewed our team's answers and understand that this submits the current investigation record.</span></label>
      <div class="submit-footer"><button id="backToReview" class="secondary-button" type="button">← BACK TO ANSWERS</button><button id="downloadBackup" class="secondary-button" type="button">DOWNLOAD JSON BACKUP ↓</button><button id="submitFinal" class="primary-button" type="button" disabled>SUBMIT INVESTIGATION <span>↗</span></button></div>`;
    $("backToReview").addEventListener("click", () => setPhase("review"));
    $("downloadBackup").addEventListener("click", () => downloadJSON(createPayload(false)));
    $("submitConfirmation").addEventListener("change", (event) => { $("submitFinal").disabled = !event.target.checked; });
    $("submitFinal").addEventListener("click", () => finalizeSubmission(false, "submitted"));
  }

  function renderApp() {
    renderPhaseTrack();
    renderEvidence();
    if (state.submitted) return;
    if (state.phase === "round1") renderRound("round1");
    else if (state.phase === "checkpoint1") {
      if (state.checkpoint1Complete) {
        state.phase = "round2";
        renderRound("round2");
      } else renderCheckpoint("checkpoint1");
    }
    else if (state.phase === "round2") {
      if (!state.checkpoint1Complete) state.phase = "round1";
      renderRound(state.phase === "round1" ? "round1" : "round2");
    }
    else if (state.phase === "checkpoint2") {
      if (!state.checkpoint1Complete) {
        state.phase = "round1";
        renderRound("round1");
      } else if (!state.checkpoint2Complete) renderCheckpoint("checkpoint2");
      else {
        state.phase = "round3";
        renderRound("round3");
      }
    }
    else if (state.phase === "round3") {
      if (!state.checkpoint2Complete) {
        state.phase = state.checkpoint1Complete ? "round2" : "round1";
        renderRound(state.phase);
      } else renderRound("round3");
    }
    else if (state.phase === "final") {
      if (!state.checkpoint2Complete) {
        state.phase = state.checkpoint1Complete ? "round2" : "round1";
        renderRound(state.phase);
      } else if (!state.round3Complete) {
        state.phase = "round3";
        renderRound("round3");
      } else renderFinalQuestion();
    }
    else if (state.phase === "review") {
      if (!state.checkpoint2Complete) {
        state.phase = state.checkpoint1Complete ? "round2" : "round1";
        renderRound(state.phase);
      } else if (!state.round3Complete) {
        state.phase = "round3";
        renderRound("round3");
      } else renderReview();
    }
    renderPhaseTrack();
    setSaveIndicator(state.startedAt ? "DRAFT SAVED LOCALLY" : "DRAFT NOT STARTED");
    persistDraft(false);
  }

  function renderAppFinalSafe() {
    state.phase = "final";
    renderFinalQuestion();
  }

  function createPayload(autoSubmitted = false, reason = "submitted") {
    const submittedAt = new Date().toISOString();
    const flatAnswers = buildResponseRows().map((row) => ({
      question_id: row.id,
      phase: row.phase,
      type: "short",
      answer: String(row.answer || "").trim()
    }));
    return {
      case_id: DATA.id,
      team_id: state.teamId,
      answers: flatAnswers,
      anti_cheat_events: state.events.slice(-150),
      anti_cheat_count: state.strikes,
      submission_status: autoSubmitted ? (reason === "time_expired" ? "auto_submitted_time_expired" : "auto_submitted_flagged") : "submitted",
      submission_reason: reason,
      started_at: state.startedAt || submittedAt,
      submitted_at: submittedAt,
      elapsed_seconds: getElapsedSeconds(),
      evidence_files_available: allEvidence().map((item) => item.sourceName)
    };
  }

  function downloadJSON(payload = state.lastPayload || createPayload(false)) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cold-logs-${payload.team_id || "team"}-${payload.case_id || "case"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function finalizeSubmission(autoSubmitted = false, reason = "submitted") {
    if (state.submitted || state.autoSubmitInProgress) return;
    state.autoSubmitInProgress = true;
    addEvent(autoSubmitted ? "auto_submission" : "final_submission", reason);
    const payload = createPayload(autoSubmitted, reason);
    state.lastPayload = payload;
    state.submitted = true;
    window.clearInterval(timerHandle);

    let synced = false;
    let submissionId = null;
    let failureReason = "";
    if (client && state.session?.user?.id) {
      try {
        const result = await client.from("case_submissions").insert({
          user_id: state.session.user.id,
          ...payload
        }).select("id").single();
        if (result.error) failureReason = result.error.message || "Database insert failed";
        else {
          synced = true;
          submissionId = result.data?.id || null;
        }
      } catch (error) {
        failureReason = error?.message || "Network error while uploading";
      }
    } else failureReason = "No authenticated Supabase session is available.";

    try {
      localStorage.setItem(`${draftKey()}:final`, JSON.stringify(payload));
      localStorage.removeItem(draftKey());
    } catch { /* A downloadable backup remains available. */ }
    state.autoSubmitInProgress = false;
    $("startGate").classList.add("hidden");
    closeEvidence();
    renderResult({ synced, submissionId, failureReason, autoSubmitted, payload });
  }

  function renderResult({ synced, submissionId, failureReason, autoSubmitted, payload }) {
    $("activityLabel").textContent = "CASE RESPONSE RECORDED";
    $("activityHost").innerHTML = "";
    $("evidenceHost").innerHTML = "<p class='panel-help'>Investigation submitted. Source files are bundled with the site for organizer review.</p>";
    const result = $("resultPanel");
    result.classList.remove("hidden");
    result.innerHTML = `
      <div class="result-symbol">${synced ? "✓" : "!"}</div>
      <p class="eyebrow">${autoSubmitted ? "TIME-EXPIRED / AUTO-SUBMITTED" : "FINAL REPORT / SUBMISSION"}</p>
      <h2>${synced ? "Investigation received." : "Submission prepared."}</h2>
      <p>${synced ? "The current team investigation record is saved in Supabase for organizer evaluation." : `The database did not confirm the upload (${escapeHTML(failureReason || "unknown error")}). Download the JSON backup and send it to the organizer; the website cannot confirm the upload.`}</p>
      <div class="result-ref">${submissionId ? `SUBMISSION ID / ${escapeHTML(submissionId)}` : synced ? "STATUS / SAVED" : "STATUS / LOCAL BACKUP REQUIRED"}</div>
      <div class="result-actions"><button id="downloadResult" class="secondary-button" type="button">DOWNLOAD SUBMISSION JSON ↓</button><a href="dashboard.html" class="primary-button">RETURN TO CASE DESK <span>↗</span></a></div>`;
    $("downloadResult").addEventListener("click", () => downloadJSON(payload));
    $("submissionPanel").classList.add("hidden");
    $("resultPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch {}
  }

  function recordStrike(type, detail) {
    if (!state.startedAt || state.submitted || state.autoSubmitInProgress || state.timedOut) return;
    state.strikes += 1;
    addEvent(type, detail);
    if (state.strikes === 1) {
      showAlert("A browser focus / clipboard event was recorded. These signals can have false positives and are not proof of cheating.");
    }
    if (state.strikes % 3 === 0) {
      showToast(`${state.strikes} focus/clipboard events recorded. Keep the case in view and follow organizer rules.`, 4800);
    }
    persistDraft();
  }

  function setupDeterrents() {
    const prevent = (event) => {
      event.preventDefault();
      recordStrike(event.type, `${event.type} action prevented by the page`);
    };
    ["copy", "cut", "paste", "contextmenu", "dragstart"].forEach((type) => document.addEventListener(type, prevent));
    document.addEventListener("keydown", (event) => {
      const key = (event.key || "").toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const blocked = modifier && ["c", "x", "v", "p", "s", "u"].includes(key);
      const printScreen = event.key === "PrintScreen";
      if (blocked || printScreen) {
        event.preventDefault();
        recordStrike(printScreen ? "printscreen_key_detected" : "blocked_shortcut", printScreen ? "PrintScreen key observed; OS screenshots cannot be reliably blocked" : `Blocked shortcut: ${event.key}`);
      }
    }, true);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) recordStrike("tab_hidden", "Browser tab moved out of view");
    });
    document.addEventListener("fullscreenchange", () => {
      if (state.startedAt && !state.submitted && !document.fullscreenElement) recordStrike("fullscreen_exit", "Full-screen mode exited");
    });
    window.addEventListener("beforeunload", (event) => {
      if (state.startedAt && !state.submitted && !state.timedOut) {
        event.preventDefault();
        event.returnValue = "Your investigation is not submitted yet.";
      }
    });
  }

  async function beginInvestigation(continueSaved = false) {
    if (!continueSaved) {
      state.startedAt = new Date().toISOString();
      state.phase = "round1";
      state.finalIndex = 0;
      state.checkpointAnswers = {};
      state.completedCheckpoints = [];
      state.round3Complete = false;
      state.finalAnswers = {};
      state.events = [];
      state.strikes = 0;
      state.timedOut = false;
      state.submitted = false;
      addEvent("investigation_started", "Started HS26-IR-014");
      persistDraft();
    }
    $("startGate").classList.add("hidden");
    renderApp();
    startTimer();
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      showToast("Full-screen mode is unavailable in this browser. The investigation can continue.");
    }
  }

  async function init() {
    if (!DATA || !Array.isArray(DATA.rounds) || !Array.isArray(DATA.finalQuestions)) {
      showToast("Case configuration is missing. Refresh after restoring case-data.js.", 7000);
      return;
    }
    if (!client) {
      showAlert("Supabase client did not load. Check your connection and refresh.", 0);
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) {
      window.location.replace("index.html");
      return;
    }

    state.session = data.session;
    state.teamId = teamFromEmail(data.session.user.email);
    $("teamBadge").textContent = state.teamId;
    renderObjectives();
    renderHandbooks();
    loadDraft();
    renderGateCopy();
    $("startCaseBtn").addEventListener("click", () => beginInvestigation(false));
    $("continueCaseBtn").addEventListener("click", () => beginInvestigation(true));
    $("gateOpenBrief").addEventListener("click", () => openEvidence(DATA.handbook.find((item) => item.id === "HANDBOOK-01"), true));
    $("gateOpenQuestions").addEventListener("click", () => openEvidence(DATA.handbook.find((item) => item.id === "HANDBOOK-02"), true));
    $("closeEvidence").addEventListener("click", closeEvidence);
    $("evidenceDialog").addEventListener("click", (event) => {
      if (event.target === $("evidenceDialog")) closeEvidence();
    });
    $("evidenceDialog").addEventListener("cancel", (event) => { event.preventDefault(); closeEvidence(); });
    setupDeterrents();

    if (state.startedAt) {
      $("startGate").classList.remove("hidden");
      $("startCaseBtn").textContent = "RESTART AS A NEW INVESTIGATION";
      $("continueCaseBtn").classList.remove("hidden");
      $("continueCaseBtn").textContent = "CONTINUE SAVED INVESTIGATION";
      if (state.timedOut) {
        $("timerMessage").textContent = "Time limit was reached · saved work is retained";
      }
    }
    updateTimer();
  }

  init();
})();
