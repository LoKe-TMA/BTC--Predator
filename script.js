// Global game state
let gameState = {  
    tokens: 50,  
    points: 1250,  
    currentPrice: 43567.89,  
    gameActive: false,  
    countdown: 30,  
    prediction: null,  
    startPrice: null,
    videoWatches: {
        watch3: 0,
        watch5: 0,
        watch10: 0
    }
};

let countdownInterval;
let priceInterval;
let currentAdLoaded = false;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
    initOnclicka();
});

// Initialize Onclicka
function initOnclicka() {
    // Load Onclicka SDK if not already loaded
    if (typeof Onclicka === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://js.onclckmn.com/static/onclicka.js';
        script.onload = function() {
            setupOnclicka();
        };
        document.head.appendChild(script);
    } else {
        setupOnclicka();
    }
}

function setupOnclicka() {
    Onclicka.init({
        publisherId: '074369d78e1444e0d642e6f438898e2c', // Replace with your actual publisher ID
        onReady: function() {
            loadAd();
        }
    });
}

function loadAd() {
    Onclicka.loadAd({
        onLoaded: function() {
            currentAdLoaded = true;
            console.log('Ad loaded and ready');
        },
        onFailed: function(error) {
            console.log('Ad failed to load', error);
            // Retry after 30 seconds if failed
            setTimeout(loadAd, 30000);
        }
    });
}

// Initialize game
function initGame() {
    updateDisplay();
    startPriceUpdates();
    // Load saved video watch counts
    const savedWatches = localStorage.getItem('videoWatches');
    if (savedWatches) {
        gameState.videoWatches = JSON.parse(savedWatches);
        updateVideoTaskButtons();
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Game page elements
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    
    if (upBtn) {
        upBtn.addEventListener('click', () => makePrediction('up'));
    }
    
    if (downBtn) {
        downBtn.addEventListener('click', () => makePrediction('down'));
    }
    
    // Withdrawal page elements
    const pointAmountInput = document.getElementById('pointAmount');
    if (pointAmountInput) {
        pointAmountInput.addEventListener('input', calculateTonAmount);
    }
    
    const submitWithdrawalBtn = document.getElementById('submitWithdrawalBtn');
    if (submitWithdrawalBtn) {
        submitWithdrawalBtn.addEventListener('click', submitWithdrawal);
    }
    
    // Copy invite link button
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyInviteLink);
    }
}

