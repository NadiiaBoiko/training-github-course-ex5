document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIconButton = document.getElementById("user-icon-button");
  const userDropdown = document.getElementById("user-dropdown");
  const authButton = document.getElementById("auth-button");
  const authStatus = document.getElementById("auth-status");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginCancel = document.getElementById("login-cancel");
  const signupHelpText = document.getElementById("signup-help-text");

  let adminToken = sessionStorage.getItem("adminToken") || "";
  let adminUsername = sessionStorage.getItem("adminUsername") || "";

  function setMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAdminUI() {
    const isLoggedIn = Boolean(adminToken);

    authButton.textContent = isLoggedIn ? "Logout" : "Teacher Login";
    authStatus.textContent = isLoggedIn
      ? `Logged in as teacher: ${adminUsername}`
      : "Viewing as student";

    signupForm.querySelectorAll("input, select, button[type='submit']").forEach((element) => {
      element.disabled = !isLoggedIn;
    });

    signupHelpText.textContent = isLoggedIn
      ? "You can register or unregister students from activity cards."
      : "Teacher login is required to register or unregister students.";
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${adminToken ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      updateAdminUI();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userIconButton.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  authButton.addEventListener("click", () => {
    if (adminToken) {
      adminToken = "";
      adminUsername = "";
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminUsername");
      updateAdminUI();
      fetchActivities();
      userDropdown.classList.add("hidden");
      setMessage("Logged out successfully", "info");
      return;
    }

    loginModal.classList.remove("hidden");
    userDropdown.classList.add("hidden");
  });

  loginCancel.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        setMessage(result.detail || "Login failed", "error");
        return;
      }

      adminToken = result.token;
      adminUsername = result.username;
      sessionStorage.setItem("adminToken", adminToken);
      sessionStorage.setItem("adminUsername", adminUsername);

      updateAdminUI();
      loginModal.classList.add("hidden");
      loginForm.reset();
      fetchActivities();
      setMessage(`Welcome, ${adminUsername}`, "success");
    } catch (error) {
      setMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  document.addEventListener("click", (event) => {
    if (!userDropdown.contains(event.target) && event.target !== userIconButton) {
      userDropdown.classList.add("hidden");
    }
  });

  // Initialize app
  updateAdminUI();
  fetchActivities();
});
