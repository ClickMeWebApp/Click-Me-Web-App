// --- Global Variables and Constants ---
const AD_DURATION = 15; // seconds
const DAILY_AD_LIMIT = 20;
const COOLDOWN_DURATION = 5; // seconds
const BEEP_SOUND_URL = 'sounds/beep.wav'; // Make sure you have a 'sounds' folder with beep.wav
const AD_URL = 'https://www.profitableratecpm.com/wt3cf24rv?key=20dc1dbba749e453add6a9fa9003303e';

// New: Reset delay duration (3 minutes)
const RESET_DELAY_DURATION = 3 * 60; // 3 minutes in seconds

let timerInterval;
let cooldownInterval;
let currentAdTime = AD_DURATION;
let isAdPlaying = false;
let beepSound;
let dateTimeInterval;
let isVpnDetected = false; // Flag to track VPN detection
let resetDelayInterval; // New: Global variable for the reset countdown interval


// --- DOM Elements ---
const userIdSpan = document.getElementById('userId');
const userNameSpan = document.getElementById('userName');
const totalAdsViewedSpan = document.getElementById('totalAdsViewed');
const dailyAdCountSpan = document.getElementById('dailyAdCount');
const maxDailyAdsSpan = document.getElementById('maxDailyAds');
const timerSpan = document.getElementById('timer');
const progressBar = document.getElementById('progressBar');
const viewAdBtn = document.getElementById('viewAdBtn');
const closeAppBtn = document.getElementById('closeAppBtn');
const adDisplay = document.getElementById('adDisplay');
const timerContainer = document.getElementById('timerContainer');
const statusMessageDiv = document.getElementById('statusMessage');
const cooldownMessageDiv = document.getElementById('cooldownMessage');
const cooldownTimerSpan = document.getElementById('cooldownTimer');
const themeToggle = document.getElementById('themeToggle');
const currentDateSpan = document.getElementById('currentDate');
const currentTimeSpan = document.getElementById('currentTime');
const successPopup = document.getElementById('successPopup');
const noAdsPopup = document.getElementById('noAdsPopup');
const noInternetPopup = document.getElementById('noInternetPopup');
const vpnWarningPopup = document.getElementById('vpnWarningPopup');
const resetAllDataBtn = document.getElementById('resetAllDataBtn');

// New: DOM elements for reset countdown
const resetCountdownMessageDiv = document.getElementById('resetCountdownMessage');
const resetCountdownTimerSpan = document.getElementById('resetCountdownTimer');


// --- Local Storage Keys ---
const LS_TOTAL_ADS_VIEWED = 'totalAdsViewed';
const LS_DAILY_AD_COUNT = 'dailyAdCount';
const LS_LAST_AD_VIEW_DATE = 'lastAdViewDate';
const LS_LAST_AD_VIEW_TIMESTAMP = 'lastAdViewTimestamp';
const LS_THEME = 'appTheme';
const LS_LAST_RESET_TIMESTAMP = 'lastResetTimestamp'; // New: For reset cooldown


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTelegramWebApp();
    loadTheme();
    loadAdData();
    updateDateTime();
    checkDailyLimitAndCooldown();
    // checkResetCooldown(); // Removed: Reset cooldown is now a delay within reset function
    
    // Add event listeners
    viewAdBtn.addEventListener('click', handleViewAd);
    // closeAppBtn.addEventListener('click', handleCloseApp); // Close app button is not in index.html
    themeToggle.addEventListener('change', toggleTheme);
    resetAllDataBtn.addEventListener('click', handleResetAllData);
});

// --- Telegram Web App Integration ---
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            userNameSpan.textContent = user.first_name || 'Guest';
            userIdSpan.textContent = user.id || 'N/A';
        } else {
            userNameSpan.textContent = 'Guest';
            userIdSpan.textContent = 'N/A';
        }
    } else {
        console.warn("Telegram Web App SDK not found.");
        userNameSpan.textContent = 'Guest (SDK Not Found)';
        userIdSpan.textContent = 'N/A';
    }
}

// --- Theme Management ---
function loadTheme() {
    const savedTheme = localStorage.getItem(LS_THEME);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
}

function toggleTheme() {
    if (themeToggle.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem(LS_THEME, 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem(LS_THEME, 'light');
    }
}

// --- Date and Time ---
function updateDateTime() {
    const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    
    // Get current time in Sri Lanka (Asia/Colombo)
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { ...optionsDate, timeZone: 'Asia/Colombo' });
    const formattedTime = now.toLocaleTimeString('en-US', { ...optionsTime, timeZone: 'Asia/Colombo' });

    currentDateSpan.textContent = formattedDate;
    currentTimeSpan.textContent = formattedTime;
}

// Update date and time every second
dateTimeInterval = setInterval(updateDateTime, 1000);


