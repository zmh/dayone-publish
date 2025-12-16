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
    currentView: 'list',
    currentFilter: 'all',
    map: null,
    markers: null
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    app: document.getElementById('app'),
    entriesList: document.getElementById('entriesList'),
    calendarContainer: document.getElementById('calendarContainer'),
    mediaGrid: document.getElementById('mediaGrid'),
    mapView: document.getElementById('mapView'),
    map: document.getElementById('map'),
    modal: document.getElementById('entryModal'),
    modalBody: document.getElementById('modalBody'),
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
async function loadJournalData() {
    try {
        const response = await fetch(CONFIG.dataPath);
        if (!response.ok) {
            throw new Error('Failed to load journal data');
        }

        const data = await response.json();
        state.entries = data.entries || [];
        state.journals = data.journals || [];

        console.log(`Loaded ${state.entries.length} entries from ${state.journals.length} journals`);

        // Initialize all views
        renderListView();
        renderCalendarView();
        renderMediaView();
        initializeMap();

        // Update entry count
        updateEntryCount();

    } catch (error) {
        console.error('Error loading journal data:', error);
        showEmptyState('Unable to load journal entries. Make sure you have exported your journal data.');
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
// List View
// ========================================
function renderListView() {
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

    // Add click handlers
    elements.entriesList.querySelectorAll('.entry-item').forEach(item => {
        item.addEventListener('click', () => openEntryModal(item.dataset.entryId));
    });
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
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (currentDate >= endDate) {
        html += renderCalendarMonth(currentDate, entriesByDate);
        currentDate.setMonth(currentDate.getMonth() - 1);
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
        marker.on('click', () => {
            // Could open modal instead: openEntryModal(entry.uuid);
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

    // Refresh map size when switching to map view
    if (viewName === 'map' && state.map) {
        setTimeout(() => {
            state.map.invalidateSize();
        }, 100);
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
// Event Listeners
// ========================================
function initializeEventListeners() {
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

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.classList.contains('open')) {
            closeModal();
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
    initializeEventListeners();
    loadJournalData();
});
