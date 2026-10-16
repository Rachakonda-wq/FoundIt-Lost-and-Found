"use strict";

const STORAGE_KEYS = {
  items: "foundit_items_v1",
  profile: "foundit_profile_v1",
  avatar: "foundit_avatar_v1",
  chats: "foundit_chats_v1"
};

const $ = (selector) => document.querySelector(selector);

const pages = {
  home: $("#homePage"),
  report: $("#reportPage"),
  profile: $("#profilePage")
};

let items = readStorage(STORAGE_KEYS.items, []);
let profile = readStorage(STORAGE_KEYS.profile, {
  name: "",
  email: "",
  mobile: "",
  location: ""
});
let avatarData = readStorage(STORAGE_KEYS.avatar, "");
let chats = readStorage(STORAGE_KEYS.chats, {});
let selectedPhoto = "";
let selectedPhotoName = "";
let editingItemId = null;
let activeChatItemId = null;
let toastTimeout = null;

/* STORAGE */

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch (error) {
    console.warn("Could not read saved data:", error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    showToast("Storage is full or unavailable. Try a smaller photo.");
    return false;
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

/* TOAST */

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* PAGE NAVIGATION */

function setActiveNav(page) {
  $("#homeButton").classList.toggle("active", page === "home");
  $("#lostItemsButton").classList.toggle("active", page === "home");
  $("#reportButton").classList.toggle("active", page === "report");
  $("#profileButton").classList.toggle("active", page === "profile");
}

function showPage(pageName, scrollToTop = true) {
  Object.entries(pages).forEach(([name, element]) => {
    element.hidden = name !== pageName;
  });

  setActiveNav(pageName);
  closeMobileMenu();

  if (pageName === "profile") {
    renderProfile();
    renderMyReports();
  }

  if (pageName === "home") {
    renderItems();
  }

  if (scrollToTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function openReportPage() {
  resetReportForm();
  $("#reporterName").value = profile.name || "";
  $("#reporterMobile").value = profile.mobile || "";
  $("#reporterEmail").value = profile.email || "";
  showPage("report");
}

function closeMobileMenu() {
  $("#navLinks")?.classList.remove("open");
  $("#mobileMenuButton").setAttribute("aria-expanded", "false");
}

function toggleMobileMenu() {
  const nav = $(".nav-links");
  const isOpen = nav.classList.toggle("open");
  $("#mobileMenuButton").setAttribute("aria-expanded", String(isOpen));
}

$("#homeLogo").addEventListener("click", (event) => {
  event.preventDefault();
  showPage("home");
});

$("#footerHomeButton").addEventListener("click", (event) => {
  event.preventDefault();
  showPage("home");
});

$("#homeButton").addEventListener("click", () => showPage("home"));

$("#lostItemsButton").addEventListener("click", () => {
  showPage("home", false);
  $("#itemsSection").scrollIntoView({ behavior: "smooth" });
});

$("#reportButton").addEventListener("click", openReportPage);
$("#heroReportButton").addEventListener("click", openReportPage);
$("#sectionReportButton").addEventListener("click", openReportPage);
$("#foundReportButton").addEventListener("click", openReportPage);
$("#emptyReportButton").addEventListener("click", openReportPage);

$("#profileButton").addEventListener("click", () => showPage("profile"));

$("#heroExploreButton").addEventListener("click", () => {
  showPage("home", false);
  $("#itemsSection").scrollIntoView({ behavior: "smooth" });
});

$("#reportBackButton").addEventListener("click", () => showPage("home"));
$("#cancelReportButton").addEventListener("click", () => showPage("home"));
$("#profileBackButton").addEventListener("click", () => showPage("home"));

$("#mobileMenuButton").addEventListener("click", toggleMobileMenu);

/* VALIDATION HELPERS */

function isValidIndianMobile(value) {
  return /^[6-9]\d{9}$/.test(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function setError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);

  if (input) {
    input.classList.toggle("invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }

  if (error) {
    error.textContent = message;
  }

  return !message;
}

function clearFieldError(inputId, errorId) {
  setError(inputId, errorId, "");
}

function validateRequiredText(inputId, errorId, label, minimumLength = 1) {
  const value = document.getElementById(inputId).value.trim();

  if (value.length < minimumLength) {
    return setError(
      inputId,
      errorId,
      `${label} must contain at least ${minimumLength} character(s).`
    );
  }

  return setError(inputId, errorId, "");
}

function validateMobile(inputId, errorId) {
  const value = document.getElementById(inputId).value.trim();

  if (!isValidIndianMobile(value)) {
    return setError(
      inputId,
      errorId,
      "Enter a valid 10-digit Indian mobile number starting with 6–9."
    );
  }

  return setError(inputId, errorId, "");
}

function validateEmail(inputId, errorId) {
  const value = document.getElementById(inputId).value.trim();

  if (!isValidEmail(value)) {
    return setError(inputId, errorId, "Enter a valid email address.");
  }

  return setError(inputId, errorId, "");
}

function validateReportForm() {
  const checks = [
    validateRequiredText("itemTitle", "itemTitleError", "Item name", 2),
    setError(
      "itemCategory",
      "itemCategoryError",
      $("#itemCategory").value ? "" : "Choose an item category."
    ),
    validateRequiredText(
      "itemDescription",
      "itemDescriptionError",
      "Description",
      5
    ),
    validateRequiredText(
      "itemLocation",
      "itemLocationError",
      "Location",
      2
    ),
    setError(
      "itemDate",
      "itemDateError",
      $("#itemDate").value ? "" : "Choose the date."
    ),
    validateRequiredText(
      "reporterName",
      "reporterNameError",
      "Your name",
      2
    ),
    validateMobile("reporterMobile", "reporterMobileError"),
    validateEmail("reporterEmail", "reporterEmailError")
  ];

  if (checks.includes(false)) {
    const firstInvalid = $("#reportForm .invalid");
    firstInvalid?.focus();
    return false;
  }

  return true;
}

/* CLEAR VALIDATION MESSAGES WHILE TYPING */

[
  ["itemTitle", "itemTitleError"],
  ["itemCategory", "itemCategoryError"],
  ["itemDescription", "itemDescriptionError"],
  ["itemLocation", "itemLocationError"],
  ["itemDate", "itemDateError"],
  ["reporterName", "reporterNameError"],
  ["reporterMobile", "reporterMobileError"],
  ["reporterEmail", "reporterEmailError"],
  ["profileName", "profileNameError"],
  ["profileEmail", "profileEmailError"],
  ["profileMobile", "profileMobileError"]
].forEach(([inputId, errorId]) => {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    clearFieldError(inputId, errorId);
  });

  input.addEventListener("change", () => {
    clearFieldError(inputId, errorId);
  });
});

/* MOBILE NUMBER INPUT: ALLOW ONLY 10 DIGITS */

["reporterMobile", "profileMobile"].forEach((id) => {
  const input = document.getElementById(id);

  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 10);
  });
});

/* PHOTO UPLOAD AND PREVIEW */

$("#itemPhoto").addEventListener("change", (event) => {
  const file = event.target.files?.[0];

  selectedPhoto = "";
  selectedPhotoName = "";
  $("#photoPreviewWrap").hidden = true;
  $("#photoPreview").removeAttribute("src");
  $("#photoFileName").textContent = "No image selected";
  setError("itemPhoto", "itemPhotoError", "");

  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    event.target.value = "";
    setError(
      "itemPhoto",
      "itemPhotoError",
      "Choose a JPG, PNG or WEBP image."
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    event.target.value = "";
    setError(
      "itemPhoto",
      "itemPhotoError",
      "The image must be 5 MB or smaller."
    );
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") {
      setError("itemPhoto", "itemPhotoError", "Could not read this image.");
      return;
    }

    selectedPhoto = reader.result;
    selectedPhotoName = file.name;

    $("#photoPreview").src = selectedPhoto;
    $("#photoPreviewWrap").hidden = false;
    $("#photoFileName").textContent = file.name;
  };

  reader.onerror = () => {
    setError("itemPhoto", "itemPhotoError", "Could not read this image.");
  };

  reader.readAsDataURL(file);
});

