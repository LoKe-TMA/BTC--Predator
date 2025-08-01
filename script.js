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

document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
    initAdsgram(); // ✅ initialize AdsGram
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
function completeTask(taskId, reward) {
    const button = event.target;

    if (button.disabled) return;

    gameState.tokens += reward;
    updateDisplay();

    button.textContent = 'COMPLETED';
    button.disabled = true;
    button.style.background = '#666';
}

// ✅ Watch Video Task (with view count)
function watchVideoTask(taskId, reward, maxViews) {
    const button = event.target;
    let watched = parseInt(button.getAttribute('data-watched')) || 0;

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
function showAd() {
    return new Promise((resolve, reject) => {
        if (!window.sad) return reject("Adsgram SDK not loaded.");
        sad.showInterstitial({
            callback: (result) => {
                if (result === 'success') resolve();
                else reject(result);
            }
        });
    });
}

// ✅ NEW: Init Adsgram reward logic
function initAdsgram() {
    // Insert your AdsGram blockId here
    const AdController = window.Adsgram?.init({
        blockId: "int-13300"
    });

    const adButton = document.getElementById('ad');
    if (!adButton || !AdController) return;

    adButton.addEventListener('click', () => {
        AdController.show().then((result) => {
            gameState.tokens += 1; // ✅ reward user
            updateDisplay();
            alert('Rewarded +1 Token!');
        }).catch((err) => {
            console.error("AdsGram error:", err);
            alert("Ad failed: " + JSON.stringify(err, null, 4));
        });
    });
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
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    event.target.classList.add('active');
}


