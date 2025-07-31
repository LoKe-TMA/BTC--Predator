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
        watch10: 0,
        lastWatchTime: 0 // To track cooldown
    },
    adCooldown: 30000 // 30 seconds cooldown for ads
};

// Add this to your initialization
function initGame() {
    updateDisplay();
    startPriceUpdates();
    loadAdsterraScript(); // Load Adsterra when game initializes

    // Load saved video watch counts
    const savedWatches = localStorage.getItem('videoWatches');
    if (savedWatches) {
        gameState.videoWatches = JSON.parse(savedWatches);
        // Ensure lastWatchTime is loaded or set if not present
        if (!gameState.videoWatches.lastWatchTime) {
            gameState.videoWatches.lastWatchTime = 0;
        }
        updateVideoTaskButtons();
    }
}

// Add this new function to load Adsterra
function loadAdsterraScript() {
    // Check if Adsterra script is already present to avoid multiple loads
    if (!document.querySelector('script[src*="profitableratecpm.com"]')) {
        const script = document.createElement('script');
        script.src = '//pl27308805.profitableratecpm.com/78/07/eb/7807ebd575eccf3c0689f974371218ca.js';
        script.async = true; // Load asynchronously
        script.onload = function() {
            console.log('Adsterra script loaded');
        };
        script.onerror = function() {
            console.error('Failed to load Adsterra script');
        };
        document.head.appendChild(script);
    }
}

// Replace your existing handleVideoTask function with this enhanced version
function handleVideoTask(taskId, reward) {
    // Check cooldown
    const now = Date.now();
    if (now - gameState.videoWatches.lastWatchTime < gameState.adCooldown) {
        const remainingSeconds = Math.ceil((gameState.adCooldown - (now - gameState.videoWatches.lastWatchTime)) / 1000);
        alert(`Please wait ${remainingSeconds} seconds before watching another ad.`);
        return;
    }

    // Attempt to show the Adsterra popunder ad
    try {
        if (typeof AdsterraPopunder !== 'undefined') { // Adsterra's global object for popunder
            // Adsterra's popunder usually works by including their script, it directly injects the ad.
            // There's no explicit `Adsterra.load('popunder', { id: YOUR_ADSTERRA_ID })` method for popunder ads.
            // The script itself handles the display.
            console.log('Adsterra popunder should be displayed.');
        } else {
            console.log('Adsterra script not fully loaded or AdsterraPopunder is undefined, using fallback logic.');
            // Fallback for when Adsterra might not be ready or fails
        }

        // --- Important: You'll need to decide how to truly "confirm" an ad watch with Adsterra ---
        // Adsterra popunders usually just open a new tab. You don't get a direct callback
        // for "ad watched" in the same way you would with an interstitial or rewarded video.
        // For a simple game, you might just count it as watched immediately after attempting to show.
        // For a more robust solution, you'd need to explore Adsterra's API for actual confirmation,
        // which might involve server-side integration or a different ad format.
        // For this client-side example, we'll proceed as if the ad was shown.

        // Increment watch count and update last watch time
        gameState.videoWatches[taskId]++;
        gameState.videoWatches.lastWatchTime = now;
        localStorage.setItem('videoWatches', JSON.stringify(gameState.videoWatches));

        // Update UI immediately
        updateVideoTaskButtons();

        // Check if task completed
        const requiredViews = parseInt(taskId.replace('watch', ''));
        if (gameState.videoWatches[taskId] >= requiredViews) {
            completeVideoTask(taskId, reward);
        }

        // Show reward message (assuming ad display was successful enough)
        showTaskReward(reward);

    } catch (error) {
        console.error('Error attempting to show Adsterra ad:', error);
        // Even if there's an error showing the ad, you might still want to reward the user
        // to avoid a bad user experience. Adjust this logic as per your game's policy.
        // completeVideoTask(taskId, reward); // Uncomment if you want to reward even on ad failure
        alert('Could not display ad. Please try again later.');
    }
}

