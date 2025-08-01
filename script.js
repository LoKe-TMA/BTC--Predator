
function setupEventListeners() {
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');

    if (upBtn) upBtn.addEventListener('click', () => makePrediction('up'));
    if (downBtn) downBtn.addEventListener('click', () => makePrediction('down'));

    const pointAmountInput = document.getElementById('pointAmount');
    if (pointAmountInput) pointAmountInput.addEventListener('input', calculateTonAmount);

    const submitWithdrawalBtn = document.getElementById('submitWithdrawalBtn');
    if (submitWithdrawalBtn) submitWithdrawalBtn.addEventListener('click', submitWithdrawal);

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyInviteLink);

    // Adsgram Ad Button (if exists on index.html or other pages)
    // index.html မှာ ad banner နေရာပဲရှိပြီး button ID "ad" မရှိပါဘူး။
    // tasks.html က watchVideoTask အတွက်ပဲ ad လိုတာဆိုရင် ဒီ block ကို ဖြုတ်ပစ်နိုင်ပါတယ်။
    // ဒါမှမဟုတ် index.html မှာလဲ ad ID "ad" နဲ့ button ထားပေးရပါမယ်။
    const adButton = document.getElementById('ad');
    if (adButton) {
        adButton.addEventListener('click', () => {
            if (globalAdController) {
                globalAdController.show().then((result) => {
                    gameState.tokens += 1; // ✅ reward user
                    updateDisplay();
                    alert('Rewarded +1 Token!');
                }).catch((err) => {
                    console.error("AdsGram error:", err);
                    alert("Ad failed: " + JSON.stringify(err, null, 4));
                });
            } else {
                alert("Adsgram not initialized.");
            }
        });
    }
}

