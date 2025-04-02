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
    let isDragging = false;
    let startX;
    let scrollLeft;

    // Fetch favicon from Google
    async function getFavicon(websiteUrl) {
        try {
            // Extract domain from URL
            const domain = new URL(websiteUrl).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}`;
        } catch (error) {
            console.error('Error fetching favicon:', error);
            return 'https://via.placeholder.com/50?text=News'; // Fallback image
        }
    }

    // Dynamically load newspapers
    function loadNewspapers() {
        fetch('hi.json')
            .then(response => response.json())
            .then(data => {
                // Combine original and added newspapers
                newspapers = [...data, ...addedNewspapers];
                filterAndRenderNewspapers();
            })
            .catch(error => console.error('Error loading newspapers:', error));
    }

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
            const card = document.createElement('div');
            card.classList.add('newspaper-card');
            card.innerHTML = `
                <img src="${newspaper.image}" alt="${newspaper.name}">
                <h3>${newspaper.name}</h3>
                <div class="card-actions">
                    <button class="favorite-btn" data-name="${newspaper.name}">
                        <i class="fas ${favorites.includes(newspaper.name) ? 'fa-heart' : 'fa-heart-broken'}"></i>
                    </button>
                </div>
            `;
            newspaperGrid.appendChild(card);

            // Add click event to the entire card, but prevent triggering when favorite icon is clicked
            card.addEventListener('click', (event) => {
                // Check if the click was on the favorite button or its icon
                if (!event.target.closest('.favorite-btn')) {
                    window.open(newspaper.website, '_blank');
                }
            });
        });

        // Update favorite and visit button event listeners
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', toggleFavorite);
        });

        // Display message if no newspapers found
        if (newspapersToRender.length === 0) {
            newspaperGrid.innerHTML = `
                <div class="no-results">
                    <p>कोई समाचार पत्र नहीं मिला</p>
                </div>
            `;
        }
    }

    // Toggle favorite newspapers
    function toggleFavorite(event) {
        const newspaperName = event.currentTarget.dataset.name;
        const heartIcon = event.currentTarget.querySelector('i');

        if (favorites.includes(newspaperName)) {
            favorites = favorites.filter(name => name !== newspaperName);
            heartIcon.classList.remove('fa-heart');
            heartIcon.classList.add('fa-heart-broken');
        } else {
            favorites.push(newspaperName);
            heartIcon.classList.remove('fa-heart-broken');
            heartIcon.classList.add('fa-heart');
        }

        localStorage.setItem('favorites', JSON.stringify(favorites));
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
        
        console.log('Add Newspaper Form Submission Started');

        // Get form elements with robust checking
        const nameInput = document.getElementById('newspaper-name');
        const websiteInput = document.getElementById('newspaper-website');
        const typeInput = document.getElementById('newspaper-type');
        const logoInput = document.getElementById('newspaper-logo');

        // Log element references for debugging
        console.log('Form Elements:', {
            nameInput, 
            websiteInput, 
            typeInput, 
            logoInput
        });

        // Validate element existence
        const formElements = [
            { element: nameInput, errorMessage: 'समाचार पत्र का नाम इनपुट नहीं मिला' },
            { element: websiteInput, errorMessage: 'वेबसाइट URL इनपुट नहीं मिला' },
            { element: typeInput, errorMessage: 'प्रकार इनपुट नहीं मिला' }
        ];

        // Check if all elements exist
        const missingElements = formElements.filter(item => !item.element);
        if (missingElements.length > 0) {
            const errorMessages = missingElements.map(item => item.errorMessage);
            console.error('Missing Form Elements:', errorMessages);
            alert(errorMessages.join('\n'));
            return;
        }

        // Get form values
        const name = nameInput.value.trim();
        const website = websiteInput.value.trim();
        const type = typeInput.value;
        const logoFile = logoInput.files[0];

        // Log form values for debugging
        console.log('Form Values:', {
            name, 
            website, 
            type, 
            logoFile: logoFile ? logoFile.name : 'No file selected'
        });

        // Comprehensive input validation
        const errors = [];
        
        if (!name) {
            errors.push('समाचार पत्र का नाम आवश्यक है');
        }
        
        if (!website) {
            errors.push('वेबसाइट URL आवश्यक है');
        } else {
            // URL validation
            try {
                new URL(website);
            } catch (urlError) {
                console.error('Invalid URL:', urlError);
                errors.push('कृपया एक वैध URL दर्ज करें');
            }
        }

        // Display errors if any
        if (errors.length > 0) {
            console.error('Validation Errors:', errors);
            alert(errors.join('\n'));
            return;
        }

        try {
            // Get favicon with error handling
            let faviconUrl;
            try {
                faviconUrl = await getFavicon(website);
                console.log('Favicon URL:', faviconUrl);
            } catch (faviconError) {
                console.warn('Favicon fetch failed:', faviconError);
                faviconUrl = 'https://via.placeholder.com/50?text=News';
            }

            // Create new newspaper object
            const newNewspaper = {
                name,
                website,
                language: 'Hindi', // Default language
                type,
                image: logoFile ? URL.createObjectURL(logoFile) : faviconUrl
            };

            console.log('New Newspaper Object:', newNewspaper);

            // Validate newspaper object
            if (!newNewspaper.name || !newNewspaper.website) {
                throw new Error('Invalid newspaper data');
            }

            // Add to added newspapers and save to local storage
            addedNewspapers.push(newNewspaper);
            localStorage.setItem('addedNewspapers', JSON.stringify(addedNewspapers));

            // Update newspapers and re-render
            newspapers = [...newspapers, newNewspaper];
            filterAndRenderNewspapers();

            // Close modal and reset form
            addNewspaperModal.style.display = 'none';
            addNewspaperForm.reset();

            // Optional: Show success message
            alert('समाचार पत्र सफलतापूर्वक जोड़ा गया');

            console.log('Newspaper Added Successfully');
        } catch (error) {
            console.error('Complete error adding newspaper:', error);
            alert(`समाचार पत्र जोड़ने में त्रुटि: ${error.message}`);
        }
    });

    // Search functionality
    searchInput.addEventListener('input', (event) => {
        currentSearchTerm = event.target.value;
        filterAndRenderNewspapers();
    });

    // Category filtering
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update current category
            currentCategory = button.dataset.category;
            
            // Filter and render newspapers
            filterAndRenderNewspapers();
        });
    });

    // Category Tabs Draggability
    categorySlider.addEventListener('mousedown', (e) => {
        isDragging = true;
        categorySlider.classList.add('active');
        startX = e.pageX - categorySlider.offsetLeft;
        scrollLeft = categorySlider.scrollLeft;
    });

    categorySlider.addEventListener('mouseleave', () => {
        isDragging = false;
        categorySlider.classList.remove('active');
    });

    categorySlider.addEventListener('mouseup', () => {
        isDragging = false;
        categorySlider.classList.remove('active');
    });

    categorySlider.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - categorySlider.offsetLeft;
        const walk = (x - startX) * 2; // Multiply by 2 to increase drag sensitivity
        categorySlider.scrollLeft = scrollLeft - walk;
    });

    categorySlider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX - categorySlider.offsetLeft;
        scrollLeft = categorySlider.scrollLeft;
    });

    categorySlider.addEventListener('touchmove', (e) => {
        const x = e.touches[0].clientX - categorySlider.offsetLeft;
        const walk = (x - startX) * 2;
        categorySlider.scrollLeft = scrollLeft - walk;
    });

    // Favorites View
    favoritesBtn.addEventListener('click', () => {
        const favoriteNewspapers = newspapers.filter(newspaper => 
            favorites.includes(newspaper.name)
        );
        renderNewspapers(favoriteNewspapers);
    });

    // Theme Toggle Functionality
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');

    // Theme toggle event listener
    themeToggle.addEventListener('click', () => {
        // Toggle dark mode on body
        document.body.classList.toggle('dark-mode');
        
        // Save theme preference
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
    });

    // Initial load of newspapers
    loadNewspapers();
});