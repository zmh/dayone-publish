/**
 * Day One Theme - Static Journal Website
 * Main application JavaScript
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    dataPath: './data/journal.json',
    mediaPath: './data/media/',
    mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    defaultCenter: [39.8283, -98.5795], // Center of USA
    defaultZoom: 4
};

// ========================================
// State Management
// ========================================
const state = {
    entries: [],
    journals: [],
    currentView: 'timeline',
    currentFilter: 'all',
    selectedEntryId: null,
    map: null,
    markers: null,
    theme: null // null = system, 'light', or 'dark'
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    app: document.getElementById('app'),
    entriesList: document.getElementById('entriesList'),
    timelineDetail: document.getElementById('timelineDetail'),
    calendarContainer: document.getElementById('calendarContainer'),
    mediaGrid: document.getElementById('mediaGrid'),
    mapView: document.getElementById('mapView'),
    map: document.getElementById('map'),
    modal: document.getElementById('entryModal'),
    modalBody: document.getElementById('modalBody'),
    sheet: document.getElementById('entrySheet'),
    sheetBody: document.getElementById('sheetBody'),
    mediaFilters: document.getElementById('mediaFilters'),
    mapControls: document.getElementById('mapControls'),
    mapEntryCount: document.getElementById('mapEntryCount')
};

// ========================================
// Utility Functions
// ========================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getDayName(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function getDayNumber(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).getDate();
}

function getMonthYear(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getFirstLine(text) {
    if (!text) return '';
    // Remove markdown formatting and get first meaningful line
    const cleaned = text
        .replace(/^#+\s*/gm, '')  // Remove headers
        .replace(/\*\*/g, '')     // Remove bold
        .replace(/\*/g, '')       // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .trim();

    const lines = cleaned.split('\n').filter(line => line.trim());
    return lines[0] || '';
}

function getPreviewText(text) {
    if (!text) return '';
    const lines = text.split('\n').filter(line => line.trim());
    // Skip the first line (title) and get the next line as preview
    return lines.slice(1).join(' ').substring(0, 150);
}

function getMediaUrl(filename) {
    if (!filename) return '';
    return CONFIG.mediaPath + filename;
}

function getLocationString(location) {
    if (!location) return '';
    const parts = [];
    if (location.place_name) parts.push(location.place_name);
    if (location.locality) parts.push(location.locality);
    return parts.join(', ') || location.admin_area || location.country || '';
}

function getWeatherString(weather) {
    if (!weather) return '';
    const parts = [];
    if (weather.conditions) parts.push(weather.conditions);
    if (weather.temp_celsius !== null) {
        const tempF = Math.round((weather.temp_celsius * 9/5) + 32);
        parts.push(`${tempF}°F`);
    }
    return parts.join(' • ');
}

// Group entries by month
function groupEntriesByMonth(entries) {
    const groups = new Map();

    entries.forEach(entry => {
        const monthYear = getMonthYear(entry.creationDate);
        if (!groups.has(monthYear)) {
            groups.set(monthYear, []);
        }
        groups.get(monthYear).push(entry);
    });

    return groups;
}

// ========================================
// Data Loading
// ========================================
function loadJournalData() {
    // Check if JOURNAL_DATA is available (loaded from data.js)
    if (typeof JOURNAL_DATA !== 'undefined') {
        state.entries = JOURNAL_DATA.entries || [];
        state.journals = JOURNAL_DATA.journals || [];

        console.log(`Loaded ${state.entries.length} entries from ${state.journals.length} journals`);

        // Initialize all views
        renderTimelineView();
        renderCalendarView();
        renderMediaView();
        initializeMap();

        // Update entry count
        updateEntryCount();

        // Auto-select the most recent entry on desktop
        if (state.entries.length > 0 && isDesktop()) {
            selectTimelineEntry(state.entries[0].uuid);
        }
    } else {
        console.error('JOURNAL_DATA not found. Make sure data.js is loaded.');
        showEmptyState('Unable to load journal entries. Make sure you have exported your journal data and data.js is included.');
    }
}

