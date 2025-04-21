// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
let isDarkMode = false;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    isDarkMode = !isDarkMode;
    themeToggle.querySelector('i').className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
});

// Load Newspapers on Page Load
document.addEventListener('DOMContentLoaded', () => {
    // DOM Element Selections
    const newspaperGrid = document.getElementById('newspaper-grid');
    const searchInput = document.getElementById('search-input');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const addNewspaperBtn = document.getElementById('add-newspaper-btn');
    const addNewspaperModal = document.getElementById('add-newspaper-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const addNewspaperForm = document.getElementById('add-newspaper-form');
    const themeToggle = document.getElementById('theme-toggle');
    const favoritesBtn = document.getElementById('favorites-btn');
    const categorySlider = document.querySelector('.category-slider');

    // State Management
    let newspapers = [];
    let filteredNewspapers = [];
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let addedNewspapers = JSON.parse(localStorage.getItem('addedNewspapers')) || [];
    let currentCategory = 'all';
    let currentSearchTerm = '';

    // Category Slider Scrolling
    let isDragging = false;
    let startX;
    let scrollLeft;

    categorySlider.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - categorySlider.offsetLeft;
        scrollLeft = categorySlider.scrollLeft;
    });

    categorySlider.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    categorySlider.addEventListener('mouseup', () => {
        isDragging = false;
    });

    categorySlider.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - categorySlider.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast factor
        categorySlider.scrollLeft = scrollLeft - walk;
    });

    // Touch support for mobile
    categorySlider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - categorySlider.offsetLeft;
        scrollLeft = categorySlider.scrollLeft;
    });

    categorySlider.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - categorySlider.offsetLeft;
        const walk = (x - startX) * 2;
        categorySlider.scrollLeft = scrollLeft - walk;
    });

    // Dynamically load newspapers
    function loadNewspapers() {
        // Dynamically determine the JSON file based on the current page
        const jsonFile = window.location.pathname.includes('malayalam.html') ? 'ml.json' : 
                        window.location.pathname.includes('hindi.html') ? 'hi.json' : 
                        null;
        
        if (jsonFile) {
            fetch(jsonFile)
                .then(response => response.json())
                .then(data => {
                    // Combine original and added newspapers
                    newspapers = [...data, ...addedNewspapers];
                    filterAndRenderNewspapers();
                })
                .catch(error => console.error('Error loading newspapers:', error));
        } else {
            console.error('No matching JSON file found for the current page');
        }
    }

    // Create Newspaper Card
    function createNewspaperCard(newspaper) {
        const card = document.createElement('div');
        card.classList.add('newspaper-card');
        card.dataset.category = newspaper.type.toLowerCase();

        // Create a container for image and favorite button
        const cardContent = document.createElement('div');
        cardContent.classList.add('card-content');

        const img = document.createElement('img');
        
        // Fallback image function
        function getFallbackImage() {
            try {
                if (newspaper.website) {
                    // Attempt to extract hostname safely
                    const hostname = new URL(newspaper.website).hostname
                        .replace('www.', '');
                    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
                }
            } catch (error) {
                console.warn('Error extracting favicon:', error);
            }
            
            // Default fallback image
            return 'path/to/default/logo.png';
        }

        // Prioritize image sources
        img.src = newspaper.image || getFallbackImage();
        img.alt = newspaper.name;

        // Error handling for image loading
        img.onerror = () => {
            img.src = getFallbackImage();
        };

        // Image wrapper to position favorite button
        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');

        // Favorite functionality
        const favoriteBtn = document.createElement('button');
        favoriteBtn.classList.add('favorite-btn');
        const heartIcon = document.createElement('i');
        
        // Function to check and update favorite status
        function updateFavoriteStatus() {
            const currentFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
            const isFavorite = currentFavorites.includes(newspaper.name);
            
            // Update heart icon class
            heartIcon.classList.remove('fa-heart', 'fa-heart-broken');
            heartIcon.classList.add(isFavorite ? 'fa-heart' : 'fa-heart-broken');
            
            return isFavorite;
        }

        // Set initial heart icon state
        heartIcon.classList.add('fas');
        updateFavoriteStatus(); // Call this before appending to ensure correct initial state
        favoriteBtn.appendChild(heartIcon);

        favoriteBtn.addEventListener('click', () => {
            // Get the most up-to-date favorites from localStorage
            const currentFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
            const index = currentFavorites.indexOf(newspaper.name);
            
            if (index > -1) {
                // Remove from favorites
                currentFavorites.splice(index, 1);
                heartIcon.classList.remove('fa-heart');
                heartIcon.classList.add('fa-heart-broken');
            } else {
                // Add to favorites
                currentFavorites.push(newspaper.name);
                heartIcon.classList.remove('fa-heart-broken');
                heartIcon.classList.add('fa-heart');
            }

            // Immediately update localStorage
            localStorage.setItem('favorites', JSON.stringify(currentFavorites));

            // Update global favorites array
            favorites = currentFavorites;

            // Trigger a custom event to notify other parts of the app
            const favoriteUpdateEvent = new CustomEvent('favoritesUpdated', {
                detail: { 
                    newspaperName: newspaper.name, 
                    isFavorite: heartIcon.classList.contains('fa-heart') 
                }
            });
            document.dispatchEvent(favoriteUpdateEvent);
        });

        const title = document.createElement('h3');
        title.textContent = newspaper.name;

        // Append image and favorite button to image wrapper
        imageWrapper.appendChild(img);
        imageWrapper.appendChild(favoriteBtn);

        // Append image wrapper to card content
        cardContent.appendChild(imageWrapper);

        // Append card content and title to card
        card.appendChild(cardContent);
        card.appendChild(title);

        card.addEventListener('click', (event) => {
            // Open website if not clicking on favorite button
            if (!event.target.closest('.favorite-btn')) {
                window.open(newspaper.website, '_blank');
            }
        });

        return card;
    }

    // Add a global event listener for favorites updates
    document.addEventListener('favoritesUpdated', (event) => {
        // Update the global favorites array
        favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        
        // Optional: Re-render favorites view if currently in favorites view
        if (document.querySelector('.favorites-active')) {
            const favoriteNewspapers = newspapers.filter(newspaper => 
                favorites.includes(newspaper.name)
            );
            renderNewspapers(favoriteNewspapers);
        }
    });

    // Comprehensive filtering function
    function filterAndRenderNewspapers() {
        // Apply category filter
        filteredNewspapers = currentCategory === 'all' 
            ? newspapers 
            : newspapers.filter(newspaper => 
                newspaper.type.toLowerCase() === currentCategory
            );

        // Apply search filter
        if (currentSearchTerm) {
            filteredNewspapers = filteredNewspapers.filter(newspaper => 
                newspaper.name.toLowerCase().includes(currentSearchTerm.toLowerCase())
            );
        }

        // Render filtered newspapers
        renderNewspapers(filteredNewspapers);
    }

    // Render newspapers
    function renderNewspapers(newspapersToRender) {
        newspaperGrid.innerHTML = '';
        newspapersToRender.forEach(newspaper => {
            const card = createNewspaperCard(newspaper);
            newspaperGrid.appendChild(card);
        });

        // Display message if no newspapers found
        if (newspapersToRender.length === 0) {
            newspaperGrid.innerHTML = `
                <div class="no-results">
                    <p>${window.location.pathname.includes('malayalam.html') 
                        ? 'കാണാവുന്ന മാധ്യമങ്ങളൊന്നുമില്ല' 
                        : 'कोई समाचार पत्र नहीं मिला'}
                    </p>
                </div>
            `;
        }
    }

    // Favorites Button Functionality
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', () => {
            const favoriteNewspapers = newspapers.filter(newspaper => 
                favorites.includes(newspaper.name)
            );
            renderNewspapers(favoriteNewspapers);
        });
    }

    // Modal Open and Close
    addNewspaperBtn.addEventListener('click', () => {
        addNewspaperModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        addNewspaperModal.style.display = 'none';
    });

    // Add Newspaper Form Submission
    addNewspaperForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Get form elements
        const nameInput = document.getElementById('newspaper-name');
        const websiteInput = document.getElementById('newspaper-website');
        const typeInput = document.getElementById('newspaper-type');
        const logoInput = document.getElementById('newspaper-logo');

        // Validate input
        const name = nameInput.value.trim();
        const website = websiteInput.value.trim();
        const type = typeInput.value;
        const logoFile = logoInput.files[0];

        // Basic validation
        if (!name || !website) {
            alert(window.location.pathname.includes('malayalam.html') 
                ? 'കൃപയാ എല്ലാ ആവശ്യമായ ഫീൽഡുകളും നിക്ഷേപിക്കുക' 
                : 'कृपया सभी आवश्यक फ़ील्ड भरें');
            return;
        }

        // Process logo file
        const logoUrl = logoFile ? URL.createObjectURL(logoFile) : 'path/to/default/logo.png';

        // Create new newspaper object
        const newNewspaper = {
            name: name,
            website: website,
            type: type,
            image: logoUrl,
            language: window.location.pathname.includes('malayalam.html') ? 'Malayalam' : 'Hindi'
        };

        // Add to existing newspapers
        addedNewspapers.push(newNewspaper);
        localStorage.setItem('addedNewspapers', JSON.stringify(addedNewspapers));

        // Reload and render newspapers
        loadNewspapers();

        // Close modal
        addNewspaperModal.style.display = 'none';
    });

    // Initial load
    loadNewspapers();

    // Category and Search Functionality
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            currentCategory = button.dataset.category;
            filterAndRenderNewspapers();
        });
    });

    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        filterAndRenderNewspapers();
    });
});
