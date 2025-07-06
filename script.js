// --- Global Variables and Constants ---
const AD_DURATION = 15; // seconds
const DAILY_AD_LIMIT = 20;
const COOLDOWN_DURATION = 5; // seconds
const BEEP_SOUND_URL = 'sounds/beep.wav'; // Make sure you have a 'sounds' folder with beep.wav
const AD_URL = 'https://www.profitableratecpm.com/wt3cf24rv?key=20dc1dbba749e453add6a9fa9003303e';

let timerInterval;
let cooldownInterval;
let currentAdTime = AD_DURATION;
let isAdPlaying = false;
let beepSound;
let dateTimeInterval;
let isVpnDetected = false; // Flag to track VPN detection

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
const successPopup = document.getElementById('successPopup');
const noAdsPopup = document.getElementById('noAdsPopup');
const noInternetPopup = document.getElementById('noInternetPopup');
const vpnWarningPopup = document.getElementById('vpnWarningPopup');
const themeToggle = document.getElementById('themeToggle');
const resetAllDataBtn = document.getElementById('resetAllDataBtn'); // NEW: Reset All Data Button

// DOM elements for date and time
const currentDateSpan = document.getElementById('currentDate');
const currentTimeSpan = document.getElementById('currentTime');

// --- Local Storage Keys ---
const LS_TOTAL_ADS_VIEWED = 'totalAdsViewed';
const LS_DAILY_AD_COUNT = 'dailyAdCount';
const LS_LAST_AD_VIEW_DATE = 'lastAdViewDate';
const LS_LAST_AD_VIEW_TIMESTAMP = 'lastAdViewTimestamp';
const LS_THEME = 'themePreference';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTelegramWebApp();
    loadThemePreference();
    checkInternetConnection();

    try {
        beepSound = new Audio(BEEP_SOUND_URL);
        beepSound.load();
    } catch (e) {
        console.error("Error loading beep sound:", e);
    }

    maxDailyAdsSpan.textContent = DAILY_AD_LIMIT;

    loadAdData();
    checkDailyLimitAndCooldown();

    updateDateTime();
    dateTimeInterval = setInterval(updateDateTime, 1000);

    viewAdBtn.addEventListener('click', handleViewAd);
    closeAppBtn.addEventListener('click', handleCloseApp);
    themeToggle.addEventListener('change', toggleTheme);
    resetAllDataBtn.addEventListener('click', handleResetAllData); // NEW: Add event listener for reset button

    window.addEventListener('online', checkInternetConnection);
    window.addEventListener('offline', checkInternetConnection);
});

// --- Telegram Web App API Initialization ---
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const WebApp = window.Telegram.WebApp;
        WebApp.ready();

        if (WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
            userIdSpan.textContent = WebApp.initDataUnsafe.user.id;
            let userName = '';
            if (WebApp.initDataUnsafe.user.first_name) {
                userName += WebApp.initDataUnsafe.user.first_name;
            }
            if (WebApp.initDataUnsafe.user.last_name) {
                userName += ' ' + WebApp.initDataUnsafe.user.last_name;
            }
            userNameSpan.textContent = userName || 'Guest';
        } else {
            userIdSpan.textContent = 'N/A (Not in Telegram Web App)';
            userNameSpan.textContent = 'Guest';
            console.warn("Telegram Web App API not available. Running in standalone mode.");
            document.body.classList.add('light-mode');
        }

        WebApp.onEvent('themeChanged', () => {
            applyTelegramTheme(WebApp.themeParams);
        });
        applyTelegramTheme(WebApp.themeParams);
    } else {
        userIdSpan.textContent = 'Web App Not Initialized';
        userNameSpan.textContent = 'Guest';
        console.warn("Telegram Web App API not available. Running in standalone mode.");
        document.body.classList.add('light-mode');
    }
}

// --- Theme Management ---
function applyTelegramTheme(themeParams) {
    if (!themeParams) return;
    document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#aaaaaa');
    document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');

    if (themeParams.bg_color && isColorDark(themeParams.bg_color)) {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
    saveThemePreference();
}

function isColorDark(hexColor) {
    if (!hexColor || hexColor.length < 7) return false;
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp < 127.5;
}

function toggleTheme() {
    if (themeToggle.checked) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    saveThemePreference();
}

function saveThemePreference() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem(LS_THEME, isDarkMode ? 'dark' : 'light');
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem(LS_THEME);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
}

