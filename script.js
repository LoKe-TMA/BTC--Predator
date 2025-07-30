// Global game state
let gameState = {  
    tokens: 50,  
    points: 1250,  
    currentPrice: 43567.89,  
    gameActive: false,  
    countdown: 30,  
    prediction: null,  
    startPrice: null
};  

let countdownInterval;
let priceInterval;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
});

// Initialize game
function initGame() {
    updateDisplay();
    startPriceUpdates();
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
    
    // Task buttons
    const taskButtons = document.querySelectorAll('.task-btn:not([disabled])');
    taskButtons.forEach(button => {
        button.addEventListener('click', completeTask);
    });
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

// Complete task
function completeTask(event) {
    const button = event.target;
    const taskId = button.getAttribute('data-task-id');
    const reward = parseInt(button.getAttribute('data-reward')) || 1;
    
    gameState.tokens += reward;
    updateDisplay();
    
    // Disable button and show completed
    button.textContent = 'COMPLETED';
    button.disabled = true;
    button.style.background = '#666';
    
    // Remove event listener
    button.removeEventListener('click', completeTask);
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

// Page navigation (for single page version)
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all navigators
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    
    // Add active class to corresponding navigator
    event.target.classList.add('active');
}