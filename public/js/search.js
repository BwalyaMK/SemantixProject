// Semantix Search Page - State Management and Event Handlers

// State Management
const state = {
    currentQuery: '',
    previousQuery: '',
    results: [],
    filters: {
        resourceType: 'all',
        duration: 'all',
        sortBy: 'relevance'
    },
    favorites: [],
    isLoading: false
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    filterToggleBtn: document.getElementById('filterToggleBtn'),
    filtersPanel: document.getElementById('filtersPanel'),
    resourceTypeFilter: document.getElementById('resourceTypeFilter'),
    durationFilter: document.getElementById('durationFilter'),
    sortFilter: document.getElementById('sortFilter'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    resultsHeader: document.getElementById('resultsHeader'),
    resultsCount: document.getElementById('resultsCount'),
    resultsQuery: document.getElementById('resultsQuery'),
    activeFilters: document.getElementById('activeFilters'),
    welcomeState: document.getElementById('welcomeState'),
    loadingState: document.getElementById('loadingState'),
    noResultsState: document.getElementById('noResultsState'),
    previousSearchBtn: document.getElementById('previousSearchBtn'),
    resultsList: document.getElementById('resultsList'),
    previewModal: document.getElementById('previewModal'),
    previewModalTitle: document.getElementById('previewModalTitle'),
    previewModalBody: document.getElementById('previewModalBody'),
    openInChatFromPreview: document.getElementById('openInChatFromPreview')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadFavorites();
});

// Event Listeners
function initializeEventListeners() {
    // Search
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Filters
    elements.filterToggleBtn.addEventListener('click', toggleFilters);
    elements.resourceTypeFilter.addEventListener('change', updateFilters);
    elements.durationFilter.addEventListener('change', updateFilters);
    elements.sortFilter.addEventListener('change', updateFilters);
    elements.resetFiltersBtn.addEventListener('click', resetFilters);

    // Previous search
    elements.previousSearchBtn.addEventListener('click', returnToPreviousSearch);
}

// Filter Management
function toggleFilters() {
    elements.filtersPanel.classList.toggle('open');
    elements.filterToggleBtn.classList.toggle('active');
}

function updateFilters() {
    state.filters.resourceType = elements.resourceTypeFilter.value;
    state.filters.duration = elements.durationFilter.value;
    state.filters.sortBy = elements.sortFilter.value;

    if (state.currentQuery) {
        performSearch();
    }

    updateActiveFilters();
}

function resetFilters() {
    state.filters = {
        resourceType: 'all',
        duration: 'all',
        sortBy: 'relevance'
    };

    elements.resourceTypeFilter.value = 'all';
    elements.durationFilter.value = 'all';
    elements.sortFilter.value = 'relevance';

    updateActiveFilters();

    if (state.currentQuery) {
        performSearch();
    }
}

function updateActiveFilters() {
    const chips = [];

    if (state.filters.resourceType !== 'all') {
        chips.push({
            label: `Type: ${state.filters.resourceType}`,
            key: 'resourceType'
        });
    }

    if (state.filters.duration !== 'all') {
        const durationLabels = {
            'past-year': 'Past Year',
            'past-5-years': 'Past 5 Years',
            'past-10-years': 'Past 10 Years'
        };
        chips.push({
            label: durationLabels[state.filters.duration],
            key: 'duration'
        });
    }

    if (state.filters.sortBy !== 'relevance') {
        const sortLabels = {
            'date-desc': 'Newest First',
            'date-asc': 'Oldest First',
            'name': 'A-Z'
        };
        chips.push({
            label: `Sort: ${sortLabels[state.filters.sortBy]}`,
            key: 'sortBy'
        });
    }

    elements.activeFilters.innerHTML = chips.map(chip => `
        <div class="filter-chip">
            ${chip.label}
            <i class="fas fa-times" onclick="removeFilter('${chip.key}')"></i>
        </div>
    `).join('');
}

function removeFilter(key) {
    state.filters[key] = key === 'sortBy' ? 'relevance' : 'all';
    
    if (key === 'resourceType') elements.resourceTypeFilter.value = 'all';
    if (key === 'duration') elements.durationFilter.value = 'all';
    if (key === 'sortBy') elements.sortFilter.value = 'relevance';

    updateActiveFilters();

    if (state.currentQuery) {
        performSearch();
    }
}

