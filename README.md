# dayone-publish

Publish a Day One journal as a static site.

![Timeline View](screenshots/timeline.png)

## Quick Start

```bash
# Export your journal (reads directly from Day One's database)
python export-journal.py

# Or export a specific journal
python export-journal.py --journal "Travel"
```

Then open `index.html` or deploy to any static host (GitHub Pages, Netlify, etc.).

Edit `config.js` to set your site title and description.

## Screenshots

![Media View](screenshots/media.png)
![Map View](screenshots/map.png)

## Privacy

Your journal data (`data.js`, `data/media/*`) is git-ignored. Only the demo data is tracked.

## License

MIT