$("#removePhotoButton").addEventListener("click", () => {
  selectedPhoto = "";
  selectedPhotoName = "";
  $("#itemPhoto").value = "";
  $("#photoPreview").removeAttribute("src");
  $("#photoPreviewWrap").hidden = true;
  $("#photoFileName").textContent = "No image selected";
  setError("itemPhoto", "itemPhotoError", "");
});

function resetReportForm() {
  editingItemId = null;
  $("#reportForm").reset();
  selectedPhoto = "";
  selectedPhotoName = "";
  $("#photoPreview").removeAttribute("src");
  $("#photoPreviewWrap").hidden = true;
  $("#photoFileName").textContent = "No image selected";

  $("#itemDate").max = new Date().toISOString().slice(0, 10);
  $("#itemDate").value = new Date().toISOString().slice(0, 10);

  $("#reportForm").querySelectorAll(".invalid").forEach((input) => {
    input.classList.remove("invalid");
    input.setAttribute("aria-invalid", "false");
  });

  $("#reportForm").querySelectorAll(".field-error").forEach((element) => {
    element.textContent = "";
  });
}

/* EDIT AN EXISTING REPORT */

function editReport(id) {
  const item = items.find((report) => report.id === id);
  if (!item) return;

  if (
    !profile.email ||
    !item.reporterEmail ||
    item.reporterEmail.toLowerCase() !== profile.email.toLowerCase()
  ) {
    showToast("You can only edit your own reports.");
    return;
  }

  editingItemId = item.id;
  $("#itemTitle").value = item.title || "";
  $("#itemStatus").value = item.status || "Lost";
  $("#itemCategory").value = item.category || "";
  $("#itemDescription").value = item.description || "";
  $("#itemLocation").value = item.location || "";
  $("#itemDate").value = item.date || "";
  $("#reporterName").value = item.reporterName || "";
  $("#reporterMobile").value = item.reporterMobile || "";
  $("#reporterEmail").value = item.reporterEmail || "";

  selectedPhoto = item.photo || "";
  selectedPhotoName = item.photoName || "";
  $("#itemPhoto").value = "";

  if (selectedPhoto) {
    $("#photoPreview").src = selectedPhoto;
    $("#photoPreviewWrap").hidden = false;
    $("#photoFileName").textContent =
      selectedPhotoName || "Current image";
  } else {
    $("#photoPreview").removeAttribute("src");
    $("#photoPreviewWrap").hidden = true;
    $("#photoFileName").textContent = "No image selected";
  }

  showPage("report");
  showToast("Edit the details and submit to save your changes.");
}