// Add this new helper function
function showTaskReward(reward) {
    const rewardElement = document.createElement('div');
    rewardElement.className = 'task-reward-message';
    rewardElement.textContent = `+${reward} Token${reward > 1 ? 's' : ''}`;

    // Get the button that triggered the event (assuming 'event' is available in the scope or passed)
    // A more robust way would be to pass the button element directly or use event.currentTarget
    const button = event.target; // This assumes handleVideoTask is called from an onclick attribute directly
    if (button && button.parentNode) {
        button.parentNode.appendChild(rewardElement);

        setTimeout(() => {
            rewardElement.remove();
        }, 2000);
    } else {
        // Fallback if button or its parent isn't found
        console.log(`Rewarded ${reward} tokens.`);
    }
}

// Update your existing completeVideoTask function
function completeVideoTask(taskId, reward) {
    gameState.tokens += reward;
    updateDisplay();

    // Reset counter if needed (only if the task is actually completed)
    const requiredViews = parseInt(taskId.replace('watch', ''));
    if (gameState.videoWatches[taskId] >= requiredViews) {
        gameState.videoWatches[taskId] = 0; // Reset for next cycle
        localStorage.setItem('videoWatches', JSON.stringify(gameState.videoWatches));
        updateVideoTaskButtons(); // Update button text to reflect reset

        // Update button text to show reset count
        const button = document.querySelector(`[onclick="handleVideoTask('${taskId}', ${reward})"]`);
        if (button) {
            button.textContent = button.textContent.replace(/\d+\/\d+/, `0/${requiredViews}`);
        }
    }
}

// Update your existing updateVideoTaskButtons function
function updateVideoTaskButtons() {
    const buttons = {
        watch3: document.querySelector('[onclick="handleVideoTask(\'watch3\', 1)"]'),
        watch5: document.querySelector('[onclick="handleVideoTask(\'watch5\', 3)"]'),
        watch10: document.querySelector('[onclick="handleVideoTask(\'watch10\', 10)"]')
    };

    for (const [taskId, button] of Object.entries(buttons)) {
        if (button) {
            const current = gameState.videoWatches[taskId];
            const required = parseInt(taskId.replace('watch', ''));

            button.textContent = `WATCH ${current}/${required}`;
            button.disabled = current >= required; // Disable button if task is complete

            if (button.disabled) {
                button.style.background = '#666';
                // No need to nullify onclick if disabled handles it, but good practice if button remains clickable
                // button.onclick = null;
            } else {
                button.style.background = ''; // Reset background if re-enabled
                // Re-enable onclick if it was nullified, though disabled state handles this
                // button.onclick = () => handleVideoTask(taskId, reward_from_taskId_or_data_attribute);
                // For this structure, onclick is in HTML, so disabled prop is enough.
            }
        }
    }
}

let countdownInterval;
let priceInterval;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
});

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
    const pointAmountInput = document.getElementById('pointAmount');
    if (!pointAmountInput) return;

    const pointAmount = parseInt(pointAmountInput.value) || 0;
    const tonAmount = (pointAmount / 1000) * 0.1;
    const tonAmountElement = document.getElementById('tonAmount');

    if (tonAmountElement) {
        tonAmountElement.value = tonAmount.toFixed(4) + ' TON';
    }
}

// Submit withdrawal
function submitWithdrawal() {
    const walletAddressInput = document.getElementById('walletAddress');
    const pointAmountInput = document.getElementById('pointAmount');

    if (!walletAddressInput || !pointAmountInput) return;

    const address = walletAddressInput.value;
    const points = parseInt(pointAmountInput.value);

    if (!address || points < 1000 || points > gameState.points) {
        alert('Please check your wallet address and point amount! Minimum withdrawal is 1000 points.');
        return;
    }

    // Simulate withdrawal request
    alert('Withdrawal request submitted! Admin will process within 24 hours.');

    // Reset form
    walletAddressInput.value = "";
    pointAmountInput.value = "";

    const tonAmountElement = document.getElementById('tonAmount');
    if (tonAmountElement) tonAmountElement.value = "";
}
