(() => {
  const client = window.coldLogsSupabase;
  const $ = (id) => document.getElementById(id);
  const alertBox = $("pageAlert");
  let alertTimer;
  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.remove("hidden");
    window.clearTimeout(alertTimer);
    alertTimer = window.setTimeout(() => alertBox.classList.add("hidden"), 4000);
  }
  function teamFromEmail(email) {
    return ((email || "INVESTIGATOR").split("@")[0] || "INVESTIGATOR").toUpperCase();
  }
  async function init() {
    if (!client) {
      showAlert("Supabase client failed to load. Check your connection and refresh.");
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) {
      window.location.replace("index.html");
      return;
    }
    const team = teamFromEmail(data.session.user.email);
    $("teamName").textContent = team;
    $("teamIdText").textContent = team;
  }
  $("logoutBtn").addEventListener("click", async () => {
    if (client) await client.auth.signOut();
    window.location.replace("index.html");
  });
  init();
})();
