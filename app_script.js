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
  Colours: [
    { name: 'Red', hex: '#E74C3C', textColor: '#FFFFFF' },
    { name: 'Blue', hex: '#3498DB', textColor: '#FFFFFF' },
    { name: 'Green', hex: '#27AE60', textColor: '#FFFFFF' },
    { name: 'Yellow', hex: '#F1C40F', textColor: '#333333' },
    { name: 'Orange', hex: '#E67E22', textColor: '#FFFFFF' },
    { name: 'Purple', hex: '#9B59B6', textColor: '#FFFFFF' }
  ],
  Animals: [
    // Each animal includes an image and a sound effect.  The sound
    // files come from third‑party sites offering royalty‑free or
    // public domain audio.  If playback fails, the app will speak the name.
    { name: 'Dog', image: 'dog.png', sound: 'https://www.freesoundslibrary.com/wp-content/uploads/2020/08/single-dog-woof-sound.mp3' },
    { name: 'Cat', image: 'cat.png', sound: 'https://www.freesoundslibrary.com/wp-content/uploads/2020/04/cat-meow-sound.mp3' },
    { name: 'Rabbit', image: 'rabbit.png', sound: 'https://opengameart.org/sites/default/files/RabbitEating.mp3' },
    { name: 'Lion', image: 'lion.png', sound: 'https://soundbible.com/mp3/Roaring%20Lion-SoundBible.com-527774719.mp3' },
    { name: 'Cow', image: 'cow.png', sound: 'https://www.freesoundslibrary.com/wp-content/uploads/2017/09/Cow-moo-sound.mp3' },
    { name: 'Monkey', image: 'monkey.png', sound: 'https://soundbible.com/mp3/Gorilla-SoundBible.com-1576451741.mp3' }
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
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } else {
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
    // For Colours pack, use the first colour's hex value
    if (packName === 'Colours' && items.length > 0) {
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
  // Hide pack selection view
  document.getElementById('pack-selection').style.display = 'none';
  // Hide the page header within the app to allow items to fill more of the screen
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
  // Show pack selection view
  document.getElementById('pack-selection').style.display = '';
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
  if (currentPackName === 'Colours' && item.hex) {
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

// Initialize the app after the DOM is ready and loading screen fades
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // Hide loading screen and show the main app
    document.getElementById('loading-screen').style.display = 'none';
    const app = document.getElementById('app');
    app.hidden = false;
    // Build pack selection cards
    buildPackCards();
    // Attach navigation buttons
    document.getElementById('exit-btn').addEventListener('click', exitPack);
    document.getElementById('prev-btn').addEventListener('click', prevItem);
    document.getElementById('next-btn').addEventListener('click', nextItem);
    // Enable swipe detection for mobile devices
    addSwipeDetection();
  }, 1500);
});