// --- Date and Time Management ---
function updateDateTime() {
    const now = new Date();
    const optionsDate = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Colombo'
    };
    const optionsTime = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Colombo'
    };

    const dateString = now.toLocaleDateString('en-LK', optionsDate);
    const timeString = now.toLocaleTimeString('en-LK', optionsTime);

    currentDateSpan.textContent = dateString;
    currentTimeSpan.textContent = timeString;
}


// --- Internet Connection Check ---
function checkInternetConnection() {
    if (navigator.onLine) {
        hidePopup(noInternetPopup);
        if (!isVpnDetected) {
            viewAdBtn.disabled = false;
        }
        checkDailyLimitAndCooldown();
    } else {
        showPopup(noInternetPopup, 0);
        viewAdBtn.disabled = true;
        stopTimer();
    }
}

// --- Ad Data Management (Local Storage) ---
function loadAdData() {
    let totalAds = parseInt(localStorage.getItem(LS_TOTAL_ADS_VIEWED)) || 0;
    totalAdsViewedSpan.textContent = totalAds;

    let dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;
    let lastViewDate = localStorage.getItem(LS_LAST_AD_VIEW_DATE);
    const today = new Date().toDateString();

    if (lastViewDate !== today) {
        dailyCount = 0;
        localStorage.setItem(LS_DAILY_AD_COUNT, 0);
        localStorage.setItem(LS_LAST_AD_VIEW_DATE, today);
    }
    dailyAdCountSpan.textContent = dailyCount;
}

function incrementAdCount() {
    let totalAds = parseInt(localStorage.getItem(LS_TOTAL_ADS_VIEWED)) || 0;
    totalAds++;
    localStorage.setItem(LS_TOTAL_ADS_VIEWED, totalAds);
    totalAdsViewedSpan.textContent = totalAds;

    let dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;
    dailyCount++;
    localStorage.setItem(LS_DAILY_AD_COUNT, dailyCount);
    dailyAdCountSpan.textContent = dailyCount;

    localStorage.setItem(LS_LAST_AD_VIEW_DATE, new Date().toDateString());
    localStorage.setItem(LS_LAST_AD_VIEW_TIMESTAMP, Date.now());
}

// --- Daily Limit and Cooldown Check ---
function checkDailyLimitAndCooldown() {
    const dailyCount = parseInt(localStorage.getItem(LS_DAILY_AD_COUNT)) || 0;
    const lastViewTimestamp = parseInt(localStorage.getItem(LS_LAST_AD_VIEW_TIMESTAMP)) || 0;
    const currentTime = Date.now();
    const timeSinceLastAd = (currentTime - lastViewTimestamp) / 1000;

    if (!navigator.onLine) {
        viewAdBtn.disabled = true;
        return;
    }

    if (dailyCount >= DAILY_AD_LIMIT) {
        viewAdBtn.disabled = true;
        showPopup(noAdsPopup, 3000);
        statusMessageDiv.style.display = 'none';
        cooldownMessageDiv.style.display = 'none';
        adDisplay.innerHTML = `<p>Daily ad limit reached. Come back tomorrow!</p>`;
        timerContainer.style.display = 'none';
        return;
    }

    if (isVpnDetected) {
        viewAdBtn.disabled = true;
        cooldownMessageDiv.style.display = 'none';
        return;
    }

    if (timeSinceLastAd < COOLDOWN_DURATION) {
        viewAdBtn.disabled = true;
        cooldownMessageDiv.style.display = 'block';
        let remainingCooldown = Math.ceil(COOLDOWN_DURATION - timeSinceLastAd);
        cooldownTimerSpan.textContent = remainingCooldown;

        clearInterval(cooldownInterval);
        cooldownInterval = setInterval(() => {
            remainingCooldown--;
            cooldownTimerSpan.textContent = remainingCooldown;
            if (remainingCooldown <= 0) {
                clearInterval(cooldownInterval);
                cooldownMessageDiv.style.display = 'none';
                viewAdBtn.disabled = false;
                if (isVpnDetected) viewAdBtn.disabled = true;
            }
        }, 1000);
    } else {
        viewAdBtn.disabled = false;
        cooldownMessageDiv.style.display = 'none';
    }
}