// Update display elements
function updateDisplay() {
    const tokenBalance = document.getElementById('tokenBalance');
    const pointBalance = document.getElementById('pointBalance');
    const btcPrice = document.getElementById('btcPrice');
    
    if (tokenBalance) tokenBalance.textContent = gameState.tokens;
    if (pointBalance) pointBalance.textContent = gameState.points;
    if (btcPrice) btcPrice.textContent = `$${gameState.currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Update video task buttons
function updateVideoTaskButtons() {
    const watch3Btn = document.querySelector('[onclick="handleVideoTask(\'watch3\', 1)"]');
    if (watch3Btn) {
        watch3Btn.textContent = `WATCH ${gameState.videoWatches.watch3}/3`;
        watch3Btn.disabled = gameState.videoWatches.watch3 >= 3;
    }
}

// Start price updates
function startPriceUpdates() {
    priceInterval = setInterval(() => {
        if (!gameState.gameActive) {
            // Simulate price movement
            const change = (Math.random() - 0.5) * 100;
            gameState.currentPrice += change;
            gameState.currentPrice = Math.max(gameState.currentPrice, 30000);
            updateDisplay();
        }
    }, 1000);
}

// Make prediction
function makePrediction(direction) {
    if (gameState.gameActive || gameState.tokens < 1) return;

    gameState.tokens -= 1;
    gameState.prediction = direction;
    gameState.startPrice = gameState.currentPrice;
    gameState.gameActive = true;
    gameState.countdown = 30;

    // Disable buttons
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    
    if (upBtn) upBtn.disabled = true;
    if (downBtn) downBtn.disabled = true;

    // Clear previous result
    const resultContainer = document.getElementById('resultContainer');
    if (resultContainer) resultContainer.innerHTML = "";

    // Start countdown
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

// End game and determine result
function endGame() {
    clearInterval(countdownInterval);

    const endPrice = gameState.currentPrice;
    const priceChange = endPrice - gameState.startPrice;

    let isCorrect = false;
    if (gameState.prediction === 'up' && priceChange > 0) {
        isCorrect = true;
    } else if (gameState.prediction === 'down' && priceChange < 0) {
        isCorrect = true;
    }

    // Update points
    if (isCorrect) {
        gameState.points += 10;
        showResult(true);
    } else {
        gameState.points = Math.max(0, gameState.points - 3);
        showResult(false);
    }

    // Reset game state
    gameState.gameActive = false;
    gameState.countdown = 30;
    gameState.prediction = null;
    gameState.startPrice = null;

    // Re-enable buttons
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    
    if (upBtn) upBtn.disabled = false;
    if (downBtn) downBtn.disabled = false;
    
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) countdownElement.textContent = '30';

    updateDisplay();
}

// Show result
function showResult(isCorrect) {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;

    const resultText = document.createElement('div');
    resultText.className = `result-text ${isCorrect ? 'result-correct' : 'result-wrong'}`;
    resultText.textContent = isCorrect ? 'Correct! +10 Points' : 'X Wrong! -3 Points';

    resultContainer.innerHTML = "";
    resultContainer.appendChild(resultText);

    // Remove result after 3 seconds
    setTimeout(() => {
        resultContainer.innerHTML = "";
    }, 3000);
}

// Handle video tasks with ads
function handleVideoTask(taskId, reward) {
    showInterstitialAd().then(() => {
        // Increment watch count
        gameState.videoWatches[taskId]++;
        localStorage.setItem('videoWatches', JSON.stringify(gameState.videoWatches));
        
        // Update UI
        updateVideoTaskButtons();
        
        // Check if task completed
        const requiredViews = parseInt(taskId.replace('watch', ''));
        if (gameState.videoWatches[taskId] >= requiredViews) {
            completeVideoTask(taskId, reward);
        }
        
        // Preload next ad
        loadAd();
    }).catch(error => {
        console.log('Ad error, but continuing task', error);
        completeVideoTask(taskId, reward);
    });
}

function showInterstitialAd() {
    return new Promise((resolve, reject) => {
        if (!currentAdLoaded) {
            console.log('No ad loaded, skipping');
            resolve();
            return;
        }
        
        Onclicka.showAd({
            onClosed: function() {
                console.log('Ad closed');
                resolve();
            },
            onFailed: function(error) {
                console.log('Ad show failed', error);
                reject(error);
            }
        });
    });
}

function completeVideoTask(taskId, reward) {
    gameState.tokens += reward;
    updateDisplay();
    
    // Reset counter if needed
    if (taskId === 'watch3') {
        gameState.videoWatches.watch3 = 0;
        localStorage.setItem('videoWatches', JSON.stringify(gameState.videoWatches));
        updateVideoTaskButtons();
    }
}

// Copy invite link
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

// Calculate TON amount
function calculateTonAmount() {
    const pointAmount = parseInt(this.value) || 0;
    const tonAmount = (pointAmount / 1000) * 0.1;
    const tonAmountElement = document.getElementById('tonAmount');
    
    if (tonAmountElement) {
        tonAmountElement.value = tonAmount.toFixed(4) + ' TON';
    }
}

// Submit withdrawal
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
    
    // Simulate withdrawal request
    alert('Withdrawal request submitted! Admin will process within 24 hours.');
    
    // Reset form
    walletAddress.value = "";
    pointAmount.value = "";
    
    const tonAmount = document.getElementById('tonAmount');
    if (tonAmount) tonAmount.value = "";
}
