# dayone-publish

Publish a Day One journal as a static site — perfect for travel journals, baby photos, a simple blog, or anything else you want to be publicly viewable.

![Timeline View](screenshots/timeline.png)

## Features

- **Timeline View** — Browse entries chronologically with a split-view layout on desktop
- **Calendar View** — See entries organized by date
- **Media View** — Gallery of all photos and media from your journal
- **Map View** — Visualize entries on an interactive map with clustering
- **Dark Mode** — Automatic system detection with manual toggle
- **Fully Static** — No server required, host anywhere (GitHub Pages, Netlify, etc.)
- **Responsive** — Works great on desktop and mobile

![Media View](screenshots/media.png)

![Map View](screenshots/map.png)

## Quick Start

1. Clone this repository
2. Export your Day One journal as JSON (File → Export → JSON)
3. Place your exported `Journal.json` in the `data/` folder
4. Copy your media files to `data/media/`
5. Edit `config.js` to customize your site title and description
6. Open `index.html` in a browser or deploy to your hosting provider

## Configuration

Edit `config.js` to customize your site:

```javascript
const SITE_CONFIG = {
    title: 'My Journal',
    about: {
        title: 'About this journal',
        description: 'Your journal description here...'
    },
    // ... other settings
};
```

## Exporting from Day One

1. Open Day One on Mac
2. Select the journal you want to export
3. Go to **File → Export → JSON**
4. Check "Include media" if you want photos
5. Save and unzip the export
6. Copy `Journal.json` to `data/journal.json`
7. Copy the `photos/` folder contents to `data/media/`

## Demo

The `demo/` folder contains sample data you can use to preview the site. To use it:

```bash
cp demo/data.js .
cp -r demo/media/* data/media/
```

## Folder Structure

```
dayone-publish/
├── index.html          # Main HTML file
├── app.js              # Application logic
├── styles.css          # Styles
├── config.js           # Site configuration
├── data.js             # Journal data (generated from export)
├── data/
│   └── media/          # Photos and media files
├── demo/               # Sample data for testing
└── screenshots/        # README screenshots
```

## Hosting

This is a fully static site. You can host it anywhere:

- **GitHub Pages** — Push to a repo and enable Pages
- **Netlify** — Drag and drop the folder
- **Vercel** — Import the repo
- **Any web server** — Just upload the files

## Privacy Note

This creates a **public** website with your journal entries. Consider:
- Only export journals you want to share
- Use a private repository if hosting on GitHub
- Add password protection if your host supports it
- Review entries before deploying

## License

MIT License — see [LICENSE](LICENSE) for details.

## Credits

Built with:
- [Leaflet](https://leafletjs.com/) for maps
- [Marked](https://marked.js.org/) for Markdown parsing
- [Font Awesome](https://fontawesome.com/) for icons

Inspired by [Day One](https://dayoneapp.com/) — the award-winning journaling app.