// --- Ad Data Loading and Saving ---
function loadAdData() {
    const today = new Date().toLocaleDateString();
    const lastAdViewDate = localStorage.getItem(LS_LAST_AD_VIEW_DATE);

    let totalAds = parseInt(localStorage.getItem(LS_TOTAL_ADS_VIEWED)) || 0;
    let dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;

    if (lastAdViewDate !== today) {
        dailyCount = 0; // Reset daily count for a new day
        localStorage.setItem(LS_LAST_AD_VIEW_DATE, today);
    }

    totalAdsViewedSpan.textContent = totalAds;
    dailyAdCountSpan.textContent = dailyCount;
    maxDailyAdsSpan.textContent = DAILY_AD_LIMIT;
}

function saveAdData(totalAds, dailyCount) {
    localStorage.setItem(LS_TOTAL_ADS_VIEWED, totalAds);
    localStorage.setItem(LS_DAILY_AD_COUNT, dailyCount);
    localStorage.setItem(LS_LAST_AD_VIEW_DATE, new Date().toLocaleDateString());
    localStorage.setItem(LS_LAST_AD_VIEW_TIMESTAMP, Date.now());
    loadAdData(); // Update UI
}

// --- Ad Viewing Logic ---
function handleViewAd() {
    if (isAdPlaying) return; // Prevent multiple clicks during ad playback

    // Check internet connection
    if (!navigator.onLine) {
        showPopup(noInternetPopup, 3000); // Show for 3 seconds
        return;
    }

    // Check for VPN/Proxy (simple check, not foolproof)
    // This is a basic example and might not be accurate for all cases
    checkVpnProxy().then(isVpn => {
        isVpnDetected = isVpn;
        if (isVpnDetected) {
            showPopup(vpnWarningPopup, 5000); // Show for 5 seconds
            return;
        }

        let dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;

        if (dailyCount >= DAILY_AD_LIMIT) {
            showPopup(noAdsPopup, 3000); // Show for 3 seconds
            return;
        }

        // Check cooldown
        const lastAdViewTimestamp = parseInt(localStorage.getItem(LS_LAST_AD_VIEW_TIMESTAMP)) || 0;
        const timeSinceLastAd = (Date.now() - lastAdViewTimestamp) / 1000; // in seconds

        if (timeSinceLastAd < COOLDOWN_DURATION) {
            updateCooldownMessage();
            return;
        }

        startAdPlayback();
    });
}

function startAdPlayback() {
    isAdPlaying = true;
    viewAdBtn.disabled = true;
    adDisplay.innerHTML = `<iframe src="${AD_URL}" frameborder="0" allowfullscreen></iframe>`; // Embed ad content
    timerContainer.style.display = 'block';
    statusMessageDiv.style.display = 'block';
    statusMessageDiv.textContent = 'Viewing ad...';
    progressBar.style.width = '0%';
    currentAdTime = AD_DURATION;
    timerSpan.textContent = currentAdTime;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        currentAdTime--;
        timerSpan.textContent = currentAdTime;
        const progress = ((AD_DURATION - currentAdTime) / AD_DURATION) * 100;
        progressBar.style.width = `${progress}%`;

        if (currentAdTime <= 0) {
            clearInterval(timerInterval);
            adViewedSuccessfully();
        }
    }, 1000);
}

function adViewedSuccessfully() {
    isAdPlaying = false;
    adDisplay.innerHTML = `<p>Click 'View Ad' to start.</p>`;
    timerContainer.style.display = 'none';
    statusMessageDiv.style.display = 'none';

    let totalAds = parseInt(localStorage.getItem(LS_TOTAL_ADS_VIEWED)) || 0;
    let dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;

    totalAds++;
    dailyCount++;
    saveAdData(totalAds, dailyCount);

    if (beepSound) {
        beepSound.play().catch(e => console.error("Error playing sound:", e));
    }
    if (window.Telegram && window.Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
        Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }

    showPopup(successPopup, 2000); // Show for 2 seconds

    // Start cooldown
    startCooldown();
}

// --- Cooldown Logic ---
function startCooldown() {
    let remainingCooldown = COOLDOWN_DURATION;
    cooldownMessageDiv.style.display = 'block';
    viewAdBtn.disabled = true;

    clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
        remainingCooldown--;
        cooldownTimerSpan.textContent = remainingCooldown;

        if (remainingCooldown <= 0) {
            clearInterval(cooldownInterval);
            cooldownMessageDiv.style.display = 'none';
            checkDailyLimitAndCooldown(); // Re-enable if limit not reached
        }
    }, 1000);
}