/* SUBMIT A REPORT */

$("#reportForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateReportForm()) {
    showToast("Please correct the highlighted fields.");
    return;
  }

  const existingItem = items.find((item) => item.id === editingItemId);

  const newItem = {
    id: existingItem ? existingItem.id : makeId(),
    title: $("#itemTitle").value.trim(),
    status: $("#itemStatus").value,
    category: $("#itemCategory").value,
    description: $("#itemDescription").value.trim(),
    location: $("#itemLocation").value.trim(),
    date: $("#itemDate").value,
    photo: selectedPhoto,
    photoName: selectedPhotoName,
    reporterName: $("#reporterName").value.trim(),
    reporterMobile: $("#reporterMobile").value.trim(),
    reporterEmail: $("#reporterEmail").value.trim(),
    createdAt: existingItem
      ? existingItem.createdAt
      : new Date().toISOString()
  };

  const updatedItems = existingItem
    ? items.map((item) =>
        item.id === editingItemId ? newItem : item
      )
    : [newItem, ...items];

  if (!saveStorage(STORAGE_KEYS.items, updatedItems)) {
    showToast("Report could not be saved. Try removing the photo.");
    return;
  }

  items = updatedItems;
  const wasEditing = Boolean(existingItem);

  profile = {
    ...profile,
    name: newItem.reporterName,
    mobile: newItem.reporterMobile,
    email: newItem.reporterEmail
  };

  saveStorage(STORAGE_KEYS.profile, profile);

  resetReportForm();
  renderItems();
  showPage("home");

  $("#itemsSection").scrollIntoView({ behavior: "smooth" });
  showToast(
    wasEditing
      ? "Your report has been updated."
      : "Your report has been published on the Home page."
  );
});

