# Day One Theme - Static Journal Website

A beautiful static website that displays your Day One journal entries with the same look and feel as the Day One iOS/macOS app.

## Features

- **List View**: Timeline of entries with thumbnails, titles, and metadata
- **Calendar View**: Visual calendar with photos on days you journaled
- **Media View**: Masonry grid of all your journal photos
- **Map View**: Interactive map showing where you wrote entries
- **Dark Mode**: Automatically follows your system preference
- **Mobile Optimized**: Responsive design that works great on all devices

## Quick Start

### 1. Export Your Journal

Run the export script to extract your Day One entries:

```bash
python export-journal.py
```

This will:
- Read from your local Day One database
- Export all entries to `./data/journal.json`
- Copy all media files to `./data/media/`

### 2. Preview Locally

Use any static file server to preview the site:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

### 3. Deploy

Deploy the entire folder to any static hosting service:

**GitHub Pages:**
```bash
# Push to your repository
git add .
git commit -m "Deploy journal"
git push

# Enable GitHub Pages in repository settings
# Set source to main branch, root folder
```

**Netlify:**
- Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)
- Or connect your GitHub repository

**Vercel:**
```bash
npx vercel
```

**Cloudflare Pages:**
- Connect your GitHub repository in Cloudflare dashboard
- Build command: (leave empty)
- Build output directory: `/`

## Export Script Options

```bash
# Export all journals
python export-journal.py

# Export specific journal
python export-journal.py --journal "My Journal"

# Custom output directory
python export-journal.py --output ./public/data

# Custom database path (if moved)
python export-journal.py --db /path/to/DayOne.sqlite
```

## Default Database Locations

The Day One database is located at:
```
~/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite
```

Photos are stored at:
```
~/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOnePhotos/
```

## Privacy Note

This creates a **public** website with your journal entries. Consider:
- Only export journals you want to share
- Use a private repository if hosting on GitHub
- Add password protection if your host supports it
- Review entries before deploying

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --dayone-blue: #2A9FD8;
    --bg-primary: #FFFFFF;
    --text-primary: #1D1D1F;
    /* ... */
}
```

### Map Tiles

Change the map style in `app.js`:

```javascript
const CONFIG = {
    mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    // Or use other providers like Mapbox, Stadia, etc.
};
```

## File Structure

```
dayonetheme/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── app.js              # Application logic
├── export-journal.py   # Export script
├── data/
│   ├── journal.json    # Exported entries
│   └── media/          # Copied photos/videos
└── README.md
```

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- iOS Safari 14+
- Android Chrome 88+

## Dependencies

All dependencies are loaded via CDN:
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) - Map marker clustering
- [Marked](https://marked.js.org/) - Markdown parsing
- [Font Awesome](https://fontawesome.com/) - Icons

## License

MIT License - feel free to modify and use for your own journal.

## Credits

Inspired by [Day One](https://dayoneapp.com/) - the award-winning journaling app.