function showEmptyState(message) {
    elements.entriesList.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-book-open"></i>
            <p>${message}</p>
        </div>
    `;
}

function updateEntryCount() {
    const entriesWithLocation = state.entries.filter(e => e.location?.latitude && e.location?.longitude);
    if (elements.mapEntryCount) {
        elements.mapEntryCount.textContent = entriesWithLocation.length;
    }
}

// ========================================
// Utility: Check if desktop
// ========================================
function isDesktop() {
    return window.innerWidth >= 768;
}

// ========================================
// Timeline View
// ========================================
function renderTimelineView() {
    const groups = groupEntriesByMonth(state.entries);
    let html = '';

    groups.forEach((entries, monthYear) => {
        html += `<div class="month-header">${monthYear}</div>`;

        entries.forEach(entry => {
            const thumbnail = entry.attachments?.[0]?.filename;
            const title = getFirstLine(entry.text);
            const preview = getPreviewText(entry.text);
            const location = getLocationString(entry.location);
            const tags = entry.tags || [];

            html += `
                <div class="entry-item" data-entry-id="${entry.uuid}">
                    <div class="entry-date">
                        <div class="entry-day-name">${getDayName(entry.creationDate)}</div>
                        <div class="entry-day-number">${getDayNumber(entry.creationDate)}</div>
                    </div>
                    <div class="entry-content">
                        <div class="entry-title">${escapeHtml(title)}</div>
                        ${preview ? `<div class="entry-preview">${escapeHtml(preview)}</div>` : ''}
                        <div class="entry-meta">
                            ${tags.length > 0 ? `
                                <div class="entry-tags">
                                    ${tags.map(tag => `<span class="entry-tag">${escapeHtml(tag)}</span>`).join(', ')}
                                </div>
                            ` : ''}
                            ${location ? `<span class="entry-location">${escapeHtml(location)}</span>` : ''}
                        </div>
                    </div>
                    ${thumbnail ? `
                        <div class="entry-thumbnail">
                            <img src="${getMediaUrl(thumbnail)}" alt="" loading="lazy">
                        </div>
                    ` : ''}
                </div>
            `;
        });
    });

    elements.entriesList.innerHTML = html || '<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>No entries found</p></div>';

    // Add click handlers for timeline entries
    elements.entriesList.querySelectorAll('.entry-item').forEach(item => {
        item.addEventListener('click', () => {
            const entryId = item.dataset.entryId;
            if (isDesktop()) {
                // Desktop: show in side panel
                selectTimelineEntry(entryId);
            } else {
                // Mobile: show in iOS-style sheet
                openEntrySheet(entryId);
            }
        });
    });
}

// Select an entry in the timeline (desktop)
function selectTimelineEntry(entryId) {
    state.selectedEntryId = entryId;

    // Update selected state in list
    elements.entriesList.querySelectorAll('.entry-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.entryId === entryId);
    });

    // Render detail in side panel
    renderTimelineDetail(entryId);
}

// Render entry detail in the side panel (desktop)
function renderTimelineDetail(entryId) {
    const entry = state.entries.find(e => e.uuid === entryId);
    if (!entry) return;

    const html = renderEntryDetailContent(entry);
    elements.timelineDetail.innerHTML = html;
}

// Open entry in iOS-style sheet (mobile)
function openEntrySheet(entryId) {
    const entry = state.entries.find(e => e.uuid === entryId);
    if (!entry) return;

    const html = renderEntryDetailContent(entry);
    elements.sheetBody.innerHTML = html;
    elements.sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Close the sheet
function closeSheet() {
    elements.sheet.classList.remove('open');
    document.body.style.overflow = '';
}

// Render entry detail content (shared between desktop panel and mobile sheet)
function renderEntryDetailContent(entry) {
    const photos = entry.attachments?.filter(a => a.filename) || [];
    const title = getFirstLine(entry.text);
    const text = entry.text?.split('\n').slice(1).join('\n') || '';
    const location = getLocationString(entry.location);
    const weather = getWeatherString(entry.weather);
    const tags = entry.tags || [];

    let html = '<div class="detail-content">';

    // Photos
    if (photos.length > 0) {
        if (photos.length === 1) {
            html += `<img class="detail-photo" src="${getMediaUrl(photos[0].filename)}" alt="">`;
        } else {
            html += '<div class="detail-photos">';
            photos.forEach(photo => {
                html += `<img class="detail-photo" src="${getMediaUrl(photo.filename)}" alt="">`;
            });
            html += '</div>';
        }
    }

    // Content
    html += `
        <div class="detail-entry-content">
            <div class="detail-date">
                ${formatDate(entry.creationDate)}${entry.creationDate ? ` at ${formatTime(entry.creationDate)}` : ''}
            </div>
            <h2 class="detail-title">${escapeHtml(title)}</h2>
            <div class="detail-text">${marked.parse(text)}</div>

            <div class="detail-meta">
                ${location ? `
                    <div class="detail-meta-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeHtml(location)}</span>
                    </div>
                ` : ''}
                ${weather ? `
                    <div class="detail-meta-item">
                        <i class="fa-solid fa-cloud-sun"></i>
                        <span>${escapeHtml(weather)}</span>
                    </div>
                ` : ''}
            </div>

            ${tags.length > 0 ? `
                <div class="detail-tags">
                    ${tags.map(tag => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;

    html += '</div>';
    return html;
}

// ========================================
// Calendar View
// ========================================
function renderCalendarView() {
    // Group entries by date (YYYY-MM-DD)
    const entriesByDate = new Map();
    state.entries.forEach(entry => {
        if (!entry.creationDate) return;
        const dateKey = entry.creationDate.split('T')[0];
        if (!entriesByDate.has(dateKey)) {
            entriesByDate.set(dateKey, []);
        }
        entriesByDate.get(dateKey).push(entry);
    });

    // Get date range
    const dates = Array.from(entriesByDate.keys()).sort();
    if (dates.length === 0) {
        elements.calendarContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-calendar"></i><p>No entries found</p></div>';
        return;
    }

    const startDate = new Date(dates[dates.length - 1]); // Most recent
    const endDate = new Date(dates[0]); // Oldest

    // Generate months from newest to oldest
    let html = '';
    let currentYear = startDate.getFullYear();
    let currentMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    // Loop through months from newest to oldest
    while (currentYear > endYear || (currentYear === endYear && currentMonth >= endMonth)) {
        const currentDate = new Date(currentYear, currentMonth, 1);
        html += renderCalendarMonth(currentDate, entriesByDate);

        // Move to previous month
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    }

    elements.calendarContainer.innerHTML = html;

    // Add click handlers
    elements.calendarContainer.querySelectorAll('.calendar-day.has-entry, .calendar-day.has-photo').forEach(day => {
        day.addEventListener('click', () => {
            const dateKey = day.dataset.date;
            const entries = entriesByDate.get(dateKey);
            if (entries && entries.length > 0) {
                openEntryModal(entries[0].uuid);
            }
        });
    });
}

function renderCalendarMonth(date, entriesByDate) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
        <div class="calendar-month">
            <div class="calendar-month-header">${monthName}</div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">Sun</div>
                <div class="calendar-weekday">Mon</div>
                <div class="calendar-weekday">Tue</div>
                <div class="calendar-weekday">Wed</div>
                <div class="calendar-weekday">Thu</div>
                <div class="calendar-weekday">Fri</div>
                <div class="calendar-weekday">Sat</div>
            </div>
            <div class="calendar-grid">
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entries = entriesByDate.get(dateKey) || [];
        const hasEntry = entries.length > 0;
        const photo = entries[0]?.attachments?.[0]?.filename;

        let dayClass = 'calendar-day';
        if (hasEntry) dayClass += photo ? ' has-photo' : ' has-entry';

        html += `
            <div class="${dayClass}" data-date="${dateKey}">
                <span class="calendar-day-number">${day}</span>
                ${photo ? `<img class="calendar-day-photo" src="${getMediaUrl(photo)}" alt="" loading="lazy">` : ''}
            </div>
        `;
    }

    html += '</div></div>';
    return html;
}

// ========================================
// Media View
// ========================================
function renderMediaView() {
    const entriesWithMedia = state.entries.filter(entry =>
        entry.attachments && entry.attachments.length > 0 && entry.attachments[0].filename
    );

    if (entriesWithMedia.length === 0) {
        elements.mediaGrid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-images"></i><p>No media found</p></div>';
        return;
    }

    let html = '';

    entriesWithMedia.forEach(entry => {
        const attachment = entry.attachments[0];
        const date = new Date(entry.creationDate);
        const day = date.getDate();
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Determine media type for filtering
        const type = attachment.type || 'photo';

        html += `
            <div class="media-item" data-entry-id="${entry.uuid}" data-type="${type}">
                <img src="${getMediaUrl(attachment.filename)}" alt="" loading="lazy">
                <div class="media-item-overlay">
                    <div class="media-item-day">${day}</div>
                    <div class="media-item-date">${monthYear}</div>
                </div>
            </div>
        `;
    });

    elements.mediaGrid.innerHTML = html;

    // Add click handlers
    elements.mediaGrid.querySelectorAll('.media-item').forEach(item => {
        item.addEventListener('click', () => openEntryModal(item.dataset.entryId));
    });
}

function filterMedia(filter) {
    state.currentFilter = filter;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Filter items
    elements.mediaGrid.querySelectorAll('.media-item').forEach(item => {
        const type = item.dataset.type;
        const visible = filter === 'all' || type === filter;
        item.style.display = visible ? '' : 'none';
    });
}

// ========================================
// Map View
// ========================================
function initializeMap() {
    if (state.map) return;

    // Initialize Leaflet map
    state.map = L.map('map').setView(CONFIG.defaultCenter, CONFIG.defaultZoom);

    // Add tile layer (OpenStreetMap)
    L.tileLayer(CONFIG.mapTileUrl, {
        attribution: CONFIG.mapAttribution,
        maxZoom: 19
    }).addTo(state.map);

    // Create marker cluster group
    state.markers = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            return L.divIcon({
                html: `<div class="custom-marker">${count}</div>`,
                className: 'marker-cluster',
                iconSize: [40, 40]
            });
        }
    });

    // Add markers for entries with location
    const entriesWithLocation = state.entries.filter(e =>
        e.location?.latitude && e.location?.longitude
    );

    entriesWithLocation.forEach(entry => {
        const marker = L.marker([entry.location.latitude, entry.location.longitude], {
            icon: L.divIcon({
                html: '<div class="custom-marker">1</div>',
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        });

        // Create popup content
        const photo = entry.attachments?.[0]?.filename;
        const title = getFirstLine(entry.text);
        const date = formatDate(entry.creationDate);

        const popupContent = `
            <div class="popup-content">
                ${photo ? `<img class="popup-photo" src="${getMediaUrl(photo)}" alt="">` : ''}
                <div style="padding: 12px;">
                    <div class="popup-title">${escapeHtml(title)}</div>
                    <div class="popup-date">${date}</div>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
            // Add click handler to popup to open full entry view
            const popupEl = marker.getPopup().getElement();
            if (popupEl) {
                popupEl.querySelector('.popup-content').style.cursor = 'pointer';
                popupEl.querySelector('.popup-content').addEventListener('click', () => {
                    marker.closePopup();
                    if (isDesktop()) {
                        openEntryModal(entry.uuid);
                    } else {
                        openEntrySheet(entry.uuid);
                    }
                });
            }
        });

        state.markers.addLayer(marker);
    });

    state.map.addLayer(state.markers);

    // Fit bounds if there are markers
    if (entriesWithLocation.length > 0) {
        const bounds = state.markers.getBounds();
        state.map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Map control handlers
    document.getElementById('locationBtn')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                state.map.setView([pos.coords.latitude, pos.coords.longitude], 12);
            });
        }
    });

    document.getElementById('fitBoundsBtn')?.addEventListener('click', () => {
        if (state.markers.getLayers().length > 0) {
            state.map.fitBounds(state.markers.getBounds(), { padding: [50, 50] });
        }
    });
}

