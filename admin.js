(() => {
  const client = window.coldLogsSupabase;
  const $ = (id) => document.getElementById(id);
  const state = { submissions: [], events: [], view: "overview" };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);

  const dateText = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  };
  const elapsedText = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "—";
    const m = Math.floor(n / 60);
    return `${m}m ${Math.floor(n % 60)}s`;
  };
  const statusClass = (s) => /timeout|auto|flag|error/i.test(String(s || "")) ? "warn" :
    /submitted|complete|success/i.test(String(s || "")) ? "good" : "";
  const statusPill = (s) => `<span class="status-pill ${statusClass(s)}">${escapeHtml(s || "unknown")}</span>`;

  function alertUser(message, isError = false) {
    const box = $("pageAlert");
    box.textContent = message;
    box.classList.toggle("error", isError);
    box.classList.remove("hidden");
  }
  function clearAlert() { $("pageAlert").classList.add("hidden"); }

  async function authorize() {
    if (!client) throw new Error("Supabase client failed to load.");
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      window.location.replace("admin-login.html");
      return false;
    }
    const { data: admin, error: adminError } = await client
      .from("cold_logs_admins").select("user_id").eq("user_id", data.session.user.id).maybeSingle();
    if (adminError || !admin) {
      await client.auth.signOut();
      window.location.replace("admin-login.html");
      return false;
    }
    return true;
  }

  async function loadData() {
    clearAlert();
    $("refreshButton").disabled = true;
    $("lastUpdated").textContent = "Refreshing…";
    try {
      // RLS must authorize this query only for admins; do not remove database policies.
      const { data, error } = await client.from("case_submissions")
        .select("id,user_id,team_id,case_id,answers,anti_cheat_events,anti_cheat_count,submission_status,submission_reason,started_at,submitted_at,created_at,elapsed_seconds,evidence_files_available")
        .order("submitted_at", { ascending: false }).limit(5000);
      if (error) throw error;
      state.submissions = data || [];
      state.events = state.submissions.flatMap((row) => {
        const raw = Array.isArray(row.anti_cheat_events) ? row.anti_cheat_events : [];
        return raw.map((event, index) => ({
          row, event: event && typeof event === "object" ? event : { detail: event }, index
        }));
      });
      renderAll();
      $("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      console.error(error);
      alertUser(`Could not load admin data: ${error.message || "Unknown error"}. Check the SQL migration and admin authorization.`, true);
      $("lastUpdated").textContent = "Update failed";
    } finally {
      $("refreshButton").disabled = false;
    }
  }

  function renderAll() {
    const rows = state.submissions;
    const teams = [...new Set(rows.map(r => r.team_id).filter(Boolean))];
    const cases = [...new Set(rows.map(r => r.case_id).filter(Boolean))];
    const flags = rows.reduce((sum, r) => sum + Math.max(Number(r.anti_cheat_count) || 0,
      Array.isArray(r.anti_cheat_events) ? r.anti_cheat_events.length : 0), 0);
    $("metricTeams").textContent = teams.length.toLocaleString();
    $("metricSubmissions").textContent = rows.length.toLocaleString();
    $("metricFlags").textContent = flags.toLocaleString();
    $("metricCases").textContent = cases.length.toLocaleString();

    $("recentRows").innerHTML = rows.slice(0, 8).map(r => `<tr>
      <td>${escapeHtml(r.team_id)}</td><td>${escapeHtml(r.case_id)}</td>
      <td>${statusPill(r.submission_status || r.submission_reason)}</td><td>${escapeHtml(dateText(r.submitted_at))}</td>
    </tr>`).join("") || emptyRow(4, "No submissions found.");
    const counts = rows.reduce((acc, r) => {
      const key = r.submission_status || r.submission_reason || "unknown";
      acc[key] = (acc[key] || 0) + 1; return acc;
    }, {});
    const max = Math.max(1, ...Object.values(counts));
    $("statusSummary").innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,count]) =>
      `<div><div class="summary-row"><span>${escapeHtml(label)}</span><strong>${count}</strong></div><div class="bar"><span style="width:${Math.round(count/max*100)}%"></span></div></div>`
    ).join("") || `<p class="muted">No status data yet.</p>`;
    renderTeams();
    renderSubmissions();
    renderEvents();
  }

  function emptyRow(cols, message) {
    return `<tr><td colspan="${cols}" class="empty-cell">${escapeHtml(message)}</td></tr>`;
  }

  function teamSummaries() {
    const map = new Map();
    for (const r of state.submissions) {
      if (!r.team_id) continue;
      if (!map.has(r.team_id)) map.set(r.team_id, { team: r.team_id, submissions: 0, cases: new Set(), latest: null, flags: 0 });
      const t = map.get(r.team_id);
      t.submissions++;
      if (r.case_id) t.cases.add(r.case_id);
      if (!t.latest || new Date(r.submitted_at) > new Date(t.latest)) t.latest = r.submitted_at;
      t.flags += Math.max(Number(r.anti_cheat_count) || 0, Array.isArray(r.anti_cheat_events) ? r.anti_cheat_events.length : 0);
    }
    return [...map.values()].sort((a,b)=>String(a.team).localeCompare(String(b.team)));
  }

  function renderTeams() {
    const q = ($("teamSearch").value || "").trim().toLowerCase();
    const teams = teamSummaries().filter(t => t.team.toLowerCase().includes(q));
    $("teamCount").textContent = `${teams.length} team(s)`;
    $("teamRows").innerHTML = teams.map(t => `<tr><td><strong>${escapeHtml(t.team)}</strong></td>
      <td>${t.submissions}</td><td>${t.cases.size}</td><td>${escapeHtml(dateText(t.latest))}</td>
      <td>${t.flags ? `<span class="status-pill warn">${t.flags}</span>` : "0"}</td></tr>`
    ).join("") || emptyRow(5, "No matching teams. Teams appear after their first submission.");
  }

  function renderSubmissions() {
    const q = ($("submissionSearch").value || "").trim().toLowerCase();
    const status = $("statusFilter").value;
    const rows = state.submissions.filter(r => {
      const searchable = [r.team_id,r.case_id,r.submission_status,r.submission_reason].join(" ").toLowerCase();
      return searchable.includes(q) && (!status || String(r.submission_status || "").toLowerCase() === status);
    });
    $("submissionRows").innerHTML = rows.map(r => `<tr>
      <td>${escapeHtml(r.team_id)}</td><td>${escapeHtml(r.case_id)}</td>
      <td>${statusPill(r.submission_status || r.submission_reason)}<div class="muted small">${escapeHtml(r.submission_reason || "")}</div></td>
      <td>${escapeHtml(elapsedText(r.elapsed_seconds))}</td><td>${Number(r.anti_cheat_count) || 0}</td>
      <td>${escapeHtml(dateText(r.submitted_at))}</td><td><button class="table-action" data-detail="${escapeHtml(r.id)}">Details</button></td>
    </tr>`).join("") || emptyRow(7, "No matching submissions.");
  }

  function eventType(event) {
    return event.type || event.event || event.name || event.action || "recorded event";
  }
  function renderEvents() {
    const q = ($("monitorSearch").value || "").trim().toLowerCase();
    const events = state.events.filter(({row,event}) =>
      [row.team_id,row.case_id,eventType(event),JSON.stringify(event)].join(" ").toLowerCase().includes(q));
    $("monitorRows").innerHTML = events.map(({row,event,index}) => {
      const time = event.timestamp || event.created_at || event.time || row.submitted_at;
      return `<tr><td>${escapeHtml(dateText(time))}</td><td>${escapeHtml(row.team_id)}</td>
        <td>${escapeHtml(row.case_id)}</td><td>${escapeHtml(eventType(event))}</td>
        <td class="event-detail">${escapeHtml(JSON.stringify(event))}</td></tr>`;
    }).join("") || emptyRow(5, "No matching monitoring events.");
  }

  function showDetails(id) {
    const row = state.submissions.find(r => r.id === id);
    if (!row) return;
    $("dialogTitle").textContent = `${row.team_id || "Team"} · ${row.case_id || "Case"}`;
    const blocks = [
      ["Submission metadata", { id: row.id, team_id: row.team_id, case_id: row.case_id, user_id: row.user_id,
        status: row.submission_status, reason: row.submission_reason, started_at: row.started_at,
        submitted_at: row.submitted_at, elapsed_seconds: row.elapsed_seconds }],
      ["Answers", row.answers],
      ["Monitoring events", row.anti_cheat_events],
      ["Evidence file references", row.evidence_files_available]
    ];
    $("submissionDetail").innerHTML = blocks.map(([title,value]) =>
      `<section class="detail-block"><h3>${escapeHtml(title)}</h3><pre>${escapeHtml(JSON.stringify(value ?? null,null,2))}</pre></section>`
    ).join("");
    $("submissionDialog").showModal();
  }

  function csvCell(value) {
    const str = typeof value === "string" ? value : JSON.stringify(value ?? "");
    // Guard against spreadsheet formula injection.
    const safe = /^[\s]*[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
  }
  function downloadCsv(name, rows, columns) {
    const csv = [columns.map(c => csvCell(c.label)).join(","), ...rows.map(row =>
      columns.map(c => csvCell(c.value(row))).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  const submissionColumns = [
    {label:"ID",value:r=>r.id},{label:"Team ID",value:r=>r.team_id},{label:"User ID",value:r=>r.user_id},
    {label:"Case ID",value:r=>r.case_id},{label:"Status",value:r=>r.submission_status},
    {label:"Reason",value:r=>r.submission_reason},{label:"Started At",value:r=>r.started_at},
    {label:"Submitted At",value:r=>r.submitted_at},{label:"Elapsed Seconds",value:r=>r.elapsed_seconds},
    {label:"Anti-cheat Count",value:r=>r.anti_cheat_count},{label:"Answers JSON",value:r=>r.answers},
    {label:"Anti-cheat Events JSON",value:r=>r.anti_cheat_events}
  ];
  function exportData(kind) {
    if (kind === "teams") {
      const cols = [{label:"Team ID",value:r=>r.team},{label:"Submission Count",value:r=>r.submissions},
        {label:"Distinct Cases",value:r=>r.cases.size},{label:"Last Activity",value:r=>r.latest},{label:"Flagged Events",value:r=>r.flags}];
      return downloadCsv("cold-logs-teams.csv", teamSummaries(), cols);
    }
    if (kind === "monitoring") {
      const rows = state.events.map(({row,event}) => ({team_id:row.team_id,case_id:row.case_id,
        timestamp:event.timestamp || event.created_at || event.time || row.submitted_at,
        type:eventType(event),details:JSON.stringify(event)}));
      return downloadCsv("cold-logs-monitoring.csv", rows, [
        {label:"Timestamp",value:r=>r.timestamp},{label:"Team ID",value:r=>r.team_id},
        {label:"Case ID",value:r=>r.case_id},{label:"Event Type",value:r=>r.type},{label:"Details JSON",value:r=>r.details}
      ]);
    }
    downloadCsv("cold-logs-submissions.csv", state.submissions, submissionColumns);
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("hidden", el.id !== `view-${view}`));
    document.querySelectorAll(".nav-item[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    $("pageTitle").textContent = ({overview:"Overview",teams:"Teams",submissions:"Submissions",monitoring:"Monitoring"})[view] || "Overview";
  }

  document.querySelectorAll(".nav-item[data-view]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.goto)));
  document.querySelectorAll("[data-export]").forEach(btn => btn.addEventListener("click", () => exportData(btn.dataset.export)));
  $("exportButton").addEventListener("click", () => exportData(state.view === "teams" ? "teams" : state.view === "monitoring" ? "monitoring" : "submissions"));
  $("refreshButton").addEventListener("click", loadData);
  $("teamSearch").addEventListener("input", renderTeams);
  $("submissionSearch").addEventListener("input", renderSubmissions);
  $("statusFilter").addEventListener("change", renderSubmissions);
  $("monitorSearch").addEventListener("input", renderEvents);
  $("submissionRows").addEventListener("click", event => {
    const button = event.target.closest("[data-detail]");
    if (button) showDetails(button.dataset.detail);
  });
  $("closeDialog").addEventListener("click", () => $("submissionDialog").close());
  $("signOutButton").addEventListener("click", async () => {
    await client.auth.signOut();
    window.location.replace("admin-login.html");
  });

  (async () => {
    try {
      const ok = await authorize();
      if (ok) await loadData();
    } catch (error) {
      console.error(error);
      alertUser(error.message || "Authorization failed.", true);
    }
  })();
})();