function updateDisplay() {
    const tokenBalance = document.getElementById('tokenBalance');
    const pointBalance = document.getElementById('pointBalance');
    const btcPrice = document.getElementById('btcPrice');

    if (tokenBalance) tokenBalance.textContent = gameState.tokens;
    if (pointBalance) pointBalance.textContent = gameState.points;
    if (btcPrice) btcPrice.textContent = `$${gameState.currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function startPriceUpdates() {
    priceInterval = setInterval(() => {
        if (!gameState.gameActive) {
            const change = (Math.random() - 0.5) * 100;
            gameState.currentPrice += change;
            gameState.currentPrice = Math.max(gameState.currentPrice, 30000);
            updateDisplay();
        }
    }, 1000);
}

function makePrediction(direction) {
    if (gameState.gameActive || gameState.tokens < 1) return;

    gameState.tokens -= 1;
    gameState.prediction = direction;
    gameState.startPrice = gameState.currentPrice;
    gameState.gameActive = true;
    gameState.countdown = 30;

    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    if (upBtn) upBtn.disabled = true;
    if (downBtn) downBtn.disabled = true;

    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) resultContainer.innerHTML = "";

    countdownInterval = setInterval(() => {
        gameState.countdown--;
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) countdownElement.textContent = gameState.countdown;

        if (gameState.countdown <= 0) {
            endGame();
        }
    }, 1000);

    updateDisplay();
}

function endGame() {
    clearInterval(countdownInterval);

    const endPrice = gameState.currentPrice;
    const priceChange = endPrice - gameState.startPrice;

    let isCorrect = false;
    if (gameState.prediction === 'up' && priceChange > 0) isCorrect = true;
    else if (gameState.prediction === 'down' && priceChange < 0) isCorrect = true;

    if (isCorrect) {
        gameState.points += 10;
        showResult(true);
    } else {
        gameState.points = Math.max(0, gameState.points - 3);
        showResult(false);
    }

    gameState.gameActive = false;
    gameState.countdown = 30;
    gameState.prediction = null;
    gameState.startPrice = null;

    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    if (upBtn) upBtn.disabled = false;
    if (downBtn) downBtn.disabled = false;

    const countdownElement = document.getElementById('countdown');
    if (countdownElement) countdownElement.textContent = '30';

    updateDisplay();
}

function showResult(isCorrect) {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;

    const resultText = document.createElement('div');
    resultText.className = `result-text ${isCorrect ? 'result-correct' : 'result-wrong'}`;
    resultText.textContent = isCorrect ? 'Correct! +10 Points' : 'X Wrong! -3 Points';

    resultContainer.innerHTML = "";
    resultContainer.appendChild(resultText);

    setTimeout(() => {
        resultContainer.innerHTML = "";
    }, 3000);
}

// ✅ Complete Task button (like CLAIM, JOIN)
// event parameter ကို ထည့်ပေးရပါမယ်။
function completeTask(taskId, reward, event) {
    const button = event.target;

    if (button.disabled) return;

    gameState.tokens += reward;
    updateDisplay();

    button.textContent = 'COMPLETED';
    button.disabled = true;
    button.style.background = '#666';
}

// ✅ Watch Video Task (with view count)
// event parameter ကို ထည့်ပေးရပါမယ်။
function watchVideoTask(taskId, reward, maxViews, event) {
    const button = event.target;
    let watched = parseInt(button.getAttribute('data-watched')) || 0;

    // Adsgram AdController ကို သုံးဖို့ showAd() function ကို ပြင်ထားပါတယ်။
    showAd().then(() => {
        watched++;
        button.setAttribute('data-watched', watched);
        button.textContent = `WATCH ${watched}/${maxViews}`;

        if (watched >= maxViews) {
            gameState.tokens += reward;
            button.textContent = 'COMPLETED';
            button.disabled = true;
            button.style.background = '#666';
        }

        updateDisplay();
    }).catch((err) => {
        console.error("Ad error:", err);
        alert("Ad failed to load. Please try again.");
    });
}

// ✅ Show interstitial ad (rewarded)
// globalAdController ကို သုံးဖို့ ပြင်လိုက်ပါ
function showAd() {
    return new Promise((resolve, reject) => {
        if (!globalAdController) { // Adsgram Controller မရှိရင် reject လုပ်ပါ
            return reject("Adsgram SDK not loaded or AdController not initialized.");
        }
        globalAdController.show().then((result) => { // globalAdController.show() ကို ခေါ်ပါ
            if (result === 'success') resolve(); // Adsgram က promise return မှာ 'success' ဒါမှမဟုတ် 'fail' ပြန်ပေးပါတယ်
            else reject(result);
        }).catch((err) => {
            reject(err);
        });
    });
}

// ✅ NEW: Init Adsgram reward logic
function initAdsgram() {
    // Insert your AdsGram blockId here
    // globalAdController ကို ဤနေရာတွင် initialize လုပ်ပါ။
    globalAdController = window.Adsgram?.init({
        blockId: "int-13300" // သင့်ရဲ့ မှန်ကန်တဲ့ blockId ကို ထည့်ပါ။
    });

    // setupEventListeners ထဲမှာ Ad button click listener ကို ရွှေ့ထားပြီးဖြစ်ပါတယ်။
    // ဒီနေရာမှာတော့ Adsgram ကို initialize လုပ်ပေးရုံပါပဲ။
    const button = document.getElementById('ad');
            button.addEventListener('click', () => {
                AdController.show().then((result) => {
                    // user watch ad till the end or close it in interstitial format
                    // your code to reward user for rewarded format
                    alert('Reward');
                }).catch((result) => {
                    // user get error during playing ad
                    // do nothing or whatever you want
                    alert(JSON.stringify(result, null, 4));
                })
            })
}

// ✅ Invite Copy
function copyInviteLink(event) {
    const inviteUrl = document.getElementById('inviteUrl');
    if (!inviteUrl) return;

    navigator.clipboard.writeText(inviteUrl.textContent).then(() => {
        const button = event.target;
        button.textContent = '■ COPIED!';
        setTimeout(() => {
            button.textContent = '📋 COPY LINK';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// ✅ Withdrawal Calculations
function calculateTonAmount() {
    const pointAmount = parseInt(this.value) || 0;
    const tonAmount = (pointAmount / 1000) * 0.1;
    const tonAmountElement = document.getElementById('tonAmount');
    if (tonAmountElement) {
        tonAmountElement.value = tonAmount.toFixed(4) + ' TON';
    }
}

// ✅ Submit Withdrawal
function submitWithdrawal() {
    const walletAddress = document.getElementById('walletAddress');
    const pointAmount = document.getElementById('pointAmount');

    if (!walletAddress || !pointAmount) return;

    const address = walletAddress.value;
    const points = parseInt(pointAmount.value);

    if (!address || points < 1000 || points > gameState.points) {
        alert('Please check your wallet address and point amount!');
        return;
    }

    alert('Withdrawal request submitted! Admin will process within 24 hours.');

    walletAddress.value = "";
    pointAmount.value = "";

    const tonAmount = document.getElementById('tonAmount');
    if (tonAmount) tonAmount.value = "";
}

// ✅ Navigation (for multi-page or single-page apps)
// event parameter ကို ထည့်ပေးရပါမယ်။
function showPage(pageId, event) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    // event.target ကို မရှိတဲ့နေရာမှာ ခေါ်တာမျိုး မဖြစ်အောင် စစ်ပါ
    if (event && event.target) {
        event.target.classList.add('active');
    }
}
// Global game state
let gameState = {
    tokens: 50,
    points: 1250,
    currentPrice: 43567.89,
    gameActive: false,
    countdown: 10,
    prediction: null,
    startPrice: null
};

let countdownInterval;
let priceInterval;

// Adsgram AdController ကို Global Variable အနေနဲ့ သတ်မှတ်ပါ။
// ဒါမှ watchVideoTask ထဲမှာ ပြန်သုံးလို့ရပါမယ်။
let globalAdController;

document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
    initTelegramWebApp(); // ✅ Telegram WebApp ကို initialize လုပ်ပါ
    initAdsgram();        // ✅ AdsGram ကို initialize လုပ်ပါ
});

function initGame() {
    updateDisplay();
    startPriceUpdates();
}

function setupEventListeners() {
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');

    if (upBtn) upBtn.addEventListener('click', () => makePrediction('up'));
    if (downBtn) downBtn.addEventListener('click', () => makePrediction('down'));

    const pointAmountInput = document.getElementById('pointAmount');
    if (pointAmountInput) pointAmountInput.addEventListener('input', calculateTonAmount);

    const submitWithdrawalBtn = document.getElementById('submitWithdrawalBtn');
    if (submitWithdrawalBtn) submitWithdrawalBtn.addEventListener('click', submitWithdrawal);

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyInviteLink);

    // Adsgram Ad Button (if exists on index.html or other pages)
    // index.html မှာ ad banner နေရာပဲရှိပြီး button ID "ad" မရှိသေးပါဘူး။
    // tasks.html က watchVideoTask အတွက်ပဲ ad လိုတာဆိုရင် ဒီ block ကို ဖြုတ်ပစ်နိုင်ပါတယ်။
    // ဒါမှမဟုတ် index.html မှာလဲ ad ID "ad" နဲ့ button ထားပေးရပါမယ်။
    const adButton = document.getElementById('ad');
    if (adButton) {
        adButton.addEventListener('click', () => {
            if (globalAdController) {
                globalAdController.show().then((result) => {
                    gameState.tokens += 1; // ✅ reward user
                    updateDisplay();
                    alert('Rewarded +1 Token!');
                }).catch((err) => {
                    console.error("AdsGram error:", err);
                    alert("Ad failed: " + JSON.stringify(err, null, 4));
                });
            } else {
                alert("Adsgram not initialized.");
            }
        });
    }
}

function updateDisplay() {
    const tokenBalance = document.getElementById('tokenBalance');
    const pointBalance = document.getElementById('pointBalance');
    const btcPrice = document.getElementById('btcPrice');

    if (tokenBalance) tokenBalance.textContent = gameState.tokens;
    if (pointBalance) pointBalance.textContent = gameState.points;
    if (btcPrice) btcPrice.textContent = `$${gameState.currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function startPriceUpdates() {
    priceInterval = setInterval(() => {
        if (!gameState.gameActive) {
            const change = (Math.random() - 0.5) * 100;
            gameState.currentPrice += change;
            gameState.currentPrice = Math.max(gameState.currentPrice, 30000);
            updateDisplay();
        }
    }, 1000);
}

function makePrediction(direction) {
    if (gameState.gameActive || gameState.tokens < 1) return;

    gameState.tokens -= 1;
    gameState.prediction = direction;
    gameState.startPrice = gameState.currentPrice;
    gameState.gameActive = true;
    gameState.countdown = 30;

    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    if (upBtn) upBtn.disabled = true;
    if (downBtn) downBtn.disabled = true;

    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) resultContainer.innerHTML = "";

    countdownInterval = setInterval(() => {
        gameState.countdown--;
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) countdownElement.textContent = gameState.countdown;

        if (gameState.countdown <= 0) {
            endGame();
        }
    }, 1000);

    updateDisplay();
}