// ========================================
// Entry Modal
// ========================================
function openEntryModal(entryId) {
    const entry = state.entries.find(e => e.uuid === entryId);
    if (!entry) return;

    const photos = entry.attachments?.filter(a => a.filename) || [];
    const title = getFirstLine(entry.text);
    const text = entry.text?.split('\n').slice(1).join('\n') || '';
    const location = getLocationString(entry.location);
    const weather = getWeatherString(entry.weather);
    const tags = entry.tags || [];

    let html = '';

    // Photos
    if (photos.length > 0) {
        if (photos.length === 1) {
            html += `<img class="modal-photo" src="${getMediaUrl(photos[0].filename)}" alt="">`;
        } else {
            html += '<div class="modal-photos">';
            photos.forEach(photo => {
                html += `<img class="modal-photo" src="${getMediaUrl(photo.filename)}" alt="">`;
            });
            html += '</div>';
        }
    }

    // Content
    html += `
        <div class="modal-entry-content">
            <div class="modal-date">
                ${formatDate(entry.creationDate)}${entry.creationDate ? ` at ${formatTime(entry.creationDate)}` : ''}
            </div>
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            <div class="modal-text">${marked.parse(text)}</div>

            <div class="modal-meta">
                ${location ? `
                    <div class="modal-meta-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${escapeHtml(location)}</span>
                    </div>
                ` : ''}
                ${weather ? `
                    <div class="modal-meta-item">
                        <i class="fa-solid fa-cloud-sun"></i>
                        <span>${escapeHtml(weather)}</span>
                    </div>
                ` : ''}
            </div>

            ${tags.length > 0 ? `
                <div class="modal-tags">
                    ${tags.map(tag => `<span class="modal-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;

    elements.modalBody.innerHTML = html;
    elements.modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modal.classList.remove('open');
    document.body.style.overflow = '';
}

// ========================================
// View Navigation
// ========================================
function switchView(viewName) {
    state.currentView = viewName;

    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Show/hide views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}View`);
    });

    // Show/hide view-specific controls
    elements.mediaFilters.classList.toggle('hidden', viewName !== 'media');
    elements.mapControls.classList.toggle('hidden', viewName !== 'map');

    // Refresh map size and fit bounds when switching to map view
    if (viewName === 'map' && state.map) {
        setTimeout(() => {
            state.map.invalidateSize();
            // Fit bounds to show all markers
            if (state.markers && state.markers.getLayers().length > 0) {
                state.map.fitBounds(state.markers.getBounds(), { padding: [50, 50] });
            }
        }, 100);
    }

    // On desktop timeline, ensure an entry is selected
    if (viewName === 'timeline' && isDesktop() && !state.selectedEntryId && state.entries.length > 0) {
        selectTimelineEntry(state.entries[0].uuid);
    }
}