/* SEARCH AND FILTER */

$("#searchInput").addEventListener("input", renderItems);
$("#categoryFilter").addEventListener("change", renderItems);

function getFilteredItems() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;

  return items.filter((item) => {
    const searchable = [
      item.title,
      item.category,
      item.description,
      item.location,
      item.reporterName,
      item.status
    ].join(" ").toLowerCase();

    const matchesQuery = !query || searchable.includes(query);
    const matchesCategory =
      category === "all" || item.category === category;

    return matchesQuery && matchesCategory;
  });
}

/* ITEM CARD RENDERING */

function renderItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "item-image-wrap";

  if (item.photo) {
    const image = document.createElement("img");
    image.className = "item-image";
    image.src = item.photo;
    image.alt = item.title;
    image.loading = "lazy";

    image.onerror = () => {
      image.remove();

      const placeholder = document.createElement("div");
      placeholder.className = "item-image-placeholder";
      placeholder.textContent = "⌕";
      placeholder.setAttribute("aria-label", "No item photo available");
      imageWrap.prepend(placeholder);
    };

    imageWrap.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "item-image-placeholder";
    placeholder.textContent = "⌕";
    placeholder.setAttribute("aria-label", "No item photo available");
    imageWrap.appendChild(placeholder);
  }

  const status = document.createElement("span");
  status.className = `item-status ${(item.status || "reported").toLowerCase()}`;
  status.textContent = item.status || "Reported";
  imageWrap.appendChild(status);

  const content = document.createElement("div");
  content.className = "item-card-content";

  const category = document.createElement("span");
  category.className = "item-category";
  category.textContent = item.category;

  const title = document.createElement("h3");
  title.textContent = item.title;

  const description = document.createElement("p");
  description.className = "item-description";
  description.textContent = item.description;

  const meta = document.createElement("div");
  meta.className = "item-meta";

  const location = document.createElement("span");
  location.textContent = `⌖ ${item.location}`;

  const date = document.createElement("span");
  date.textContent = `◷ ${formatDate(item.date)}`;

  meta.append(location, date);

  const contact = document.createElement("div");
  contact.className = "item-card-contact";

  const reporter = document.createElement("span");
  reporter.className = "reporter-name";
  reporter.textContent = `Reported by ${item.reporterName}`;

  const phone = document.createElement("a");
  phone.className = "reporter-phone";
  phone.href = `tel:${item.reporterMobile}`;
  phone.textContent = `☎ ${item.reporterMobile}`;

  const actions = document.createElement("div");
  actions.className = "item-card-actions";

  const chatButton = document.createElement("button");
  chatButton.type = "button";
  chatButton.className = "button button-green";
  chatButton.textContent = "Chat";
  chatButton.addEventListener("click", () => openChat(item));

  const locationButton = document.createElement("a");
  locationButton.className = "button button-light";
  locationButton.textContent = "View Location";
  locationButton.href =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`;
  locationButton.target = "_blank";
  locationButton.rel = "noopener noreferrer";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "button button-light";
  editButton.textContent = "Edit";

  editButton.hidden = !(
    item.reporterEmail &&
    profile.email &&
    item.reporterEmail.toLowerCase() === profile.email.toLowerCase()
  );

  editButton.addEventListener("click", () => editReport(item.id));

  actions.append(chatButton, locationButton, editButton);
  contact.append(reporter, phone, actions);
  content.append(category, title, description, meta, contact);
  card.append(imageWrap, content);

  return card;
}

function renderItems() {
  const grid = $("#itemsGrid");
  const filteredItems = getFilteredItems();

  grid.replaceChildren();

  filteredItems.forEach((item) => {
    grid.appendChild(renderItemCard(item));
  });

  $("#resultsCount").textContent =
    `${filteredItems.length} ${filteredItems.length === 1 ? "item" : "items"}`;

  $("#emptyState").hidden = filteredItems.length !== 0;
}

function formatDate(dateValue) {
  if (!dateValue) return "Date not provided";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Date not provided";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* PROFILE DISPLAY AND EDITING */

function renderAvatar() {
  const profileAvatar = $("#profileAvatar");
  const navAvatar = $("#navAvatar");
  const initial = (profile.name || "P").trim().charAt(0).toUpperCase();

  profileAvatar.replaceChildren();
  navAvatar.replaceChildren();

  if (avatarData) {
    const profileImage = document.createElement("img");
    profileImage.src = avatarData;
    profileImage.alt = "Profile photo";

    const navImage = document.createElement("img");
    navImage.src = avatarData;
    navImage.alt = "";

    profileAvatar.appendChild(profileImage);
    navAvatar.appendChild(navImage);
  } else {
    profileAvatar.textContent = initial;
    navAvatar.textContent = initial;
  }
}

function renderProfile() {
  $("#profileDisplayName").textContent = profile.name || "Your Name";
  $("#profileDisplayEmail").textContent =
    profile.email || "Add your email address";

  $("#detailName").textContent = profile.name || "Not added";
  $("#detailEmail").textContent = profile.email || "Not added";
  $("#detailMobile").textContent = profile.mobile || "Not added";
  $("#detailLocation").textContent = profile.location || "Not added";

  $("#profileName").value = profile.name || "";
  $("#profileEmail").value = profile.email || "";
  $("#profileMobile").value = profile.mobile || "";
  $("#profileLocation").value = profile.location || "";

  renderAvatar();
}

function openProfileEditor() {
  $("#profileForm").hidden = false;
  $("#profileDetails").hidden = true;
  $("#editProfileButton").hidden = true;

  $("#profileName").value = profile.name || "";
  $("#profileEmail").value = profile.email || "";
  $("#profileMobile").value = profile.mobile || "";
  $("#profileLocation").value = profile.location || "";

  $("#profileName").focus();
}

function closeProfileEditor() {
  $("#profileForm").hidden = true;
  $("#profileDetails").hidden = false;
  $("#editProfileButton").hidden = false;

  $("#profileForm").querySelectorAll(".field-error").forEach((element) => {
    element.textContent = "";
  });

  $("#profileForm").querySelectorAll(".invalid").forEach((input) => {
    input.classList.remove("invalid");
  });
}

$("#editProfileButton").addEventListener("click", openProfileEditor);

$("#cancelProfileButton").addEventListener("click", () => {
  renderProfile();
  closeProfileEditor();
});

$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const validName = validateRequiredText(
    "profileName", "profileNameError", "Name", 2
  );

  const validEmail = validateEmail("profileEmail", "profileEmailError");
  const validMobile = validateMobile("profileMobile", "profileMobileError");

  if (!validName || !validEmail || !validMobile) {
    showToast("Please correct the highlighted profile fields.");
    return;
  }

  const updatedProfile = {
    name: $("#profileName").value.trim(),
    email: $("#profileEmail").value.trim(),
    mobile: $("#profileMobile").value.trim(),
    location: $("#profileLocation").value.trim()
  };

  if (!saveStorage(STORAGE_KEYS.profile, updatedProfile)) return;

  profile = updatedProfile;
  renderProfile();
  closeProfileEditor();
  renderMyReports();

  showToast("Your profile has been saved.");
});

/* PROFILE AVATAR */

function openAvatarPicker() {
  $("#avatarInput").click();
}

$("#profileAvatar").addEventListener("click", openAvatarPicker);
$("#changeAvatarButton").addEventListener("click", openAvatarPicker);

$("#avatarInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    showToast("Choose a JPG, PNG or WEBP image.");
    event.target.value = "";
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    showToast("Profile photo must be 3 MB or smaller.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") {
      showToast("Could not read this photo.");
      return;
    }

    const previousAvatar = avatarData;
    avatarData = reader.result;

    if (!saveStorage(STORAGE_KEYS.avatar, avatarData)) {
      avatarData = previousAvatar;
      return;
    }

    renderAvatar();
    showToast("Profile photo updated.");
  };

  reader.onerror = () => showToast("Could not read this photo.");
  reader.readAsDataURL(file);
});

$("#removeAvatarButton").addEventListener("click", () => {
  avatarData = "";

  try {
    localStorage.removeItem(STORAGE_KEYS.avatar);
  } catch (error) {
    console.warn("Could not remove avatar:", error);
  }

  $("#avatarInput").value = "";
  renderAvatar();
  showToast("Profile photo removed.");
});

/* MY REPORTS */

function renderMyReports() {
  const grid = $("#myReportsGrid");

  const myReports = items.filter((item) =>
    item.reporterEmail &&
    profile.email &&
    item.reporterEmail.toLowerCase() === profile.email.toLowerCase()
  );

  grid.replaceChildren();

  myReports.forEach((item) => {
    grid.appendChild(renderItemCard(item));
  });

  $("#noMyReports").hidden = myReports.length > 0;
}

/* CHAT DEMO */

function getChatKey(itemId) {
  return `item-${itemId}`;
}

function openChat(item) {
  activeChatItemId = item.id;

  $("#chatTitle").textContent = "Message reporter";
  $("#chatItemName").textContent = item.title;

  renderChatMessages();

  $("#chatModal").hidden = false;
  document.body.classList.add("modal-open");
  $("#chatMessageInput").focus();
}

function closeChat() {
  $("#chatModal").hidden = true;
  document.body.classList.remove("modal-open");
  activeChatItemId = null;
}

function renderChatMessages() {
  const container = $("#chatMessages");
  container.replaceChildren();

  if (!activeChatItemId) return;

  const messages = chats[getChatKey(activeChatItemId)] || [];

  if (messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chat-empty";
    empty.textContent =
      "Start a conversation.";
    container.appendChild(empty);
    return;
  }

  messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className =
      `chat-message ${message.sender === "me" ? "mine" : "theirs"}`;
    bubble.textContent = message.text;
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

$("#closeChatButton").addEventListener("click", closeChat);

$("#chatModal").addEventListener("click", (event) => {
  if (event.target === $("#chatModal")) {
    closeChat();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#chatModal").hidden) {
    closeChat();
  }
});

$("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const text = $("#chatMessageInput").value.trim();
  if (!text || !activeChatItemId) return;

  const key = getChatKey(activeChatItemId);
  const previousMessages = chats[key] || [];

  const updatedChats = {
    ...chats,
    [key]: [
      ...previousMessages,
      {
        id: makeId(),
        sender: "me",
        text,
        createdAt: new Date().toISOString()
      }
    ]
  };

  if (!saveStorage(STORAGE_KEYS.chats, updatedChats)) return;

  chats = updatedChats;
  $("#chatMessageInput").value = "";
  renderChatMessages();
});

/* INITIAL SETUP */

function initialise() {
  $("#itemDate").max = new Date().toISOString().slice(0, 10);
  $("#itemDate").value = new Date().toISOString().slice(0, 10);

  renderItems();
  renderProfile();
  renderMyReports();

  showPage("home", false);
}

initialise();