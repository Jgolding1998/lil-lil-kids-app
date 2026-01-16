// Lil Lil Kids App
//
// This script drives the interactive learning application.  Children can
// choose between multiple “packs” (colours, animals, letters, numbers,
// shapes, fruits and seasons).  When an item is tapped the app either
// speaks the name using the browser's SpeechSynthesis API or plays an
// associated sound effect.  Animal items include remote sound effect
// sources so that clicking the tile will play the corresponding noise.

// Define all of the content packs.  Each pack is an array of items.
// Items may include:
//   - name: the text label for the tile
//   - emoji: an emoji or single character to display
//   - hex: for colour tiles, the background colour
//   - textColor: optional text colour for improved contrast on light tiles
//   - sound: optional URL to a sound file to play on click
// Define all of the content packs.  Each pack is an array of items.
// Items may include:
//   - name: the text label for the item
//   - image: relative path to an image within assets/images for packs that use images
//   - hex/textColor: for colour tiles, the background colour and optional text colour
//   - sound: optional URL to a sound file to play on click (animals)
const packs = {
  // Use US spelling “Colors” instead of “Colours” for consistency
  Colors: [
    { name: 'Red', hex: '#E74C3C', textColor: '#FFFFFF' },
    { name: 'Blue', hex: '#3498DB', textColor: '#FFFFFF' },
    { name: 'Green', hex: '#27AE60', textColor: '#FFFFFF' },
    { name: 'Yellow', hex: '#F1C40F', textColor: '#333333' },
    { name: 'Orange', hex: '#E67E22', textColor: '#FFFFFF' },
    { name: 'Purple', hex: '#9B59B6', textColor: '#FFFFFF' }
  ],
  Animals: [
    // Each animal includes an image and a local sound effect stored in the
    // `sounds/` directory.  These local files are included in the
    // repository so that audio plays reliably without depending on
    // cross‑origin policies.  If playback fails, the app will speak the name.
    { name: 'Dog',    image: 'dog.png',    sound: 'dog.mp3'    },
    { name: 'Cat',    image: 'cat.png',    sound: 'cat.mp3'    },
    { name: 'Rabbit', image: 'rabbit.png', sound: 'rabbit.wav'  },
    { name: 'Lion',   image: 'lion.png',   sound: 'lion.mp3'   },
    { name: 'Cow',    image: 'cow.png',    sound: 'cow.mp3'    },
    { name: 'Monkey', image: 'monkey.png', sound: 'monkey.mp3' }
  ],
  Letters: (() => {
    // Generate A–Z automatically.  Letters do not use images; they will
    // be rendered as large text.
    const letters = [];
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode('A'.charCodeAt(0) + i);
      letters.push({ name: ch });
    }
    return letters;
  })(),
  Numbers: (() => {
    // Create numbers 1–20.  Numbers are rendered as large text and
    // spoken using the name array.
    const names = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
    const numbers = [];
    for (let i = 0; i < names.length; i++) {
      const num = i + 1;
      numbers.push({ name: names[i], value: num });
    }
    return numbers;
  })(),
  Shapes: [
    { name: 'Circle', image: 'circle.png' },
    { name: 'Square', image: 'square.png' },
    { name: 'Triangle', image: 'triangle.png' },
    { name: 'Rectangle', image: 'rectangle.png' },
    { name: 'Star', image: 'star.png' },
    { name: 'Heart', image: 'heart.png' }
  ],
  Fruits: [
    { name: 'Apple', image: 'apple.png' },
    { name: 'Banana', image: 'banana.png' },
    { name: 'Grapes', image: 'grapes.png' },
    { name: 'Orange', image: 'orange.png' },
    { name: 'Strawberry', image: 'strawberry.png' },
    { name: 'Pineapple', image: 'pineapple.png' }
  ],
  Seasons: [
    { name: 'Spring', image: 'spring.png' },
    { name: 'Summer', image: 'summer.png' },
    { name: 'Autumn', image: 'autumn.png' },
    { name: 'Winter', image: 'winter.png' }
  ]
};

// Cache of Audio objects keyed by sound URL.  This avoids reloading the
// same sound repeatedly and allows concurrent playback if needed.
const soundCache = {};

// Flag indicating whether the games have been unlocked via a one‑time
// purchase.  The value is stored in localStorage so it persists
// across sessions and can be restored offline.  Parents can unlock
// the games for $3.99 via the app store.  Until unlocked,
// attempting to start a game will prompt the user to purchase.
let gamesUnlocked = false;

function loadUnlockState() {
  try {
    const val = localStorage.getItem('gamesUnlocked');
    gamesUnlocked = val === 'true';
  } catch (_) {
    gamesUnlocked = false;
  }
}

function saveUnlockState() {
  try {
    localStorage.setItem('gamesUnlocked', gamesUnlocked ? 'true' : 'false');
  } catch (_) {
    // ignore storage errors (e.g. private browsing)
  }
}

// Prompt parents to unlock the games.  In a real native app this
// function would call a Capacitor/Ionic in‑app purchase plugin to
// perform the transaction.  Here we simply display a confirm dialog
// and set the unlock flag if the user confirms.  Replace this stub
// with your own payment integration.
function promptPurchase() {
  if (confirm('Unlock all games for $3.99?')) {
    purchaseGames();
  }
}

function purchaseGames() {
  // TODO: integrate with native in‑app purchase plugins for Apple and
  // Google Play.  For this demo we simply set the flag and persist
  // it locally.  You should verify receipts via your backend.
  gamesUnlocked = true;
  saveUnlockState();
  alert('Thank you! Games are now unlocked.');
}

// Speak a given text using the browser's SpeechSynthesis API.  Fallback
// for when sound effects are not available or fail to load.
function speak(text) {
  if ('speechSynthesis' in window) {
    // If a single uppercase letter is supplied (e.g. "A"), convert
    // it to lowercase so that the SpeechSynthesis API doesn’t prepend
    // "capital" to the pronunciation.  This makes the voice simply
    // say the letter name rather than "capital A".  We only apply
    // this transformation for single characters A–Z.
    if (typeof text === 'string' && text.length === 1 && /[A-Z]/.test(text)) {
      text = text.toLowerCase();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to choose a more pleasant, child‑friendly voice.  Many
    // browsers provide multiple voices; we look for names containing
    // "child", "kids", "Samantha", or "Female".  If none are
    // available we fall back to the first voice returned.  We also
    // adjust the pitch and rate to be slightly higher and slower,
    // which sounds friendlier to young ears.
    const voices = window.speechSynthesis.getVoices();
    let voice = null;
    if (voices && voices.length) {
      voice = voices.find(v => /child|kids|samantha|female/i.test(v.name));
      if (!voice) {
        // As a fallback, prefer Google voices which often sound more natural
        voice = voices.find(v => /google/i.test(v.name));
      }
      if (!voice) {
        // Default to the first available voice
        voice = voices[0];
      }
      utterance.voice = voice;
    }
    utterance.lang = 'en-US';
    // Adjust the pitch and rate for a more playful tone
    utterance.pitch = 1.2;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    // If SpeechSynthesis is unavailable, fallback to alert
    alert(text);
  }
}

// Play a sound effect from a URL.  If the sound hasn't been used
// before it is created and stored in soundCache.  If playback
// fails for any reason the name is spoken instead.
function playSound(url, fallbackName) {
  try {
    if (!soundCache[url]) {
      const audio = new Audio(url);
      // Attempt to allow cross‑origin audio sources
      audio.crossOrigin = 'anonymous';
      // Ensure animal sounds do not loop.  Some audio files (e.g. the
      // rabbit sound) may be long; by explicitly disabling looping
      // we prevent them from repeating indefinitely.  When a new
      // item is shown the currently playing audio will be paused via
      // pauseAllSounds().
      audio.loop = false;
      soundCache[url] = audio;
    }
    const audio = soundCache[url];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // If there is an error (e.g. user hasn't interacted yet), speak instead
      speak(fallbackName);
    });
  } catch (err) {
    speak(fallbackName);
  }
}

