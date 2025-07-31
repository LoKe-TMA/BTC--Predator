// Global game state
let gameState = {
    tokens: 50,
    points: 1250,
    currentPrice: 43567.89,
    gameActive: false,
    countdown: 30,
    prediction: null,
    startPrice: null,
    // Add a state to track task progress, especially for watch video tasks
    taskProgress: {
        watch3: 0,
        watch5: 0,
        watch10: 0
    }
};

let countdownInterval;
let priceInterval;

// --- AdsGram Integration ---
const AdsGram = window.AdsGram;
let interstitialAd = null; // Declare a variable to hold our interstitial ad instance
const PUBLISHER_ID = 'a5055de074414ea79f26aa3b1718fcde'; // REPLACE WITH YOUR ACTUAL PUBLISHER ID from AdsGram
const INTERSTITIAL_AD_UNIT_ID = 'YOUR_INTERSTITIAL_AD_UNIT_ID'; // REPLACE WITH YOUR ACTUAL INTERSTITIAL AD UNIT ID

// Initialize AdsGram when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupEventListeners();
    initAdsGram(); // Call AdsGram initialization
});

function initAdsGram() {
    if (AdsGram) {
        AdsGram.init(PUBLISHER_ID);
        console.log('AdsGram initialized with Publisher ID:', PUBLISHER_ID);

        // Create an Interstitial Ad instance
        interstitialAd = new AdsGram.InterstitialAd(INTERSTITIAL_AD_UNIT_ID);

        // Set up event listeners for the interstitial ad
        interstitialAd.on('load', () => {
            console.log('Interstitial Ad loaded successfully!');
        });

        interstitialAd.on('loadfail', (error) => {
            console.error('Interstitial Ad failed to load:', error);
            // Optionally, handle ad load failure (e.g., show a message to user)
        });

        interstitialAd.on('show', () => {
            console.log('Interstitial Ad shown!');
        });

        interstitialAd.on('showfail', (error) => {
            console.error('Interstitial Ad failed to show:', error);
            // Optionally, handle ad show failure
        });

        interstitialAd.on('click', () => {
            console.log('Interstitial Ad clicked!');
        });

        interstitialAd.on('close', () => {
            console.log('Interstitial Ad closed.');
            // This is crucial: After the ad closes, complete the "watch video" task
            // We need to know which task button was just interacted with.
            // A simple way is to use a global variable or pass context.
            if (window.currentVideoTaskButton) {
                const taskId = window.currentVideoTaskButton.getAttribute('data-task-id');
                const reward = parseInt(window.currentVideoTaskButton.getAttribute('data-reward'));
                const requiredWatches = parseInt(window.currentVideoTaskButton.getAttribute('data-required-watches'));

                // Increment watched count and update button text
                gameState.taskProgress[taskId]++;
                window.currentVideoTaskButton.textContent = `WATCH ${gameState.taskProgress[taskId]}/${requiredWatches}`;

                if (gameState.taskProgress[taskId] >= requiredWatches) {
                    completeTask(window.currentVideoTaskButton, taskId, reward);
                }
                window.currentVideoTaskButton = null; // Clear reference
            }
        });

        // Pre-load the ad to be ready when needed
        loadInterstitialAd();

    } else {
        console.error('AdsGram SDK not found. Make sure the script is correctly loaded.');
    }
}

async function loadInterstitialAd() {
    if (interstitialAd) {
        try {
            await interstitialAd.load();
        } catch (error) {
            console.error('Error loading interstitial ad:', error);
        }
    }
}

