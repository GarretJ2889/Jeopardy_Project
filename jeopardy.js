const API_URL = "https://rithm-jeopardy.herokuapp.com/api/"; // The URL of the API.
const NUMBER_OF_CATEGORIES = 6; // Number of categories to fetch.
const NUMBER_OF_CLUES_PER_CATEGORY = 5; // Number of clues to display per category.

let categories = []; // Fetched categories with clues.
let score = 0; // Player's score.

// Show or hide the loading spinner
function setLoading(isLoading) {
  const spinner = document.getElementById('spinner');
  spinner.classList.toggle('disabled', !isLoading);
}

// Fetch random category IDs
async function getCategoryIds() {
  const response = await axios.get(`${API_URL}categories?count=100`);
  const shuffled = _.shuffle(response.data);
  return shuffled.slice(0, NUMBER_OF_CATEGORIES).map(cat => cat.id);
}

// Fetch category data with clues
async function getCategory(catId) {
  const response = await axios.get(`${API_URL}category?id=${catId}`);
  const category = response.data;
  const clues = _.shuffle(category.clues).slice(0, NUMBER_OF_CLUES_PER_CATEGORY);
  return { title: category.title, clues };
}

// Populate the game board with categories and clues
async function setupGameBoard() {
  setLoading(true);

  const catIds = await getCategoryIds();
  categories = await Promise.all(catIds.map(getCategory));

  renderGameBoard();
  setLoading(false);
  document.getElementById('play').textContent = 'Reset Game'; // Change button text
}

// Render the game board
function renderGameBoard() {
  const categoriesRow = document.getElementById('categories');
  const cluesRow = document.getElementById('clues');
  categoriesRow.innerHTML = '';
  cluesRow.innerHTML = '';

  categories.forEach((category, catIndex) => {
    const th = document.createElement('th');
    th.textContent = category.title;
    th.dataset.catIndex = catIndex; // Track category index
    categoriesRow.appendChild(th);

    const td = document.createElement('td');
    category.clues.forEach((clue, clueIndex) => {
      const clueDiv = document.createElement('div');
      clueDiv.classList.add('clue');
      clueDiv.dataset.catIndex = catIndex;
      clueDiv.dataset.clueIndex = clueIndex;
      clueDiv.textContent = '?'; // Default display

      const savedState = getSavedClueState(catIndex, clueIndex);
      if (savedState) {
        clueDiv.textContent = savedState.text;
        if (savedState.disabled) {
          clueDiv.classList.add('disabled');
        }
      }

      clueDiv.addEventListener('click', () => handleClueClick(clueDiv, catIndex, clueIndex));
      td.appendChild(clueDiv);
    });
    cluesRow.appendChild(td);
  });

  updateScoreDisplay();
}

// Handle clue click: Show question on first click, replace with answer on second click
function handleClueClick(clueDiv, catIndex, clueIndex) {
  if (clueDiv.classList.contains('disabled')) return; // Prevent interaction if disabled

  const clue = categories[catIndex].clues[clueIndex];

  if (clueDiv.textContent === '?') {
    // Show the question
    clueDiv.textContent = clue.question;
  } else {
    // Replace with the answer and disable the clue
    clueDiv.textContent = clue.answer;
    clueDiv.classList.add('disabled');
    updateScore(100); // Update score
    checkCategoryCompletion(catIndex); // Check if all clues in the category are completed
  }

  saveClueState(catIndex, clueIndex, clueDiv.textContent, clueDiv.classList.contains('disabled'));
  saveGameState();
}

// Check if all clues in a category are viewed
function checkCategoryCompletion(catIndex) {
  const categoryClues = document.querySelectorAll(`.clue[data-cat-index="${catIndex}"]`);
  const allDisabled = Array.from(categoryClues).every(clue => clue.classList.contains('disabled'));

  if (allDisabled) {
    const categoryHeader = document.querySelector(`th[data-cat-index="${catIndex}"]`);
    categoryHeader.classList.add('viewed'); // Add the 'viewed' class
    console.log(`Category ${catIndex} marked as viewed.`);
  }
}

// Update the score display
function updateScore(points) {
  score += points;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  document.getElementById('active-clue').textContent = `Score: ${score}`;
}

// Save the current game state to localStorage
function saveGameState() {
  const gameState = {
    categories,
    score,
  };
  localStorage.setItem('jeopardyGameState', JSON.stringify(gameState));
}

// Load the game state from localStorage or start a new game
function loadOrStartGame() {
  const savedState = JSON.parse(localStorage.getItem('jeopardyGameState'));
  if (savedState) {
    categories = savedState.categories;
    score = savedState.score;
    renderGameBoard();
    document.getElementById('play').textContent = 'Reset Game'; // Ensure button text is correct
  } else {
    setupGameBoard(); // Start a new game if no saved data is found
  }
}

// Save the state of an individual clue
function saveClueState(catIndex, clueIndex, text, disabled) {
  const clueState = { text, disabled };
  localStorage.setItem(`clue-${catIndex}-${clueIndex}`, JSON.stringify(clueState));
}

// Get the saved state of an individual clue
function getSavedClueState(catIndex, clueIndex) {
  return JSON.parse(localStorage.getItem(`clue-${catIndex}-${clueIndex}`));
}

// Reset the game and clear the board
function resetGame() {
  localStorage.clear();
  score = 0;
  document.getElementById('active-clue').textContent = '';

  const categoriesRow = document.getElementById('categories');
  const cluesRow = document.getElementById('clues');
  categoriesRow.innerHTML = '';
  cluesRow.innerHTML = '';

  document.getElementById('play').textContent = 'Start the Game!'; // Reset button text
}

// Initialize game on button click
document.getElementById('play').addEventListener('click', () => {
  const button = document.getElementById('play');
  if (button.textContent === 'Start the Game!') {
    setupGameBoard();
  } else {
    resetGame();
  }
});

// Start game on page load or load saved state
window.addEventListener('load', loadOrStartGame);