// Pause all currently playing sounds.  This helper is called before
// rendering a new item so that long audio (e.g. the rabbit) stops
// immediately when the user swipes to the next item.  Without
// explicitly pausing the audio it would continue playing over the
// next item.
function pauseAllSounds() {
  Object.values(soundCache).forEach(audio => {
    try {
      audio.pause();
    } catch (_) {
      // ignore errors from paused or unloaded audio
    }
  });
}

// Build the navigation buttons for each pack.
// Each button is configured to enter the selected pack when tapped.
/**
 * Build the horizontally scrollable list of pack cards.  Each card
 * displays an image (if available) or coloured swatch along with the
 * pack name.  Tapping a card enters the corresponding pack.
 */
function buildPackCards() {
  const selector = document.getElementById('pack-selector');
  selector.innerHTML = '';
  Object.keys(packs).forEach(packName => {
    const items = packs[packName];
    // Determine a representative image or colour for the pack
    let cardImage = null;
    let cardColour = null;
    // Find the first item with an image property
    for (const item of items) {
      if (item.image) {
        cardImage = item.image;
        break;
      }
    }
    // For Colors pack, use the first colour's hex value
    if (packName === 'Colors' && items.length > 0) {
      cardColour = items[0].hex;
    }
    // For Letters and Numbers, supply custom icons so the card isn't blank
    if (packName === 'Letters') {
      cardImage = 'letters_icon.png';
    } else if (packName === 'Numbers') {
      cardImage = 'numbers_icon.png';
    }
    // Create card element
    const card = document.createElement('div');
    card.classList.add('pack-card');
    card.dataset.pack = packName;
    // Create image or colour preview
    const preview = document.createElement('div');
    preview.classList.add('pack-preview');
    if (cardImage) {
      const img = document.createElement('img');
      img.src = cardImage;
      img.alt = `${packName} preview`;
      preview.appendChild(img);
    } else if (cardColour) {
      preview.style.backgroundColor = cardColour;
    } else {
      // Use a placeholder gradient for packs without image or colour
      preview.style.background = 'linear-gradient(135deg,#ffeef7,#eafafc)';
    }
    card.appendChild(preview);
    // Add label
    const label = document.createElement('div');
    label.classList.add('pack-label');
    label.textContent = packName;
    card.appendChild(label);
    // Click handler
    card.addEventListener('click', () => enterPack(packName));
    selector.appendChild(card);
  });
}

// Current pack and index for the viewer state
let currentPackName = null;
let currentIndex = 0;

// Enter a pack: hide the pack selector and show the viewer with the first item
function enterPack(packName) {
  currentPackName = packName;
  currentIndex = 0;
  // Hide the pack list within the learn section so the item fills more of the screen
  const packSelector = document.getElementById('pack-selector');
  if (packSelector) {
    packSelector.style.display = 'none';
  }
  // Hide the subtitle inside the learn section to maximise space
  const subtitle = document.querySelector('#learn-section .subtitle');
  if (subtitle) subtitle.style.display = 'none';
  // We intentionally leave the header and footer visible when a pack is
  // open.  This ensures the home button and settings button remain
  // accessible so children can return to the main menu or open
  // settings at any time.  Previously the header and footer were
  // hidden here but that made it difficult to navigate back.
  // Show viewer
  const viewer = document.getElementById('viewer');
  viewer.hidden = false;
  // Render first item
  renderCurrentItem();
}

// Exit the current pack and return to pack selection
function exitPack() {
  // Stop any currently playing sound (pause all cached audio)
  Object.values(soundCache).forEach(audio => {
    try {
      audio.pause();
    } catch (_) {
      // ignore
    }
  });
  // Reset state
  currentPackName = null;
  currentIndex = 0;
  // Hide viewer
  document.getElementById('viewer').hidden = true;
  // Show pack list again
  const packSelector = document.getElementById('pack-selector');
  if (packSelector) {
    packSelector.style.display = '';
  }
  // Show the subtitle inside the learn section
  const subtitle = document.querySelector('#learn-section .subtitle');
  if (subtitle) subtitle.style.display = '';
  // Restore header visibility
  const header = document.querySelector('header');
  if (header) {
    header.style.display = '';
  }
  // Restore footer visibility
  const footer = document.querySelector('footer');
  if (footer) {
    footer.style.display = '';
  }
}

// Render the current item in the viewer
function renderCurrentItem() {
  const container = document.getElementById('viewer-content');
  container.innerHTML = '';
  const packItems = packs[currentPackName];
  const item = packItems[currentIndex];
  // Pause any audio that might be currently playing.  This prevents
  // lingering sounds (e.g. the rabbit) from continuing when you swipe
  // between items.
  pauseAllSounds();
  // Create wrapper for the item display
  const wrapper = document.createElement('div');
  wrapper.classList.add('item-view');
  // For colours, render a large coloured tile
  if (currentPackName === 'Colors' && item.hex) {
    wrapper.classList.add('colour-view');
    wrapper.style.backgroundColor = item.hex;
    wrapper.style.color = item.textColor;
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('colour-name');
    nameSpan.textContent = item.name;
    wrapper.appendChild(nameSpan);
  } else if (item.image) {
    // Image-based packs (animals, shapes, fruits, seasons)
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.classList.add('item-image');
    wrapper.appendChild(img);
    const labelDiv = document.createElement('div');
    labelDiv.classList.add('label-large');
    labelDiv.textContent = item.name;
    wrapper.appendChild(labelDiv);
  } else {
    // Text-based packs (letters and numbers)
    const textDiv = document.createElement('div');
    textDiv.classList.add('text-large');
    // For numbers we show the numeric value; for letters the name is the letter
    if (typeof item.value !== 'undefined') {
      textDiv.textContent = item.value;
    } else {
      textDiv.textContent = item.name;
    }
    wrapper.appendChild(textDiv);
    const labelDiv = document.createElement('div');
    labelDiv.classList.add('label-large');
    labelDiv.textContent = item.name;
    wrapper.appendChild(labelDiv);
  }
  // On click: play sound or speak.  For colours and seasons we
  // prepend “This is …” so the voice sounds more natural (e.g.
  // “This is blue” or “This is Winter”).  For other packs we just
  // speak the name.  If a sound is defined we play it instead of
  // speaking.
  wrapper.addEventListener('pointerdown', () => {
    if (item.sound) {
      playSound(item.sound, item.name);
    } else {
      if (currentPackName === 'Colors' || currentPackName === 'Seasons') {
        speak('This is ' + item.name);
      } else {
        speak(item.name);
      }
    }
  });
  container.appendChild(wrapper);
}

