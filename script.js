const loginForm = document.getElementById("loginForm");
const teamIdInput = document.getElementById("teamId");
const passwordInput = document.getElementById("password");
const rememberTeam = document.getElementById("rememberTeam");
const togglePassword = document.getElementById("togglePassword");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");
const teamError = document.getElementById("teamError");
const passwordError = document.getElementById("passwordError");
const loginCard = document.getElementById("loginCard");
const cursorGlow = document.getElementById("cursorGlow");

const buttonText = submitButton.querySelector(".button-text");
const buttonArrow = submitButton.querySelector(".button-arrow");

// ============================================
// Supabase configuration
// ============================================

// Use your actual Project URL and publishable key.
// Never put the Supabase secret key in frontend code.
const SUPABASE_URL =
  "https://ousyndkafoqocaahymhh.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_xamCGicmmxPHNGCISPQ__w_gzuOqDqD";

const supabaseClient = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;

// ============================================
// Message helpers
// ============================================

function clearMessage() {
  formMessage.textContent = "";
  formMessage.classList.remove("error");
}

function showError(message) {
  formMessage.textContent = message;
  formMessage.classList.add("error");
}

function resetButton() {
  submitButton.disabled = false;
  buttonText.textContent = "INITIALIZE ACCESS";
  buttonArrow.textContent = "↗";
}

// ============================================
// Restore remembered Team ID
// ============================================

try {
  const savedTeam = localStorage.getItem("coldlogs-team-id");

  if (savedTeam) {
    teamIdInput.value = savedTeam;
    rememberTeam.checked = true;
  }
} catch {
  // Storage may be unavailable in private browsing.
}

// ============================================
// Clear field errors while typing
// ============================================

teamIdInput.addEventListener("input", () => {
  teamError.textContent = "";
  clearMessage();
});

passwordInput.addEventListener("input", () => {
  passwordError.textContent = "";
  clearMessage();
});

// ============================================
// Show / hide password
// ============================================

togglePassword.addEventListener("click", () => {
  const show = passwordInput.type === "password";

  passwordInput.type = show ? "text" : "password";
  togglePassword.textContent = show ? "HIDE" : "SHOW";

  togglePassword.setAttribute(
    "aria-pressed",
    String(show)
  );

  togglePassword.setAttribute(
    "aria-label",
    show ? "Hide password" : "Show password"
  );
});

// ============================================
// Login using real Supabase Auth
// ============================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearMessage();
  teamError.textContent = "";
  passwordError.textContent = "";

  const teamId = teamIdInput.value.trim().toUpperCase();
  const password = passwordInput.value;

  // Validate required fields.
  if (!teamId) {
    teamError.textContent = "Enter your registered team ID.";
  }

  if (!password) {
    passwordError.textContent = "Enter your access password.";
  }

  if (!teamId || !password) {
    showError("Both fields are required.");
    return;
  }

  // Expected format: TEAM-001 through TEAM-040.
  if (!/^TEAM-\d{3}$/.test(teamId)) {
    showError("Invalid team ID format.");
    return;
  }

  if (!supabaseClient) {
    showError(
      "Supabase failed to load. Refresh the page and try again."
    );
    return;
  }

  // Show loading state.
  submitButton.disabled = true;
  buttonText.textContent = "VERIFYING ACCESS...";
  buttonArrow.textContent = "◌";

  try {
    // Match the email format used by create-teams.js.
    const email =
      `${teamId.toLowerCase()}@coldlogs.event`;

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error || !data.user) {
  console.error("Supabase login failed:", {
    message: error?.message,
    status: error?.status,
    code: error?.code
  });

  showError(
    "ACCESS DENIED // Verify your credentials."
  );

  resetButton();
  return;
}

    // Remember only the Team ID, never the password.
    try {
      if (rememberTeam.checked) {
        localStorage.setItem("coldlogs-team-id", teamId);
      } else {
        localStorage.removeItem("coldlogs-team-id");
      }
    } catch {
      // Login can still work without local storage.
    }

    buttonText.textContent = "ACCESS GRANTED";
    buttonArrow.textContent = "✓";

    formMessage.classList.remove("error");
    formMessage.textContent =
      "Identity verified. Entering the investigation room...";

    // Navigate after successful authentication.
    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);

  } catch (error) {
    console.error("Login error:", error);

    showError(
      "Connection error. Check your connection and try again."
    );

    resetButton();
  }
});

// ============================================
// Pointer-responsive lighting effects
// ============================================

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

const finePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)"
);

if (
  !reduceMotion.matches &&
  finePointer.matches &&
  cursorGlow &&
  loginCard
) {
  let pointerFrame = null;

  window.addEventListener(
    "pointermove",
    (event) => {
      if (pointerFrame) {
        cancelAnimationFrame(pointerFrame);
      }

      pointerFrame = requestAnimationFrame(() => {
        cursorGlow.style.opacity = "1";
        cursorGlow.style.left =
          `${event.clientX - 185}px`;
        cursorGlow.style.top =
          `${event.clientY - 185}px`;
      });
    },
    { passive: true }
  );

  loginCard.addEventListener("pointermove", (event) => {
    const rect = loginCard.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) * 100;

    const y =
      ((event.clientY - rect.top) / rect.height) * 100;

    loginCard.style.setProperty("--mx", `${x}%`);
    loginCard.style.setProperty("--my", `${y}%`);
  });

  loginCard.addEventListener("pointerleave", () => {
    loginCard.style.setProperty("--mx", "50%");
    loginCard.style.setProperty("--my", "30%");
  });
}