function endGame() {
    clearInterval(countdownInterval);

    const endPrice = gameState.currentPrice;
    const priceChange = endPrice - gameState.startPrice;

    let isCorrect = false;
    if (gameState.prediction === 'up' && priceChange > 0) isCorrect = true;
    else if (gameState.prediction === 'down' && priceChange < 0) isCorrect = true;

    if (isCorrect) {
        gameState.points += 10;
        showResult(true);
    } else {
        gameState.points = Math.max(0, gameState.points - 3);
        showResult(false);
    }

    gameState.gameActive = false;
    gameState.countdown = 30;
    gameState.prediction = null;
    gameState.startPrice = null;

    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    if (upBtn) upBtn.disabled = false;
    if (downBtn) downBtn.disabled = false;

    const countdownElement = document.getElementById('countdown');
    if (countdownElement) countdownElement.textContent = '30';

    updateDisplay();
}

function showResult(isCorrect) {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;

    const resultText = document.createElement('div');
    resultText.className = `result-text ${isCorrect ? 'result-correct' : 'result-wrong'}`;
    resultText.textContent = isCorrect ? 'Correct! +10 Points' : 'X Wrong! -3 Points';

    resultContainer.innerHTML = "";
    resultContainer.appendChild(resultText);

    setTimeout(() => {
        resultContainer.innerHTML = "";
    }, 3000);
}

