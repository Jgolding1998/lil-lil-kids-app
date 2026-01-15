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

// Speak a given text using the browser's SpeechSynthesis API.  Fallback
// for when sound effects are not available or fail to load.
function speak(text) {
  if ('speechSynthesis' in window) {
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
    // For Letters and Numbers, no image or colour – we'll leave blank
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
  // Hide the header within the app to allow items to fill more of the screen
  const header = document.querySelector('header');
  if (header) {
    header.style.display = 'none';
  }
  // Hide the footer for more vertical space
  const footer = document.querySelector('footer');
  if (footer) {
    footer.style.display = 'none';
  }
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
  // On click: play sound or speak
  wrapper.addEventListener('click', () => {
    if (item.sound) {
      playSound(item.sound, item.name);
    } else {
      speak(item.name);
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
      const fruitReset = document.getElementById('fruit-reset-btn');
      const habitatReset = document.getElementById('habitat-reset-btn');
    // Hide reset buttons and success messages when showing the game menu
    const sortReset = document.getElementById('game-reset-btn');
    const memoryReset = document.getElementById('memory-reset-btn');
    const sortSuccess = document.getElementById('game-success-message');
    const memSuccess = document.getElementById('memory-success-message');
      if (menu) menu.hidden = false;
      if (sortGame) sortGame.hidden = true;
      if (memoryGame) memoryGame.hidden = true;
      if (fruitGame) fruitGame.hidden = true;
      if (habitatGame) habitatGame.hidden = true;
      if (backBtn) backBtn.hidden = true;
    if (sortReset) sortReset.hidden = true;
    if (memoryReset) memoryReset.hidden = true;
    if (fruitReset) fruitReset.hidden = true;
    if (habitatReset) habitatReset.hidden = true;
    if (sortSuccess) sortSuccess.style.display = 'none';
    if (memSuccess) memSuccess.style.display = 'none';
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
      const sortReset = document.getElementById('game-reset-btn');
      const memoryReset = document.getElementById('memory-reset-btn');
      const fruitReset = document.getElementById('fruit-reset-btn');
      const habitatReset = document.getElementById('habitat-reset-btn');
      const fruitGame = document.getElementById('fruit-game');
      const habitatGame = document.getElementById('habitat-game');
      if (gameName === 'sort') {
        if (sortGame) sortGame.hidden = false;
        if (memoryGame) memoryGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show sort reset button and hide other reset buttons
        if (sortReset) sortReset.hidden = false;
        if (memoryReset) memoryReset.hidden = true;
        if (fruitReset) fruitReset.hidden = true;
        if (habitatReset) habitatReset.hidden = true;
        initSortGame();
      } else if (gameName === 'memory') {
        if (memoryGame) memoryGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show memory reset button and hide other reset buttons
        if (memoryReset) memoryReset.hidden = false;
        if (sortReset) sortReset.hidden = true;
        if (fruitReset) fruitReset.hidden = true;
        if (habitatReset) habitatReset.hidden = true;
        initMemoryGame();
      } else if (gameName === 'fruit') {
        if (fruitGame) fruitGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (memoryGame) memoryGame.hidden = true;
        if (habitatGame) habitatGame.hidden = true;
        // Show fruit reset button and hide others
        if (fruitReset) fruitReset.hidden = false;
        if (sortReset) sortReset.hidden = true;
        if (memoryReset) memoryReset.hidden = true;
        if (habitatReset) habitatReset.hidden = true;
        initFruitGame();
      } else if (gameName === 'habitat') {
        if (habitatGame) habitatGame.hidden = false;
        if (sortGame) sortGame.hidden = true;
        if (memoryGame) memoryGame.hidden = true;
        if (fruitGame) fruitGame.hidden = true;
        // Show habitat reset button and hide others
        if (habitatReset) habitatReset.hidden = false;
        if (sortReset) sortReset.hidden = true;
        if (memoryReset) memoryReset.hidden = true;
        if (fruitReset) fruitReset.hidden = true;
        initHabitatGame();
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
    // Use higher‑quality colouring pages.  Remove simple shapes and
    // low‑detail pictures.  Include the new castle, cat and monster
    // truck outlines provided by the user, plus the playground
    // slide for variety.  These files live in the project root.
    'castle_detail.png',
    'cat_fun.png',
    'monster_truck_detail.png',
    'playground.png'
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
let currentColour = '#E74C3C';
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
    // Select the first colour by default
    if (index === 0) {
      swatch.classList.add('selected');
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
  ctx.lineWidth = 6;
  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
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
  let initialDistance = null;
  let initialScale = 1;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      initialDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialScale = parseFloat(canvas.dataset.scale) || 1;
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length === 2 && initialDistance) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      let newScale = initialScale * (dist / initialDistance);
      // clamp the scale for usability
      newScale = Math.max(0.5, Math.min(3, newScale));
      canvas.dataset.scale = newScale;
      canvas.style.transform = `scale(${newScale})`;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    // Reset initial distance when fingers lifted
    if (!e.touches || e.touches.length < 2) {
      initialDistance = null;
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
  successMsg.style.display = 'none';
  resetBtn.hidden = true;
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
    fruit.addEventListener('click', () => {
      clearInterval(interval);
      fruit.remove();
      score++;
      fruitsCaught++;
      scoreEl.textContent = 'Score: ' + score;
      if (fruitsCaught >= 10) {
        successMsg.style.display = 'block';
        resetBtn.hidden = false;
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
  // Define habitats and animals.  Each environment has a key and an
  // icon; animals reference the habitat key they belong to.
  const habitats = [
    { key: 'snow', icon: '❄️' },
    { key: 'savannah', icon: '🌴' },
    { key: 'forest', icon: '🌲' }
  ];
  const animals = [
    { key: 'snow', icon: '🐧' }, // penguin
    { key: 'savannah', icon: '🐘' }, // elephant
    { key: 'forest', icon: '🦌' } // deer
  ];
  // Create drop slots for each habitat
  habitats.forEach(hab => {
    const slot = document.createElement('div');
    slot.classList.add('habitat-slot');
    slot.dataset.target = hab.key;
    slot.textContent = hab.icon;
    // Allow dropping
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const animalKey = e.dataTransfer.getData('text/plain');
      if (animalKey === slot.dataset.target) {
        // Mark slot correct and show animal icon
        slot.classList.add('correct');
        slot.textContent = animals.find(a => a.key === animalKey).icon;
        // Remove the corresponding draggable item
        const item = dragArea.querySelector(`[data-animal="${animalKey}"]`);
        if (item) item.remove();
        // If all animals placed, show success and reset
        if (dragArea.children.length === 0) {
          successMsg.style.display = 'block';
          resetBtn.hidden = false;
        }
      }
    });
    dropArea.appendChild(slot);
  });
  // Create draggable animals
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
  // Reset button behaviour
  resetBtn.onclick = () => {
    initHabitatGame();
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
    // Music toggle placeholder – background music support can be implemented later
    const musicToggle = document.getElementById('music-toggle');
    musicToggle.addEventListener('change', () => {
      // To implement: play or pause background music
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
      cCanvas.style.transformOrigin = 'top left';
      enablePinchZoom(cCanvas);
    }
    if (dCanvas) {
      dCanvas.style.transformOrigin = 'top left';
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
    // Attach handlers to game cards for selecting games
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const game = card.dataset.game;
        enterGame(game);
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