// Navigate to the next item within the current pack
function nextItem() {
  const items = packs[currentPackName];
  currentIndex = (currentIndex + 1) % items.length;
  renderCurrentItem();
}

// Navigate to the previous item within the current pack
function prevItem() {
  const items = packs[currentPackName];
  currentIndex = (currentIndex - 1 + items.length) % items.length;
  renderCurrentItem();
}

// Attach swipe detection to the viewer content for mobile devices
function addSwipeDetection() {
  const container = document.getElementById('viewer-content');
  let touchStartX = 0;
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  container.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        nextItem();
      } else {
        prevItem();
      }
    }
  });
}

// ===================== Section Navigation =====================
// Enter one of the top‑level sections (learn, colour, draw or games).
// Hides the section menu and shows the selected section.  Always hides
// the viewer in case it was open from a previous pack.
function enterSection(section) {
  // Show loading screen briefly when switching sections.  This gives
  // children visual feedback that something is happening.  We hide
  // the previous section content, display the loader, and then
  // reveal the selected section after a short delay.
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.display = 'flex';
  }
  // Hide all sections immediately
  document.getElementById('section-menu').hidden = true;
  document.getElementById('learn-section').hidden = true;
  document.getElementById('color-section').hidden = true;
  document.getElementById('draw-section').hidden = true;
  document.getElementById('games-section').hidden = true;
  // Always hide the viewer when switching sections
  const viewer = document.getElementById('viewer');
  viewer.hidden = true;
  // Restore header and footer visibility when entering a new section
  const header = document.querySelector('header');
  if (header) header.style.display = '';
  const footer = document.querySelector('footer');
  if (footer) footer.style.display = '';
  // After a short delay, reveal the selected section and hide the loader
    // Load the game unlock state from local storage
    loadUnlockState();
    setTimeout(() => {
    if (loading) {
      loading.style.display = 'none';
    }
    switch (section) {
      case 'learn':
        document.getElementById('learn-section').hidden = false;
        // Ensure the pack list is visible and subtitle shown
        const packSelector = document.getElementById('pack-selector');
        if (packSelector) packSelector.style.display = '';
        const subtitle = document.querySelector('#learn-section .subtitle');
        if (subtitle) subtitle.style.display = '';
        break;
      case 'color':
        document.getElementById('color-section').hidden = false;
        buildColorGallery();
        // Prepare palette for colouring
        initPalette(document.getElementById('color-palette'));
        break;
      case 'draw':
        document.getElementById('draw-section').hidden = false;
        initPalette(document.getElementById('draw-palette'));
        setupDrawingCanvas(document.getElementById('draw-canvas'));
        break;
      case 'games':
        // Show the games section and display the game menu.  The specific
        // game areas will be hidden until a game is chosen.
        document.getElementById('games-section').hidden = false;
        showGameMenu();
        break;
      default:
        // If unknown section, return to menu
        document.getElementById('section-menu').hidden = false;
    }
  }, 600);
}