// ✅ Complete Task button (like CLAIM, JOIN)
// event parameter ကို ထည့်ပေးရပါမယ်။
function completeTask(taskId, reward, event) {
    const button = event.target;

    if (button.disabled) return;

    gameState.tokens += reward;
    updateDisplay();

    button.textContent = 'COMPLETED';
    button.disabled = true;
    button.style.background = '#666';
}

// ✅ Watch Video Task (with view count)
// event parameter ကို ထည့်ပေးရပါမယ်။
function watchVideoTask(taskId, reward, maxViews, event) {
    const button = event.target;
    let watched = parseInt(button.getAttribute('data-watched')) || 0;

    // Adsgram AdController ကို သုံးဖို့ showAd() function ကို ပြင်ထားပါတယ်။
    showAd().then(() => {
        watched++;
        button.setAttribute('data-watched', watched);
        button.textContent = `WATCH ${watched}/${maxViews}`;

        if (watched >= maxViews) {
            gameState.tokens += reward;
            button.textContent = 'COMPLETED';
            button.disabled = true;
            button.style.background = '#666';
        }

        updateDisplay();
    }).catch((err) => {
        console.error("Ad error:", err);
        alert("Ad failed to load. Please try again.");
    });
}

// ✅ Show interstitial ad (rewarded)
// globalAdController ကို သုံးဖို့ ပြင်လိုက်ပါ
function showAd() {
    return new Promise((resolve, reject) => {
        if (!globalAdController) { // Adsgram Controller မရှိရင် reject လုပ်ပါ
            return reject("Adsgram SDK not loaded or AdController not initialized.");
        }
        globalAdController.show().then((result) => { // globalAdController.show() ကို ခေါ်ပါ
            if (result === 'success') resolve(); // Adsgram က promise return မှာ 'success' ဒါမှမဟုတ် 'fail' ပြန်ပေးပါတယ်
            else reject(result);
        }).catch((err) => {
            reject(err);
        });
    });
}

