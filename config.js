/**
 * Site Configuration
 * Edit these values to customize your journal site
 */
const SITE_CONFIG = {
    // Site title (shown in header and browser tab)
    title: 'My Journal',

    // About section
    about: {
        title: 'About this journal',
        description: 'A collection of memories, adventures, and moments from our family travels. This journal captures the special experiences we\'ve shared together.'
    },

    // Data paths
    dataPath: './data/journal.json',
    mediaPath: './data/media/',

    // Map settings
    map: {
        tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        defaultCenter: [39.8283, -98.5795], // Center of USA
        defaultZoom: 4
    }
};