// Return to the top‑level section menu
function returnToMenu() {
  // Hide all sections
  document.getElementById('learn-section').hidden = true;
  document.getElementById('color-section').hidden = true;
  document.getElementById('draw-section').hidden = true;
  document.getElementById('games-section').hidden = true;
  // Show section menu
  document.getElementById('section-menu').hidden = false;
  // Restore header and footer
  const header = document.querySelector('header');
  if (header) header.style.display = '';
  const footer = document.querySelector('footer');
  if (footer) footer.style.display = '';
}

    /**
     * Show the games menu. Hides any active game areas and back button. This
     * function is called when the Games section is first entered or when
     * returning from a specific game.
     */
    function showGameMenu() {
      const menu = document.getElementById('game-menu');
      const sortGame = document.getElementById('sort-game');
      const memoryGame = document.getElementById('memory-game');
      const backBtn = document.getElementById('game-back-btn');
      const fruitGame = document.getElementById('fruit-game');
      const habitatGame = document.getElementById('habitat-game');
    const puzzleGame = document.getElementById('puzzle-game');
      const fruitReset = document.getElementById('fruit-reset-btn');
      const habitatReset = document.getElementById('habitat-reset-btn');
    const puzzleReset = document.getElementById('puzzle-reset-btn');
    // Hide reset buttons and success messages when showing the game menu
    const sortReset = document.getElementById('game-reset-btn');
    const memoryReset = document.getElementById('memory-reset-btn');
    const sortSuccess = document.getElementById('game-success-message');
    const memSuccess = document.getElementById('memory-success-message');
    const fruitScore = document.getElementById('fruit-scoreboard');
    const fruitSuccess = document.getElementById('fruit-success-message');
    const habitatSuccess = document.getElementById('habitat-success-message');
    const puzzleSuccess = document.getElementById('puzzle-success-message');
      if (menu) menu.hidden = false;
      if (sortGame) sortGame.hidden = true;
      if (memoryGame) memoryGame.hidden = true;
      if (fruitGame) fruitGame.hidden = true;
      if (habitatGame) habitatGame.hidden = true;
    if (puzzleGame) puzzleGame.hidden = true;
      if (backBtn) backBtn.hidden = true;
    if (sortReset) {
      sortReset.hidden = true;
      sortReset.style.display = 'none';
    }
    if (memoryReset) {
      memoryReset.hidden = true;
      memoryReset.style.display = 'none';
    }
    if (fruitReset) {
      fruitReset.hidden = true;
      fruitReset.style.display = 'none';
    }
    if (habitatReset) {
      habitatReset.hidden = true;
      habitatReset.style.display = 'none';
    }
    if (puzzleReset) {
      puzzleReset.hidden = true;
      puzzleReset.style.display = 'none';
    }
    if (sortSuccess) sortSuccess.style.display = 'none';
    if (memSuccess) memSuccess.style.display = 'none';
    // Hide the fruit scoreboard and success message when returning to menu
    if (fruitScore) fruitScore.style.display = 'none';
    if (fruitSuccess) fruitSuccess.style.display = 'none';
    // Hide habitat success message when returning to menu
    if (habitatSuccess) habitatSuccess.style.display = 'none';
    if (puzzleSuccess) puzzleSuccess.style.display = 'none';

      // When returning to the game menu, restore the header and footer
      // visibility so the UI feels like a separate screen.  This is
      // complementary to hiding them in enterGame().
      // Restore the in‑app header and footer (the ones inside #app) when returning
      // to the game menu.  Selecting #app first ensures we don't inadvertently
      // hide the page's global header and footer.
      const appEl = document.getElementById('app');
      const headerEl = appEl ? appEl.querySelector('header') : null;
      const footerEl = appEl ? appEl.querySelector('footer') : null;
      if (headerEl) headerEl.style.display = '';
      if (footerEl) footerEl.style.display = '';
    }

    /**
     * Enter a specific mini‑game.  When a child selects a game from the
     * games menu, this function hides the menu, shows the chosen game
     * container and initialises the game logic.  A back button is shown
     * so that children can return to the game menu at any time.
     * @param {string} gameName Either 'sort' or 'memory'
     */
    function enterGame(gameName) {
      const menu = document.getElementById('game-menu');
      const sortGame = document.getElementById('sort-game');
      const memoryGame = document.getElementById('memory-game');
      const backBtn = document.getElementById('game-back-btn');
      if (menu) menu.hidden = true;
      if (backBtn) backBtn.hidden = false;
      // Keep the in‑app header and footer visible while a mini‑game is active.
      // The Home and Settings buttons live in the header and should remain
      // accessible during game play.  Previously we hid these elements to
      // maximise space, but this left the user without navigation.  By
      // removing the code that modified header/footer visibility, the
      // elements retain their default display styles.

      // Explicitly restore the header and footer display styles in case they were
      // previously hidden by another game.  Selecting the app container first
      // ensures we are only affecting the header and footer inside the app
      // iframe, not the global page header/footer.  Setting the display
      // property to an empty string lets the elements fall back to their
      // stylesheet‑defined display (flex for header and block for footer).
      const appEl = document.getElementById('app');
      if (appEl) {
        const appHeader = appEl.querySelector('header');
        const appFooter = appEl.querySelector('footer');
        if (appHeader) appHeader.style.display = '';
        if (appFooter) appFooter.style.display = '';
      }
      const sortReset = document.getElementById('game-reset-btn');
      const memoryReset = document.getElementById('memory-reset-btn');
      const fruitReset = document.getElementById('fruit-reset-btn');
      const habitatReset = document.getElementById('habitat-reset-btn');
      const puzzleReset = document.getElementById('puzzle-reset-btn');
      const fruitGame = document.getElementById('fruit-game');
      const habitatGame = document.getElementById('habitat-game');
      const puzzleGame = document.getElementById('puzzle-game');
      if (gameName === 'sort') {
        if (sortGame) sortGame.hidden = false;
        if (memoryGame) memoryGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show sort reset button and hide other reset buttons
        if (sortReset) {
          sortReset.hidden = false;
          sortReset.style.display = 'inline-block';
        }
        if (memoryReset) {
          memoryReset.hidden = true;
          memoryReset.style.display = 'none';
        }
        if (fruitReset) {
          fruitReset.hidden = true;
          fruitReset.style.display = 'none';
        }
        if (habitatReset) {
          habitatReset.hidden = true;
          habitatReset.style.display = 'none';
        }
        initSortGame();
      } else if (gameName === 'memory') {
        if (memoryGame) memoryGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show memory reset button and hide other reset buttons
        if (memoryReset) {
          memoryReset.hidden = false;
          memoryReset.style.display = 'inline-block';
        }
        if (sortReset) {
          sortReset.hidden = true;
          sortReset.style.display = 'none';
        }
        if (fruitReset) {
          fruitReset.hidden = true;
          fruitReset.style.display = 'none';
        }
        if (habitatReset) {
          habitatReset.hidden = true;
          habitatReset.style.display = 'none';
        }
        initMemoryGame();
      } else if (gameName === 'fruit') {
        if (fruitGame) fruitGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (memoryGame) memoryGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show fruit reset button and hide others
        if (fruitReset) {
          fruitReset.hidden = false;
          fruitReset.style.display = 'inline-block';
        }
        if (sortReset) {
          sortReset.hidden = true;
          sortReset.style.display = 'none';
        }
        if (memoryReset) {
          memoryReset.hidden = true;
          memoryReset.style.display = 'none';
        }
        if (habitatReset) {
          habitatReset.hidden = true;
          habitatReset.style.display = 'none';
        }
        initFruitGame();
      } else if (gameName === 'habitat') {
        if (habitatGame) habitatGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (memoryGame) memoryGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        if (puzzleGame) puzzleGame.hidden = true;
        // Show habitat reset button and hide others
        if (habitatReset) {
          habitatReset.hidden = false;
          habitatReset.style.display = 'inline-block';
        }
        if (sortReset) {
          sortReset.hidden = true;
          sortReset.style.display = 'none';
        }
        if (memoryReset) {
          memoryReset.hidden = true;
          memoryReset.style.display = 'none';
        }
        if (fruitReset) {
          fruitReset.hidden = true;
          fruitReset.style.display = 'none';
        }
        if (puzzleReset) {
          puzzleReset.hidden = true;
          puzzleReset.style.display = 'none';
        }
        initHabitatGame();
      } else if (gameName === 'puzzle') {
        if (puzzleGame) puzzleGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (memoryGame) memoryGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show puzzle reset button and hide others
        if (puzzleReset) {
          puzzleReset.hidden = false;
          puzzleReset.style.display = 'inline-block';
        }
        if (sortReset) {
          sortReset.hidden = true;
          sortReset.style.display = 'none';
        }
        if (memoryReset) {
          memoryReset.hidden = true;
          memoryReset.style.display = 'none';
        }
        if (fruitReset) {
          fruitReset.hidden = true;
          fruitReset.style.display = 'none';
        }
        if (habitatReset) {
          habitatReset.hidden = true;
          habitatReset.style.display = 'none';
        }
        initPuzzleGame();
      }
    }

    /**
     * Return from a mini‑game back to the games menu.  Hides all game
     * containers and shows the menu again.  Used by the back button.
     */
    function returnToGamesMenu() {
      showGameMenu();
    }

    /**
     * Initialise the memory matching game.  Creates a grid of cards, each
     * containing a hidden shape image.  Children can tap cards to reveal
     * them; matching pairs disappear while mismatches flip back after a
     * short delay.  When all pairs have been matched a success message
     * appears.  A restart button resets the game.
     */
    function initMemoryGame() {
      const shapes = ['circle','square','triangle','rectangle','star','heart'];
      // Create an array with each shape twice for matching
      const pairs = shapes.concat(shapes);
      // Shuffle the array
      const shuffled = pairs.sort(() => Math.random() - 0.5);
      const board = document.getElementById('memory-board');
      const successMsg = document.getElementById('memory-success-message');
      if (!board) return;
      board.innerHTML = '';
      let firstCard = null;
      let lockBoard = false;
      let matches = 0;
      // Hide success message at start
      if (successMsg) successMsg.style.display = 'none';
      shuffled.forEach(shape => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.shape = shape;
        // Create image element and hide initially
        const img = document.createElement('img');
        img.src = `${shape}.png`;
        img.alt = shape;
        img.style.visibility = 'hidden';
        card.appendChild(img);
        card.addEventListener('click', () => {
          if (card.classList.contains('matched') || lockBoard) return;
          // Prevent clicking the same card twice
          if (card === firstCard) return;
          // Reveal current card
          img.style.visibility = 'visible';
          card.dataset.revealed = 'true';
          // If there is no previous card selected, store this as the first
          if (!firstCard) {
            firstCard = card;
            return;
          }
          // Otherwise compare with the previous card
          lockBoard = true;
          const firstImg = firstCard.querySelector('img');
          if (firstCard.dataset.shape === card.dataset.shape) {
            // Match: mark both cards as matched and leave visible
            firstCard.classList.add('matched');
            card.classList.add('matched');
            firstImg.style.visibility = 'visible';
            img.style.visibility = 'visible';
            matches++;
            // Clear selection and unlock
            firstCard = null;
            lockBoard = false;
            // Check if all pairs matched
            if (matches === shapes.length) {
              if (successMsg) successMsg.style.display = 'block';
            }
          } else {
            // Not a match: hide both cards after a short delay
            setTimeout(() => {
              firstImg.style.visibility = 'hidden';
              img.style.visibility = 'hidden';
              firstCard = null;
              lockBoard = false;
            }, 800);
          }
        });
        board.appendChild(card);
      });
    }