// ✅ NEW: Init Adsgram reward logic
function initAdsgram() {
    // Insert your AdsGram blockId here
    // globalAdController ကို ဤနေရာတွင် initialize လုပ်ပါ။
    // Telegram WebApp က ready ဖြစ်မှ Adsgram ကို initialize လုပ်သင့်ပါတယ်။
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.ready) {
        globalAdController = window.Adsgram?.init({
            blockId: "int-13300" // သင့်ရဲ့ မှန်ကန်တဲ့ blockId ကို ထည့်ပါ။
        });

        if (!globalAdController) {
            console.error("Adsgram failed to initialize. Check blockId or Adsgram SDK.");
        }
    } else {
        console.warn("Telegram WebApp not ready, delaying Adsgram initialization.");
        // Telegram WebApp မရှိရင် 0.5 စက္ကန့် စောင့်ပြီး ပြန်ကြိုးစားပါ။
        setTimeout(initAdsgram, 500);
    }
}

// ✅ Invite Copy
function copyInviteLink(event) {
    const inviteUrl = document.getElementById('inviteUrl');
    if (!inviteUrl) return;

    navigator.clipboard.writeText(inviteUrl.textContent).then(() => {
        const button = event.target;
        button.textContent = '■ COPIED!';
        setTimeout(() => {
            button.textContent = '📋 COPY LINK';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// ✅ Withdrawal Calculations
function calculateTonAmount() {
    const pointAmount = parseInt(this.value) || 0;
    const tonAmount = (pointAmount / 1000) * 0.1;
    const tonAmountElement = document.getElementById('tonAmount');
    if (tonAmountElement) {
        tonAmountElement.value = tonAmount.toFixed(4) + ' TON';
    }
}

// ✅ Submit Withdrawal
function submitWithdrawal() {
    const walletAddress = document.getElementById('walletAddress');
    const pointAmount = document.getElementById('pointAmount');

    if (!walletAddress || !pointAmount) return;

    const address = walletAddress.value;
    const points = parseInt(pointAmount.value);

    if (!address || points < 1000 || points > gameState.points) {
        alert('Please check your wallet address and point amount!');
        return;
    }

    alert('Withdrawal request submitted! Admin will process within 24 hours.');

    walletAddress.value = "";
    pointAmount.value = "";

    const tonAmount = document.getElementById('tonAmount');
    if (tonAmount) tonAmount.value = "";
}

// ✅ Navigation (for multi-page or single-page apps)
// event parameter ကို ထည့်ပေးရပါမယ်။
function showPage(pageId, event) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    // event.target ကို မရှိတဲ့နေရာမှာ ခေါ်တာမျိုး မဖြစ်အောင် စစ်ပါ
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ✅ NEW: Telegram WebApp SDK Initialization
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const WebApp = window.Telegram.WebApp;
        // App ကို အပြည့်အဝပြသဖို့
        WebApp.ready();
        // Back Button ကို ပြဖို့ (လိုရင်)
        // WebApp.BackButton.show();
        // WebApp.BackButton.onClick(function() {
        //     // Handle back button click, e.g., navigate back or close the app
        //     WebApp.close();
        // });

        // Debugging အတွက် launch parameters တွေကို console မှာ ထုတ်ကြည့်ပါ။
        console.log("Telegram WebApp Initialized:", WebApp.initDataUnsafe);
        console.log("Telegram WebApp Version:", WebApp.version);

        // App ရဲ့ UI ကို Telegram ရဲ့ theme နဲ့ လိုက်လျောညီထွေဖြစ်အောင် လုပ်ပါ။
        // Background color ကို Telegram ရဲ့ theme ကနေ ယူသုံးပါ
        document.body.style.backgroundColor = WebApp.themeParams.bg_color || '#1A212D'; // Default dark color
        document.body.style.color = WebApp.themeParams.text_color || '#FFFFFF'; // Default light text color

        // Theme parameters ပြောင်းလဲမှုကို နားထောင်ခြင်း (optional)
        // WebApp.onEvent('themeChanged', function() {
        //     document.body.style.backgroundColor = WebApp.themeParams.bg_color;
        //     document.body.style.color = WebApp.themeParams.text_color;
        // });

    } else {
        console.warn("Telegram WebApp SDK not found or not in Telegram environment.");
        // Telegram environment မဟုတ်ရင် user ကို သတိပေးတာမျိုး လုပ်နိုင်ပါတယ်။
        alert("Please open this app inside the Telegram application to ensure full functionality.");
    }
}
onAmount