// Search Functionality
async function performSearch() {
  const query = elements.searchInput.value.trim();
  if (!query) return;

  state.previousQuery = state.currentQuery;
  state.currentQuery = query;

  showLoadingState();

  try {
    const payload = {
      query,
      scope: 'all', // or use filter UI to set provider
      filters: state.filters,
      page: 1,
      pageSize: 20
    };

    const res = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error('Search error', err);
      showNoResultsState();
      return;
    }

    const json = await res.json();
    if (!json.results || json.results.length === 0) {
      showNoResultsState();
      return;
    }

    displayResults(json.results);
  } catch (err) {
    console.error('Search failed', err);
    showNoResultsState();
  }
}


function searchSuggestion(query) {
    elements.searchInput.value = query;
    performSearch();
}

function returnToPreviousSearch() {
    if (state.previousQuery) {
        elements.searchInput.value = state.previousQuery;
        performSearch();
    }
}

function generateMockResults(query) {
    // Generate 5-10 mock results
    const numResults = Math.floor(Math.random() * 6) + 5;
    const types = ['article', 'book', 'website', 'preprint', 'thesis'];
    const results = [];

    for (let i = 0; i < numResults; i++) {
        results.push({
            id: generateId(),
            title: `${query} - Research Paper ${i + 1}`,
            type: types[Math.floor(Math.random() * types.length)],
            authors: ['Smith, J.', 'Doe, A.', 'Johnson, K.'].slice(0, Math.floor(Math.random() * 3) + 1),
            publishDate: new Date(Date.now() - Math.random() * 365 * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            relevanceScore: Math.floor(Math.random() * 30) + 70,
            preview: `This is a comprehensive study on ${query.toLowerCase()}. The research explores various aspects and presents significant findings that contribute to the field. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
            url: `https://example.com/paper/${i + 1}`,
            source: ['OpenAlex', 'DOAJ', 'CORE'][Math.floor(Math.random() * 3)]
        });
    }

    return results;
}

// Display Functions
function showLoadingState() {
    hideAllStates();
    elements.loadingState.style.display = 'block';
    state.isLoading = true;
}

function showWelcomeState() {
    hideAllStates();
    elements.welcomeState.style.display = 'block';
}

function showNoResultsState() {
    hideAllStates();
    elements.noResultsState.style.display = 'block';
    
    if (state.previousQuery) {
        elements.previousSearchBtn.style.display = 'inline-flex';
    }
}

function hideAllStates() {
    elements.welcomeState.style.display = 'none';
    elements.loadingState.style.display = 'none';
    elements.noResultsState.style.display = 'none';
    elements.resultsHeader.style.display = 'none';
    elements.resultsList.innerHTML = '';
}

function displayResults(results) {
    state.isLoading = false;
    state.results = results;

    if (results.length === 0) {
        showNoResultsState();
        return;
    }

    hideAllStates();
    elements.resultsHeader.style.display = 'flex';
    
    // Update results header
    elements.resultsCount.textContent = `${results.length} result${results.length > 1 ? 's' : ''}`;
    elements.resultsQuery.textContent = state.currentQuery;
    
    updateActiveFilters();

    // Apply sorting
    const sortedResults = applySorting([...results]);

    // Render results
    elements.resultsList.innerHTML = sortedResults.map(result => renderResultItem(result)).join('');
}

function applySorting(results) {
    switch (state.filters.sortBy) {
        case 'date-desc':
            return results.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        case 'date-asc':
            return results.sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
        case 'name':
            return results.sort((a, b) => a.title.localeCompare(b.title));
        case 'relevance':
        default:
            return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
}

function renderResultItem(result) {
    const isFavorite = state.favorites.includes(result.id);
    
    return `
        <div class="result-item" data-result-id="${result.id}">
            <div class="result-header">
                <div class="result-title-section">
                    <span class="result-type-badge">${capitalizeFirst(result.type)}</span>
                    <h3 class="result-title">
                        <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtml(result.title)}
                        </a>
                    </h3>
                    <div class="result-meta">
                        <div class="result-meta-item">
                            <i class="fas fa-user"></i>
                            <span>${result.authors.join(', ')}</span>
                        </div>
                        <div class="result-meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(result.publishDate)}</span>
                        </div>
                        <div class="result-meta-item">
                            <i class="fas fa-database"></i>
                            <span>${result.source}</span>
                        </div>
                        <div class="result-meta-item relevance-score">
                            <i class="fas fa-chart-line"></i>
                            <span>${result.relevanceScore}%</span>
                            <div class="relevance-bar">
                                <div class="relevance-fill" style="width: ${result.relevanceScore}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${result.id}')" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="fas fa-star"></i>
                </button>
            </div>
            
            <div class="result-preview">
                ${escapeHtml(result.preview)}
            </div>
            
            <div class="result-actions">
                <button class="action-btn primary" onclick="openInChat('${result.id}')">
                    <i class="fas fa-comments"></i>
                    Open in Chat
                </button>
                <button class="action-btn" onclick="addToChat('${result.id}')">
                    <i class="fas fa-plus"></i>
                    Add to Current Chat
                </button>
                <button class="action-btn" onclick="viewPreview('${result.id}')">
                    <i class="fas fa-eye"></i>
                    View Preview
                </button>
                <button class="action-btn secondary" onclick="markNotRelevant('${result.id}')">
                    <i class="fas fa-times"></i>
                    Not Relevant
                </button>
            </div>
        </div>
    `;
}

// Result Actions
function openInChat(resultId) {
    const result = state.results.find(r => r.id === resultId);
    if (result) {
        console.log('Opening in chat:', result);
        // In real app, navigate to chat with this document
        window.location.href = `chat.html?document=${resultId}`;
    }
}

function addToChat(resultId) {
    const result = state.results.find(r => r.id === resultId);
    if (result) {
        console.log('Adding to current chat:', result);
        // In real app, add document to current chat session
        alert(`"${result.title}" added to your current chat session!`);
    }
}

function viewPreview(resultId) {
    const result = state.results.find(r => r.id === resultId);
    if (!result) return;

    const modal = new bootstrap.Modal(elements.previewModal);
    elements.previewModalTitle.textContent = result.title;
    elements.previewModalBody.innerHTML = '<div class="preview-loading"><div class="loading-spinner"></div><p>Loading preview...</p></div>';
    
    modal.show();

    // Simulate loading preview
    setTimeout(() => {
        elements.previewModalBody.innerHTML = `
            <div class="preview-content">
                <h2>Abstract</h2>
                <p>${result.preview}</p>
                
                <h2>Authors</h2>
                <p>${result.authors.join(', ')}</p>
                
                <h2>Publication Details</h2>
                <p><strong>Date:</strong> ${formatDate(result.publishDate)}</p>
                <p><strong>Source:</strong> ${result.source}</p>
                <p><strong>Type:</strong> ${capitalizeFirst(result.type)}</p>
                <p><strong>Relevance Score:</strong> ${result.relevanceScore}%</p>
                
                <h2>Full Text</h2>
                <p>Full text preview would be loaded here from the source API. This is a placeholder for the actual document content that would be retrieved from OpenAlex, DOAJ, or CORE.</p>
                
                <p><a href="${result.url}" target="_blank" rel="noopener noreferrer">View original source →</a></p>
            </div>
        `;
    }, 1000);

    // Set up open in chat button
    elements.openInChatFromPreview.onclick = () => {
        modal.hide();
        openInChat(resultId);
    };
}

function markNotRelevant(resultId) {
    if (confirm('Mark this result as not relevant? It will be removed from your search results.')) {
        const resultElement = document.querySelector(`[data-result-id="${resultId}"]`);
        if (resultElement) {
            resultElement.style.opacity = '0';
            resultElement.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                resultElement.remove();
                state.results = state.results.filter(r => r.id !== resultId);
                
                // Update count
                elements.resultsCount.textContent = `${state.results.length} result${state.results.length > 1 ? 's' : ''}`;
                
                if (state.results.length === 0) {
                    showNoResultsState();
                }
            }, 300);
        }
    }
}

// Favorites Management
function toggleFavorite(resultId) {
    const index = state.favorites.indexOf(resultId);
    
    if (index > -1) {
        state.favorites.splice(index, 1);
    } else {
        state.favorites.push(resultId);
    }

    saveFavorites();
    
    // Update UI
    const btn = document.querySelector(`[data-result-id="${resultId}"] .favorite-btn`);
    if (btn) {
        btn.classList.toggle('active');
        btn.title = state.favorites.includes(resultId) 
            ? 'Remove from favorites' 
            : 'Add to favorites';
    }
}

function loadFavorites() {
    // In real app, load from backend
    // For now, just initialize empty array
    state.favorites = [];
}

function saveFavorites() {
    // In real app, save to backend
    console.log('Favorites saved:', state.favorites);
}

// Utility Functions
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Make functions globally accessible for inline onclick handlers
window.searchSuggestion = searchSuggestion;
window.removeFilter = removeFilter;
window.openInChat = openInChat;
window.addToChat = addToChat;
window.viewPreview = viewPreview;
window.markNotRelevant = markNotRelevant;
window.toggleFavorite = toggleFavorite;