// ===================== Colour and Draw helpers =====================
// Build the gallery of pictures for colouring.  We reuse a subset of
// existing images (animals and shapes) for now.  Images are lightened
// on the canvas so children can colour over them.  Feel free to add
// additional image names to this array.
function buildColorGallery() {
  const gallery = document.getElementById('color-gallery');
  gallery.innerHTML = '';
  const images = [
    // High‑quality colouring pages supplied by the user.  We removed the
    // generic playground drawing and instead include three new cartoon
    // scenes.  These filenames correspond to assets stored in the
    // project root.  If you wish to add more pages later, simply copy
    // the image into the project folder and add its name here.
    'castle_detail.png',
    'cat_fun.png',
    'monster_truck_detail.png',
    'dog_detail.png',
    // Removed the generic playground page – users provided a better image.  Only include the high‑quality pages below.
    'dino_unicorn_fun.png'
  ];
  images.forEach(imgName => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('color-thumb');
    const img = document.createElement('img');
    img.src = imgName;
    img.alt = imgName;
    img.addEventListener('click', () => {
      showColorCanvas(imgName);
    });
    wrapper.appendChild(img);
    gallery.appendChild(wrapper);
  });
}

// Show the colouring canvas with the selected image.  The image is drawn
// semi‑transparent so that colours can be applied on top.  The palette
// should already be initialised before this is called.
let currentColourImage = null;
function showColorCanvas(imageName) {
  currentColourImage = imageName;
  document.getElementById('color-gallery').hidden = true;
  document.getElementById('color-canvas-container').hidden = false;
  const canvas = document.getElementById('color-canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Fit image into canvas while preserving aspect ratio
    const aspect = img.width / img.height;
    let drawW = canvas.width;
    let drawH = canvas.height;
    if (aspect > canvas.width / canvas.height) {
      drawH = canvas.width / aspect;
      drawW = canvas.width;
    } else {
      drawW = canvas.height * aspect;
      drawH = canvas.height;
    }
    const dx = (canvas.width - drawW) / 2;
    const dy = (canvas.height - drawH) / 2;
    // Draw faint background image.  Apply a grayscale filter and
    // lower the alpha so the picture appears as a pale outline for
    // colouring.  Save and restore the canvas state around the
    // filtered drawing.
    ctx.save();
    ctx.filter = 'grayscale(1)';
    ctx.globalAlpha = 0.4;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
  };
  img.src = imageName;
  // Initialise drawing on colour canvas
  setupDrawingCanvas(canvas);
}

// Initialises a palette of colours on the given element.  When a swatch
// is clicked the global currentColour is updated and the selected swatch
// is highlighted.  If an onSelect callback is provided it is called
// whenever a colour is chosen.
// The currently selected drawing colour.  Initialise to black so that
// the default swatch (the first one) and the drawn colour match.  This
// value will be updated when a palette swatch is selected.
let currentColour = '#000000';
function initPalette(paletteEl, onSelect) {
  if (!paletteEl) return;
  paletteEl.innerHTML = '';
  // Define a broader palette including basic primary/secondary colours,
  // plus black and white for outlines/eraser.  The colours are
  // deliberately varied so the palette doesn’t feel repetitive and
  // covers a wide range of hues.  Children can use white as an
  // “eraser” since the colouring backgrounds are white.
  const colours = [
    '#000000', // black
    '#FFFFFF', // white / eraser
    '#E74C3C', // red
    '#E67E22', // orange
    '#F1C40F', // yellow
    '#27AE60', // green
    '#3498DB', // blue
    '#9B59B6', // purple
    '#FF66CC', // pink
    '#8E44AD', // deep violet
    '#1ABC9C', // turquoise
    '#F39C12'  // amber
  ];
  colours.forEach((colour, index) => {
    const swatch = document.createElement('div');
    swatch.classList.add('swatch');
    swatch.style.backgroundColor = colour;
    swatch.addEventListener('click', () => {
      currentColour = colour;
      // Highlight the selected swatch
      paletteEl.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      if (onSelect) onSelect(colour);
    });
    paletteEl.appendChild(swatch);
    // Select the first colour by default.  When the first swatch is
    // created we also update `currentColour` to match it so that the
    // default drawing colour aligns with the highlighted swatch.  This
    // prevents a mismatch between the palette highlight and the initial
    // drawing colour.
    if (index === 0) {
      swatch.classList.add('selected');
      currentColour = colour;
    }
  });
}