function checkDailyLimitAndCooldown() {
    const dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;
    const lastAdViewTimestamp = parseInt(localStorage.getItem(LS_LAST_AD_VIEW_TIMESTAMP)) || 0;
    const timeSinceLastAd = (Date.now() - lastAdViewTimestamp) / 1000;

    if (dailyCount >= DAILY_AD_LIMIT) {
        viewAdBtn.disabled = true;
        cooldownMessageDiv.style.display = 'none'; // Hide cooldown if limit reached
        statusMessageDiv.style.display = 'block';
        statusMessageDiv.textContent = 'Daily ad limit reached!';
        return;
    }

    if (timeSinceLastAd < COOLDOWN_DURATION) {
        startCooldown(); // Resume cooldown if page was reloaded during cooldown
    } else {
        viewAdBtn.disabled = false;
        cooldownMessageDiv.style.display = 'none';
        statusMessageDiv.style.display = 'none';
    }
}

// --- VPN/Proxy Detection (Basic Example) ---
async function checkVpnProxy() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const ipAddress = data.ip;

        // This is a placeholder for a real VPN detection service
        // For production, you'd integrate with a dedicated IP intelligence API
        const vpnCheckResponse = await fetch(`https://vpnapi.io/api/${ipAddress}?key=YOUR_VPN_API_KEY`); // Replace with actual API and key
        const vpnCheckData = await vpnCheckResponse.json();

        return vpnCheckData.security.vpn || vpnCheckData.security.proxy;
    } catch (error) {
        console.error("Error checking VPN/Proxy:", error);
        // If there's an error, assume no VPN for now to allow app to function
        return false;
    }
}


// --- Popup Management ---
function showPopup(popupElement, duration, message = null) {
    // Default text for successPopup if no specific message is provided
    if (popupElement === successPopup && message === null) {
        popupElement.querySelector('.popup-content').innerHTML = `<span class="checkmark"> </span> Ad Viewed Successfully!`;
    } else if (message !== null) {
        // For other popups or if a specific message is provided for successPopup
        const popupContent = popupElement.querySelector('.popup-content');
        if (popupContent) {
            // If it's the success popup, retain the checkmark
            if (popupElement === successPopup) {
                popupContent.innerHTML = `<span class="checkmark"> </span> ${message}`;
            } else {
                popupContent.textContent = message; // For other popups, just set text
            }
        }
    }

    popupElement.classList.add('show');
    if (duration > 0) {
        setTimeout(() => {
            hidePopup(popupElement);
        }, duration);
    }
}

function hidePopup(popupElement) {
    popupElement.classList.remove('show');
}

// --- Helper function for time formatting (MM:SS) ---
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}


// --- Data Reset Logic ---
function performResetLogic() {
    // Clear all relevant Local Storage items
    localStorage.removeItem(LS_TOTAL_ADS_VIEWED);
    localStorage.removeItem(LS_DAILY_AD_COUNT);
    localStorage.removeItem(LS_LAST_AD_VIEW_DATE);
    localStorage.removeItem(LS_LAST_AD_VIEW_TIMESTAMP);
    // localStorage.removeItem(LS_THEME); // Uncomment if you want to reset theme preference too

    // Reload ad data and update UI
    loadAdData(); // This will reset daily count to 0 and total ads to 0
    checkDailyLimitAndCooldown(); // This will re-enable the view ad button if applicable

    // Reset the ad display area to its initial state
    adDisplay.innerHTML = `<p>Click 'View Ad' to start.</p>`;
    timerContainer.style.display = 'none'; // Ensure timer is hidden
    statusMessageDiv.style.display = 'none'; // Ensure status message is hidden
}

function handleResetAllData() {
    if (confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
        resetAllDataBtn.disabled = true;
        // Hide any other popups that might be open
        hidePopup(successPopup);
        hidePopup(noAdsPopup);
        hidePopup(noInternetPopup);
        hidePopup(vpnWarningPopup);

        // Show reset countdown message
        resetCountdownMessageDiv.style.display = 'block';
        let remainingResetTime = RESET_DELAY_DURATION;
        resetCountdownTimerSpan.textContent = formatTime(remainingResetTime);

        clearInterval(resetDelayInterval); // Clear any previous interval
        resetDelayInterval = setInterval(() => {
            remainingResetTime--;
            resetCountdownTimerSpan.textContent = formatTime(remainingResetTime);

            if (remainingResetTime <= 0) {
                clearInterval(resetDelayInterval);
                resetCountdownMessageDiv.style.display = 'none'; // Hide countdown message

                performResetLogic(); // Perform the actual reset

                // Show success popup with custom message for 5 seconds
                showPopup(successPopup, 5000, "All data has been reset successfully!");
                resetAllDataBtn.disabled = false; // Re-enable button
            }
        }, 1000);
    }
}

// --- Close App ---
function handleCloseApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.close();
    } else {
        alert("This action only works within the Telegram Web App.");
    }
}