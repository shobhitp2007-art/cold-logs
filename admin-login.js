(() => {
  const client = window.coldLogsSupabase;
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("loginMessage");
  const button = document.getElementById("loginButton");

  function say(text, kind = "") {
    message.textContent = text;
    message.className = `message ${kind}`.trim();
  }

  document.getElementById("togglePassword").addEventListener("click", (event) => {
    const input = document.getElementById("password");
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    event.currentTarget.textContent = visible ? "Hide" : "Show";
  });

  async function checkAdmin(session) {
    if (!client || !session?.user) return false;
    const { data, error } = await client
      .from("cold_logs_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    return !error && !!data;
  }

  (async () => {
    if (!client) return say("Supabase failed to load. Refresh and try again.", "error");
    const { data } = await client.auth.getSession();
    if (data.session && await checkAdmin(data.session)) {
      window.location.replace("admin.html");
    }
  })();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return say("Supabase failed to load. Check supabase-config.js.", "error");
    button.disabled = true;
    button.textContent = "Verifying…";
    say("");

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      button.disabled = false;
      button.textContent = "Authenticate";
      return say("Sign-in failed. Check your organizer credentials.", "error");
    }

    const allowed = await checkAdmin(data.session);
    if (!allowed) {
      await client.auth.signOut();
      button.disabled = false;
      button.textContent = "Authenticate";
      return say("This account is not authorized as an administrator.", "error");
    }

    window.location.replace("admin.html");
  });
})();