// Set up drawing on a given canvas.  Draws using the currentColour and
// responds to both mouse and touch events.  Each call creates a new
// drawing context; multiple canvases may be initialised separately.
function setupDrawingCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Set a baseline line width.  This value will be scaled to match
  // the device pixel ratio when the canvas is resized.  Without
  // scaling, drawing coordinates can become misaligned on high‑DPI
  // screens because the canvas internal resolution differs from its
  // displayed size.
  ctx.lineWidth = 6;

  // Resize the drawing surface to match its on‑screen dimensions
  // and account for the device pixel ratio.  The canvas width and
  // height attributes define the coordinate system used by the
  // drawing context.  If these do not match the element's CSS size
  // then the browser will scale the canvas automatically, causing
  // pointer positions to be offset from the drawn lines.  To fix this
  // we explicitly resize the canvas whenever its bounding box changes
  // and apply a corresponding scale to the context.
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Compute current logical size of the canvas by dividing by the
    // pixel ratio.  Only update if the size has changed to avoid
    // clearing drawings unnecessarily.
    const currentWidth = canvas.width / dpr;
    const currentHeight = canvas.height / dpr;
    if (Math.round(currentWidth) !== Math.round(rect.width) || Math.round(currentHeight) !== Math.round(rect.height)) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Reset transforms before scaling; otherwise scaling will
      // accumulate each time resizeCanvas() runs.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      // Update line width to maintain consistent visual width across
      // pixel densities.  Use any existing dataset value if present.
      const lw = parseFloat(canvas.dataset.linewidth || 6);
      ctx.lineWidth = lw;
    }
  }
  // Perform an initial resize and register a handler for window
  // resize events so the canvas stays synchronised with its CSS size.
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    // Determine the current scale for pinch‑to‑zoom.  If no scale is
    // defined, default to 1.  Divide the pointer coordinates by the
    // scale so drawing aligns with the transformed canvas.
    const scale = parseFloat(canvas.dataset.scale) || 1;
    if (e.touches && e.touches.length) {
      return {
        x: (e.touches[0].clientX - rect.left) / scale,
        y: (e.touches[0].clientY - rect.top) / scale
      };
    } else {
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale
      };
    }
  }

  function startDraw(e) {
    const pos = getPos(e);
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.strokeStyle = currentColour;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    drawing = false;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDraw(e);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    endDraw();
  }, { passive: false });
}

// Enable pinch‑to‑zoom on a canvas element.  This allows children to
// zoom in and out using two fingers on touch devices.  The scale is
// clamped between 0.5 and 3 for usability.  The zoom state is stored
// on the canvas element via a data attribute.  The transform origin
// must be set (in CSS) to top left for scaling to behave predictably.
function enablePinchZoom(canvas) {
  // We implement pinch‑to‑zoom by tracking the distance between two
  // touch points and the midpoint of the pinch.  The scale is
  // anchored around the initial midpoint by updating the transform
  // origin on each move.  This prevents the canvas from snapping to
  // the top‑left corner when zooming and keeps the zoom centred on
  // where the child is pinching.
  let initialDistance = null;
  let initialScale = 1;
  let initialMidpoint = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      initialDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialScale = parseFloat(canvas.dataset.scale) || 1;
      // Compute the midpoint relative to the canvas so we can anchor
      // the zoom around this point.  We subtract the canvas
      // bounding‑rect so that the origin is expressed in canvas
      // coordinates.
      const rect = canvas.getBoundingClientRect();
      const mx = ((t1.clientX + t2.clientX) / 2) - rect.left;
      const my = ((t1.clientY + t2.clientY) / 2) - rect.top;
      initialMidpoint = { x: mx, y: my };
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length === 2 && initialDistance) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      let newScale = initialScale * (dist / initialDistance);
      // Clamp the scale for usability
      newScale = Math.max(0.5, Math.min(3, newScale));
      canvas.dataset.scale = newScale;
      // Compute the current midpoint relative to the canvas.  We will
      // use the initial midpoint as the transform origin so that the
      // zoom stays centred on where the child pinched.
      const rect = canvas.getBoundingClientRect();
      const mx = ((t1.clientX + t2.clientX) / 2) - rect.left;
      const my = ((t1.clientY + t2.clientY) / 2) - rect.top;
      if (initialMidpoint) {
        // Set the transform origin based on the initial midpoint.
        canvas.style.transformOrigin = `${initialMidpoint.x}px ${initialMidpoint.y}px`;
      }
      canvas.style.transform = `scale(${newScale})`;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    // Reset initial values when fingers lifted
    if (!e.touches || e.touches.length < 2) {
      initialDistance = null;
      initialMidpoint = null;
    }
  });
}

// ===================== Games: Sorting Game =====================
// Initialise the sorting game by populating the drop area and draggable
// area with shapes.  Children drag the shapes from the draggable area
// into the matching silhouette slot in the drop area.  When all shapes
// have been placed correctly a success message appears.
function initSortGame() {
  const shapes = ['circle','square','triangle','rectangle','star','heart'];
  const dropArea = document.getElementById('drop-area');
  const dragArea = document.getElementById('draggable-area');
  if (!dropArea || !dragArea) return;
  // Clear any existing content
  dropArea.innerHTML = '';
  dragArea.innerHTML = '';
  // Create drop slots for each shape
  shapes.forEach(shape => {
    const slot = document.createElement('div');
    slot.classList.add('drop-slot');
    // Add a shape‑specific class so CSS can apply a matching outline.  This
    // allows us to shape the drop area to better match the target piece
    // (e.g. a circle slot is round, a star slot is a star shape).  See
    // styles in app_style.css for details.
    slot.classList.add(`${shape}-slot`);
    slot.dataset.target = shape;
    // Show a faint silhouette of the target shape inside the drop slot.  Use
    // a greyscale background image with reduced opacity so children can
    // see where to place each piece.  Background images are centered
    // and scaled down.  When the correct shape is placed the slot
    // contents will be replaced with the coloured shape image.
    slot.style.backgroundImage = `url(${shape}.png)`;
    slot.style.backgroundRepeat = 'no-repeat';
    slot.style.backgroundPosition = 'center';
    slot.style.backgroundSize = '60%';
    slot.style.opacity = '0.4';
    dropArea.appendChild(slot);
    // Allow drop on slot
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const shapeName = e.dataTransfer.getData('text/plain');
      if (shapeName === slot.dataset.target) {
        // Find the corresponding draggable item
        const item = dragArea.querySelector(`[data-shape="${shapeName}"]`);
        if (item) {
          // Mark slot as correct and show the coloured image
          slot.classList.add('correct');
          // Remove silhouette and opacity
          slot.style.backgroundImage = 'none';
          slot.style.opacity = '1';
          const img = document.createElement('img');
          img.src = `${shapeName}.png`;
          img.alt = shapeName;
          slot.innerHTML = '';
          slot.appendChild(img);
          // Remove the draggable item
          item.remove();
          // If no more items remain, show success message
          if (dragArea.children.length === 0) {
            const msg = document.getElementById('game-success-message');
            if (msg) msg.style.display = 'block';
          }
        }
      }
    });
  });
  // Shuffle shapes for draggable items
  const shuffled = shapes.slice().sort(() => Math.random() - 0.5);
  shuffled.forEach(shape => {
    const item = document.createElement('div');
    item.classList.add('draggable-item');
    item.draggable = true;
    item.dataset.shape = shape;
    const img = document.createElement('img');
    img.src = `${shape}.png`;
    img.alt = shape;
    item.appendChild(img);
    // Drag start event sets data transfer
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', shape);
    });
    dragArea.appendChild(item);
  });
  // Hide success message at start
  const msg = document.getElementById('game-success-message');
  if (msg) msg.style.display = 'none';
}