// ========================================
// Helper Functions
// ========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Dark Mode
// ========================================
function initializeDarkMode() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    // If no saved preference, theme stays null (follows system)

    updateDarkModeIcon();
}

function toggleDarkMode() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (state.theme === null) {
        // Currently following system, switch to opposite of system
        state.theme = prefersDark ? 'light' : 'dark';
    } else if (state.theme === 'dark') {
        state.theme = 'light';
    } else {
        // If light, go back to system preference
        state.theme = null;
    }

    if (state.theme) {
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('theme', state.theme);
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('theme');
    }

    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    const icon = toggle.querySelector('i');
    if (!icon) return;

    // Determine effective theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = state.theme === 'dark' || (state.theme === null && prefersDark);

    // Show sun icon if dark (clicking will go to light), moon if light (clicking will go to dark)
    icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ========================================
// Event Listeners
// ========================================
function initializeEventListeners() {
    // Dark mode toggle
    document.getElementById('darkModeToggle')?.addEventListener('click', toggleDarkMode);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkModeIcon);

    // Tab navigation
    document.querySelectorAll('.tab-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view) {
                switchView(btn.dataset.view);
            }
        });
    });

    // Media filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterMedia(btn.dataset.filter));
    });

    // Modal close
    elements.modal.querySelector('.modal-close').addEventListener('click', closeModal);
    elements.modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    // Sheet close (mobile)
    elements.sheet.querySelector('.sheet-backdrop').addEventListener('click', closeSheet);
    elements.sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);

    // Escape key to close modal or sheet
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.modal.classList.contains('open')) {
                closeModal();
            }
            if (elements.sheet.classList.contains('open')) {
                closeSheet();
            }
        }
    });

    // Handle window resize - reselect entry if switching between mobile/desktop
    let wasDesktop = isDesktop();
    window.addEventListener('resize', () => {
        const nowDesktop = isDesktop();
        if (wasDesktop !== nowDesktop) {
            wasDesktop = nowDesktop;
            // Close sheet if switching to desktop
            if (nowDesktop && elements.sheet.classList.contains('open')) {
                closeSheet();
                if (state.selectedEntryId) {
                    selectTimelineEntry(state.selectedEntryId);
                }
            }
            // Auto-select first entry on desktop if none selected
            if (nowDesktop && !state.selectedEntryId && state.entries.length > 0) {
                selectTimelineEntry(state.entries[0].uuid);
            }
        }
    });

    // FAB (placeholder - would need server for actual functionality)
    document.querySelector('.fab')?.addEventListener('click', () => {
        alert('This is a static site. To add entries, use the Day One app.');
    });
}

// ========================================
// Initialize Application
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    initializeEventListeners();
    loadJournalData();
});