// --- Ad Viewing Logic ---
function handleViewAd() {
    if (isAdPlaying) return;
    if (!navigator.onLine) {
        showPopup(noInternetPopup, 3000);
        return;
    }
    if (viewAdBtn.disabled) {
        checkDailyLimitAndCooldown();
        return;
    }

    isAdPlaying = true;
    isVpnDetected = false;
    hidePopup(vpnWarningPopup);

    viewAdBtn.disabled = true;
    closeAppBtn.disabled = true;

    adDisplay.innerHTML = `
        <p>Loading Ad...</p>
        <iframe id="adIframe" src="${AD_URL}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                style="width:100%; height:250px; border-radius:8px; display:block;">
        </iframe>
    `;

    timerContainer.style.display = 'block';
    statusMessageDiv.style.display = 'none';
    currentAdTime = AD_DURATION;
    timerSpan.textContent = currentAdTime;
    progressBar.style.width = '0%';

    startTimer();

    setTimeout(() => {
        checkAdContentForVPN();
    }, 2000);
}

function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (isVpnDetected) {
            stopTimer();
            return;
        }

        currentAdTime--;
        timerSpan.textContent = currentAdTime;
        const progress = ((AD_DURATION - currentAdTime) / AD_DURATION) * 100;
        progressBar.style.width = `${progress}%`;

        if (currentAdTime <= 0) {
            stopTimer();
            adViewedSuccessfully();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    isAdPlaying = false;
    closeAppBtn.disabled = false;
    timerContainer.style.display = 'none';
    if (!isVpnDetected) {
        checkDailyLimitAndCooldown();
    }
}

function checkAdContentForVPN() {
    const adContent = adDisplay.textContent || adDisplay.innerText;
    const proxyDetectedMessage = "Anonymous Proxy detected.";

    if (adContent.includes(proxyDetectedMessage)) {
        isVpnDetected = true;
        stopTimer();
        viewAdBtn.disabled = true;
        closeAppBtn.disabled = false;
        showPopup(vpnWarningPopup, 0);
        adDisplay.innerHTML = `<p>${proxyDetectedMessage} Ad cannot be viewed successfully. Please disable VPN and try again.</p>`;
        statusMessageDiv.style.display = 'none';
        console.warn("VPN/Proxy detected! Ad viewing halted.");

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.sendData) {
             window.Telegram.WebApp.sendData(JSON.stringify({ type: 'vpn_detected', userId: userIdSpan.textContent }));
        }
    } else {
        hidePopup(vpnWarningPopup);
        isVpnDetected = false;
        checkDailyLimitAndCooldown();
    }
}


function adViewedSuccessfully() {
    if (!isVpnDetected) {
        incrementAdCount();
        showPopup(successPopup, 2000);

        if (beepSound) {
            beepSound.play().catch(e => console.error("Error playing sound:", e));
        }

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        adDisplay.innerHTML = `<p>Ad finished. Click 'View Ad' for next.</p>`;
    } else {
        showPopup(vpnWarningPopup, 0);
        adDisplay.innerHTML = `<p>Ad viewing failed due to VPN/Proxy. Please disable VPN.</p>`;
    }
    checkDailyLimitAndCooldown();
}

// --- Popup Management ---
function showPopup(popupElement, duration = 2000) {
    hidePopup(successPopup);
    hidePopup(noAdsPopup);
    hidePopup(noInternetPopup);
    hidePopup(vpnWarningPopup);

    popupElement.classList.add('show');
    if (duration > 0) {
        setTimeout(() => {
            popupElement.classList.remove('show');
        }, duration);
    }
}

function hidePopup(popupElement) {
    popupElement.classList.remove('show');
}

// --- Data Reset Logic ---
function handleResetAllData() {
    if (confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
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

        alert("All data has been reset successfully!");
    }
}

// --- Close App ---
function handleCloseApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.close();
    } else {
        alert("This action only works within the Telegram Web App.");
        console.log("Closing app (simulated for standalone mode)");
    }
}