// ===================== Games: Fruit Catching Game =====================
/**
 * Initialise the fruit catching game.  Fruits fall from the top of the
 * screen; children tap them to catch.  Each catch increases the score.
 * When 10 fruits have been caught the game stops and a success
 * message is displayed.  A reset button appears to let children
 * play again.
 */
function initFruitGame() {
  const fruitArea = document.getElementById('fruit-area');
  const scoreEl = document.getElementById('fruit-scoreboard');
  const successMsg = document.getElementById('fruit-success-message');
  const resetBtn = document.getElementById('fruit-reset-btn');
  if (!fruitArea || !scoreEl || !successMsg || !resetBtn) return;
  // Clear any existing fruit
  fruitArea.innerHTML = '';
  let score = 0;
  let fruitsCaught = 0;
  scoreEl.textContent = 'Score: 0';
  // Ensure the scoreboard is visible when starting the game
  scoreEl.style.display = 'block';
  successMsg.style.display = 'none';
  // Hide the reset button completely at the start of the game
  resetBtn.hidden = true;
  resetBtn.style.display = 'none';
  // Possible colours and emojis for fruits
  const colours = ['#E74C3C','#E67E22','#F1C40F','#27AE60','#3498DB','#9B59B6','#FF66CC','#8E44AD','#1ABC9C','#F39C12'];
  const emojis = ['🍎','🍌','🍇','🍊','🍓','🍍'];
  // Function to spawn a single fruit
  function spawnFruit() {
    const fruit = document.createElement('div');
    fruit.classList.add('fruit');
    const colour = colours[Math.floor(Math.random()*colours.length)];
    fruit.style.backgroundColor = colour;
    fruit.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    fruit.style.left = Math.random() * (fruitArea.clientWidth - 40) + 'px';
    fruit.style.top = '-40px';
    fruitArea.appendChild(fruit);
    const speed = 2 + Math.random() * 3;
    const interval = setInterval(() => {
      const top = parseFloat(fruit.style.top);
      fruit.style.top = (top + speed) + 'px';
      if (parseFloat(fruit.style.top) > fruitArea.clientHeight) {
        clearInterval(interval);
        fruit.remove();
      }
    }, 20);
    // Use pointerdown instead of click so tapping registers immediately
    fruit.addEventListener('pointerdown', () => {
      clearInterval(interval);
      fruit.remove();
      score++;
      fruitsCaught++;
      scoreEl.textContent = 'Score: ' + score;
      if (fruitsCaught >= 10) {
        successMsg.style.display = 'block';
        // Show the reset button when the child has caught enough fruits
        resetBtn.hidden = false;
        resetBtn.style.display = 'inline-block';
        clearInterval(spawnInterval);
      }
    });
  }
  // Spawn a fruit every second
  const spawnInterval = setInterval(spawnFruit, 1000);
  // Spawn an initial fruit immediately
  spawnFruit();
  // Expose reset behaviour: clear intervals and restart
  resetBtn.onclick = () => {
    clearInterval(spawnInterval);
    initFruitGame();
  };
}

// ===================== Games: Animal Habitat Game =====================
/**
 * Initialise the animal habitats matching game.  Children drag each
 * animal onto the environment where it lives (e.g. a penguin onto
 * snow).  Matching all animals shows a success message and a reset
 * button.  Environments are represented by emoji and animals by
 * emoji to avoid external image dependencies.
 */
function initHabitatGame() {
  const dropArea = document.getElementById('habitat-drop');
  const dragArea = document.getElementById('habitat-drag');
  const successMsg = document.getElementById('habitat-success-message');
  const resetBtn = document.getElementById('habitat-reset-btn');
  if (!dropArea || !dragArea || !successMsg || !resetBtn) return;
  dropArea.innerHTML = '';
  dragArea.innerHTML = '';
  successMsg.style.display = 'none';
  resetBtn.hidden = true;
  // Define a pool of possible habitat/animal pairs.  Each entry
  // includes a habitat key, the animal icon and the matching
  // environment icon.  When the game is initialised we will
  // randomly choose a subset of these pairs so the game varies each
  // time.  Feel free to add more pairs here for increased variety.
  const pool = [
    { key: 'snow',    animal: '🐧', hab: '❄️' }, // penguin → snow
    { key: 'savannah', animal: '🐘', hab: '🌴' }, // elephant → savannah
    { key: 'forest',  animal: '🦌', hab: '🌲' }, // deer → forest
    { key: 'ocean',   animal: '🐬', hab: '🌊' }, // dolphin → ocean
    { key: 'farm',    animal: '🐔', hab: '🌾' }, // chicken → farm
    { key: 'desert',  animal: '🐫', hab: '🏜' }, // camel → desert
    { key: 'jungle',  animal: '🦧', hab: '🌿' }, // orangutan → jungle
    { key: 'mountain',animal: '🐻', hab: '🏔️' }  // bear → mountain
  ];
  // Shuffle the pool and pick a subset of three pairs.  This keeps the
  // game manageable while allowing variety on each playthrough.
  const shuffledPairs = pool.sort(() => Math.random() - 0.5);
  const selected = shuffledPairs.slice(0, 3);
  const habitats = selected.map(p => ({ key: p.key, icon: p.hab }));
  const animals = selected.map(p => ({ key: p.key, icon: p.animal }));
  // Create drop slots for each selected habitat
  habitats.forEach(hab => {
    const slot = document.createElement('div');
    slot.classList.add('habitat-slot');
    slot.dataset.target = hab.key;
    slot.textContent = hab.icon;
    // Allow dropping onto this slot
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const animalKey = e.dataTransfer.getData('text/plain');
      if (animalKey === slot.dataset.target) {
        // Mark slot correct and show the animal icon
        slot.classList.add('correct');
        slot.textContent = animals.find(a => a.key === animalKey).icon;
        // Remove the corresponding draggable item
        const item = dragArea.querySelector(`[data-animal="${animalKey}"]`);
        if (item) item.remove();
        // If all animals placed, display success then start a new round
        if (dragArea.children.length === 0) {
          successMsg.style.display = 'block';
          // Hide the reset button for the automatic next round
          resetBtn.hidden = true;
          // After a brief pause, reinitialise the game with a new set
          setTimeout(() => {
            initHabitatGame();
          }, 1200);
        }
      }
    });
    dropArea.appendChild(slot);
  });
  // Create draggable animals for the selected pairs
  animals.forEach(an => {
    const item = document.createElement('div');
    item.classList.add('habitat-item');
    item.dataset.animal = an.key;
    item.draggable = true;
    item.textContent = an.icon;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', an.key);
    });
    dragArea.appendChild(item);
  });
  // Reset button reinitialises the game immediately, bypassing the
  // automatic cycling.  Useful if the child wants to try again.
  resetBtn.onclick = () => {
    initHabitatGame();
  };
}

/**
 * Initialise a simple puzzle game.  Children drag numbered tiles into
 * the correct slots to complete a 3×3 puzzle.  When all pieces are in
 * place a success message appears and a reset button allows them to
 * play again.  The logic is similar to the sorting game but uses
 * numbers instead of shapes.
 */