async function showInterstitialAd() {
    if (interstitialAd && interstitialAd.isLoaded()) {
        try {
            await interstitialAd.show();
            // After showing, try to load the next ad for future use
            loadInterstitialAd();
        } catch (error) {
            console.error('Error showing interstitial ad:', error);
            // If ad fails to show, we might still want to complete the task
            // or show a fallback. For simplicity, we'll proceed as if shown.
            if (window.currentVideoTaskButton) {
                 // Even if ad fails to show, for user experience,
                 // you might still increment progress or give an error message
                 // For now, let's just re-load for next attempt.
                loadInterstitialAd();
            }
        }
    } else {
        console.warn('Interstitial Ad not loaded. Attempting to load...');
        await loadInterstitialAd(); // Try to load it
        if (interstitialAd && interstitialAd.isLoaded()) {
            await interstitialAd.show(); // Then try to show it again
            loadInterstitialAd(); // Load next one
        } else {
            console.error('Interstitial Ad could not be loaded and shown.');
            // Fallback: If ad really can't load/show, consider giving the user
            // task credit anyway to avoid frustration, or offer an alternative.
            if (window.currentVideoTaskButton) {
                const taskId = window.currentVideoTaskButton.getAttribute('data-task-id');
                const reward = parseInt(window.currentVideoTaskButton.getAttribute('data-reward'));
                const requiredWatches = parseInt(window.currentVideoTaskButton.getAttribute('data-required-watches'));

                console.warn("Ad failed to load/show, still progressing task for user experience.");
                gameState.taskProgress[taskId]++;
                window.currentVideoTaskButton.textContent = `WATCH ${gameState.taskProgress[taskId]}/${requiredWatches}`;

                if (gameState.taskProgress[taskId] >= requiredWatches) {
                    completeTask(window.currentVideoTaskButton, taskId, reward);
                }
                window.currentVideoTaskButton = null;
            }
        }
    }
}

// --- End AdsGram Integration ---

// Initialize game when DOM is loaded
// This part is moved inside DOMContentLoaded listener above.

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

    // Task buttons - Original setupEventListeners needs modification.
    // We will now handle 'watch video' tasks separately
    // and ensure general task buttons use the new completeTask signature.
    document.querySelectorAll('.task-section .task-item .task-btn').forEach(button => {
        // We've already set onclick for these in HTML. If you want to use addEventListener
        // you'd need to remove the onclick from HTML and modify this part.
        // For simplicity, sticking with onclick from HTML for now for tasks
        // that don't involve watching ads.
    });

    // Initialize the display of watch video task progress
    initializeWatchVideoTaskDisplay();
}

function initializeWatchVideoTaskDisplay() {
    const watch3Btn = document.querySelector('button[onclick*="watchVideoTask(\'watch3\'"]');
    if (watch3Btn) {
        watch3Btn.textContent = `WATCH ${gameState.taskProgress.watch3}/3`;
        if (gameState.taskProgress.watch3 >= 3) {
            watch3Btn.disabled = true;
            watch3Btn.textContent = 'COMPLETED';
            watch3Btn.style.background = '#666';
        }
    }
    const watch5Btn = document.querySelector('button[onclick*="watchVideoTask(\'watch5\'"]');
    if (watch5Btn) {
        watch5Btn.textContent = `WATCH ${gameState.taskProgress.watch5}/5`;
        if (gameState.taskProgress.watch5 >= 5) {
            watch5Btn.disabled = true;
            watch5Btn.textContent = 'COMPLETED';
            watch5Btn.style.background = '#666';
        }
    }
    const watch10Btn = document.querySelector('button[onclick*="watchVideoTask(\'watch10\'"]');
    if (watch10Btn) {
        watch10Btn.textContent = `WATCH ${gameState.taskProgress.watch10}/10`;
        if (gameState.taskProgress.watch10 >= 10) {
            watch10Btn.disabled = true;
            watch10Btn.textContent = 'COMPLETED';
            watch10Btn.style.background = '#666';
        }
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

// Universal function to complete tasks (now called directly for non-video tasks or by ad close listener)
function completeTask(button, taskId, reward) {
    gameState.tokens += reward;
    updateDisplay();

    // Disable button and show completed
    button.textContent = 'COMPLETED';
    button.disabled = true;
    button.style.background = '#666';

    // (Optional) Save state to localStorage to persist task completion
    // localStorage.setItem(`task_${taskId}_completed`, 'true');
    // localStorage.setItem(`task_${taskId}_watched`, gameState.taskProgress[taskId]); // For video tasks
}

// New function to handle "Watch Video" tasks
async function watchVideoTask(taskId, reward, requiredWatches) {
    const button = event.target; // Get the button that was clicked

    if (gameState.taskProgress[taskId] >= requiredWatches) {
        // Task already completed
        return;
    }

    // Store a reference to the button so the ad close listener knows which one it is
    window.currentVideoTaskButton = button;

    // Show the interstitial ad
    await showInterstitialAd(); // This will handle loading if not already loaded

    // Note: The actual increment and completion will happen in the `interstitialAd.on('close')` event.
    // This ensures the user must watch (or close) the ad before getting credit.
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