function initPuzzleGame() {
  const dropArea = document.getElementById('puzzle-drop');
  const dragArea = document.getElementById('puzzle-drag');
  const successMsg = document.getElementById('puzzle-success-message');
  const resetBtn = document.getElementById('puzzle-reset-btn');
  if (!dropArea || !dragArea || !successMsg || !resetBtn) return;
  // Clear previous state
  dropArea.innerHTML = '';
  dragArea.innerHTML = '';
  successMsg.style.display = 'none';
  resetBtn.hidden = true;
  // Create nine drop slots labelled 1–9
  const numbers = [1,2,3,4,5,6,7,8,9];
  numbers.forEach(num => {
    const slot = document.createElement('div');
    slot.classList.add('puzzle-slot');
    slot.dataset.target = String(num);
    slot.textContent = num;
    // Accept drops
    slot.addEventListener('dragover', e => {
      e.preventDefault();
    });
    slot.addEventListener('drop', e => {
      e.preventDefault();
      const value = e.dataTransfer.getData('text/plain');
      if (value === slot.dataset.target) {
        // Find the corresponding draggable piece
        const item = dragArea.querySelector(`[data-value="${value}"]`);
        if (item) {
          slot.classList.add('correct');
          slot.textContent = value;
          item.remove();
          // When all pieces placed, show success and reset
          if (dragArea.children.length === 0) {
            successMsg.style.display = 'block';
            resetBtn.hidden = false;
          }
        }
      }
    });
    dropArea.appendChild(slot);
  });
  // Shuffle numbers for draggable pieces
  const shuffled = numbers.slice().sort(() => Math.random() - 0.5);
  shuffled.forEach(num => {
    const piece = document.createElement('div');
    piece.classList.add('puzzle-piece');
    piece.dataset.value = String(num);
    piece.draggable = true;
    piece.textContent = num;
    piece.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(num));
    });
    dragArea.appendChild(piece);
  });
  // Reset behaviour
  resetBtn.onclick = () => {
    initPuzzleGame();
  };
}
// Initialize the app after the DOM is ready and loading screen fades
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // Hide loading screen and show the main app
    document.getElementById('loading-screen').style.display = 'none';
    const app = document.getElementById('app');
    app.hidden = false;
    // Build pack selection cards
    buildPackCards();
    // Attach navigation buttons for viewer
    document.getElementById('exit-btn').addEventListener('click', exitPack);
    document.getElementById('prev-btn').addEventListener('click', prevItem);
    document.getElementById('next-btn').addEventListener('click', nextItem);
    // Enable swipe detection for mobile devices
    addSwipeDetection();
    // Attach handlers for section cards
    document.querySelectorAll('.section-card').forEach(card => {
      card.addEventListener('click', () => {
        const section = card.dataset.section;
        enterSection(section);
      });
    });
    // Settings modal logic
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    settingsBtn.addEventListener('click', () => {
      settingsModal.hidden = false;
    });
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.hidden = true;
    });
    // Music toggle implementation.  We create a single Audio object
    // for the background music and loop it quietly.  The music will
    // only start playing after the user interacts with the page (by
    // toggling the switch), which satisfies browser autoplay
    // policies.  The toggle checkbox controls whether the music is
    // playing.  We store the state in localStorage so the setting
    // persists across sessions.
    const musicToggle = document.getElementById('music-toggle');
    let bgMusic;
    try {
 bgMusic = new Audio('background.mp3');
bgMusic.loop = true;
      const musicPref = localStorage.getItem('backgroundMusic');
      if (musicPref === 'on') {
        musicToggle.checked = true;
      }
    } catch (_) {
      // ignore audio errors
    }
    musicToggle.addEventListener('change', () => {
      if (!bgMusic) return;
      if (musicToggle.checked) {
        // Save preference and play
        try { localStorage.setItem('backgroundMusic','on'); } catch (_) {}
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
      } else {
        try { localStorage.setItem('backgroundMusic','off'); } catch (_) {}
        bgMusic.pause();
      }
    });
    // Home button returns to the main section menu
    const homeBtnEl = document.getElementById('home-btn');
    if (homeBtnEl) {
      homeBtnEl.addEventListener('click', () => {
        returnToMenu();
      });
    }
    // Colour canvas back button to return to gallery
    document.getElementById('color-back-btn').addEventListener('click', () => {
      const canvas = document.getElementById('color-canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      document.getElementById('color-canvas-container').hidden = true;
      document.getElementById('color-gallery').hidden = false;
    });
    // Clear buttons for colour and draw canvases
    document.getElementById('color-clear-btn').addEventListener('click', () => {
      const canvas = document.getElementById('color-canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentColourImage) {
        showColorCanvas(currentColourImage);
      }
    });
    document.getElementById('draw-clear-btn').addEventListener('click', () => {
      const canvas = document.getElementById('draw-canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    // Enable pinch‑to‑zoom on the drawing and colouring canvases
    const cCanvas = document.getElementById('color-canvas');
    const dCanvas = document.getElementById('draw-canvas');
    if (cCanvas) {
      // Set the transform origin to the centre so pinch‑to‑zoom scales
      // from the centre of the canvas instead of the top‑left corner.
      cCanvas.style.transformOrigin = 'center center';
      enablePinchZoom(cCanvas);
    }
    if (dCanvas) {
      dCanvas.style.transformOrigin = 'center center';
      enablePinchZoom(dCanvas);
    }
    // Sorting game restart button
    const sortResetBtn = document.getElementById('game-reset-btn');
    if (sortResetBtn) {
      sortResetBtn.addEventListener('click', () => {
        initSortGame();
      });
    }
    // Memory game restart button
    const memResetBtn = document.getElementById('memory-reset-btn');
    if (memResetBtn) {
      memResetBtn.addEventListener('click', () => {
        initMemoryGame();
      });
    }
    // Habitat game restart button
    const habResetBtn = document.getElementById('habitat-reset-btn');
    if (habResetBtn) {
      habResetBtn.addEventListener('click', () => {
        initHabitatGame();
      });
    }
    // Puzzle game restart button
    const puzzleResetBtn = document.getElementById('puzzle-reset-btn');
    if (puzzleResetBtn) {
      puzzleResetBtn.addEventListener('click', () => {
        initPuzzleGame();
      });
    }
    // Attach handlers to game cards for selecting games
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const game = card.dataset.game;
        // If the games have not been unlocked via in‑app purchase, prompt
        // the parent to unlock.  Only allow access when unlocked.
        if (!gamesUnlocked) {
          promptPurchase();
        } else {
          enterGame(game);
        }
      });
    });
    // Back button in games section
    const gbBtn = document.getElementById('game-back-btn');
    if (gbBtn) {
      gbBtn.addEventListener('click', () => {
        returnToGamesMenu();
      });
    }
    // Ensure the app starts at the section menu
    returnToMenu();
  }, 1500);
});
