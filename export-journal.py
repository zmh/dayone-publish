#!/usr/bin/env python3
"""
Day One Journal Exporter

This script reads directly from the Day One SQLite database and exports
all entries with metadata and photos to a JSON file and media folder
for use with the static site generator.

Usage:
    python export-journal.py [--output ./data] [--journal "Journal Name"]

The Day One database is located at:
    ~/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite
"""

import argparse
import json
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


# Default paths
DEFAULT_DB_PATH = os.path.expanduser(
    "~/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite"
)
DEFAULT_PHOTOS_PATH = os.path.expanduser(
    "~/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOnePhotos"
)
DEFAULT_OUTPUT_DIR = "./data"


def get_connection(db_path: str) -> sqlite3.Connection:
    """Create a read-only connection to the Day One database."""
    # Use URI to open in read-only mode
    uri = f"file:{db_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def get_journals(conn: sqlite3.Connection) -> list[dict]:
    """Get all journals from the database."""
    cursor = conn.execute("""
        SELECT
            Z_PK as id,
            ZUUID as uuid,
            ZNAME as name
        FROM ZJOURNAL
        WHERE ZISDELETED = 0 OR ZISDELETED IS NULL
        ORDER BY ZNAME
    """)
    return [dict(row) for row in cursor.fetchall()]


def get_entries(conn: sqlite3.Connection, journal_id: int = None) -> list[dict]:
    """Get all entries, optionally filtered by journal."""
    query = """
        SELECT
            e.Z_PK as id,
            e.ZUUID as uuid,
            e.ZTEXT as text,
            e.ZMARKDOWNTEXT as markdown_text,
            e.ZCREATIONDATE as creation_date,
            e.ZMODIFIEDDATE as modified_date,
            e.ZSTARRED as starred,
            e.ZLOCATION as location_id,
            e.ZWEATHER as weather_id,
            j.ZNAME as journal_name,
            j.ZUUID as journal_uuid
        FROM ZENTRY e
        LEFT JOIN ZJOURNAL j ON e.ZJOURNAL = j.Z_PK
        WHERE (e.ZISDELETED = 0 OR e.ZISDELETED IS NULL)
    """

    params = []
    if journal_id:
        query += " AND e.ZJOURNAL = ?"
        params.append(journal_id)

    query += " ORDER BY e.ZCREATIONDATE DESC"

    cursor = conn.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def get_location(conn: sqlite3.Connection, location_id: int) -> dict | None:
    """Get location data for an entry."""
    if not location_id:
        return None

    cursor = conn.execute("""
        SELECT
            ZPLACENAME as place_name,
            ZLOCALITYNAME as locality,
            ZADMINISTRATIVEAREA as admin_area,
            ZCOUNTRY as country,
            ZLATITUDE as latitude,
            ZLONGITUDE as longitude
        FROM ZLOCATION
        WHERE Z_PK = ?
    """, (location_id,))

    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def get_weather(conn: sqlite3.Connection, weather_id: int) -> dict | None:
    """Get weather data for an entry."""
    if not weather_id:
        return None

    cursor = conn.execute("""
        SELECT
            ZCONDITIONSDESCRIPTION as conditions,
            ZTEMPERATURECELSIUS as temp_celsius,
            ZRELATIVEHUMIDITY as humidity,
            ZWINDSPEEDKPH as wind_speed,
            ZSUNRISEDATE as sunrise,
            ZSUNSETDATE as sunset
        FROM ZWEATHER
        WHERE Z_PK = ?
    """, (weather_id,))

    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def get_tags(conn: sqlite3.Connection, entry_id: int) -> list[str]:
    """Get tags for an entry."""
    cursor = conn.execute("""
        SELECT t.ZNAME as name
        FROM ZTAG t
        JOIN Z_12TAGS et ON t.Z_PK = et.Z_14TAGS
        WHERE et.Z_12ENTRIES = ?
        ORDER BY t.ZNAME
    """, (entry_id,))

    return [row['name'] for row in cursor.fetchall()]


def get_attachments(conn: sqlite3.Connection, entry_id: int) -> list[dict]:
    """Get photo/media attachments for an entry."""
    cursor = conn.execute("""
        SELECT
            a.Z_PK as id,
            a.ZUUID as uuid,
            a.ZTYPE as type,
            a.ZMD5 as md5,
            a.ZFILENAME as filename,
            a.ZWIDTH as width,
            a.ZHEIGHT as height,
            a.ZCREATIONDATE as creation_date
        FROM ZATTACHMENT a
        WHERE a.ZENTRY = ?
        ORDER BY a.ZCREATIONDATE
    """, (entry_id,))

    return [dict(row) for row in cursor.fetchall()]


def convert_apple_timestamp(timestamp: float) -> str | None:
    """Convert Apple Core Data timestamp to ISO format.

    Apple uses seconds since 2001-01-01 00:00:00 UTC.
    """
    if timestamp is None:
        return None

    # Apple epoch is 2001-01-01 00:00:00 UTC
    # Unix epoch is 1970-01-01 00:00:00 UTC
    # Difference is 978307200 seconds
    APPLE_EPOCH_OFFSET = 978307200

    unix_timestamp = timestamp + APPLE_EPOCH_OFFSET
    dt = datetime.utcfromtimestamp(unix_timestamp)
    return dt.isoformat() + "Z"


def find_photo_file(photos_path: str, attachment: dict) -> str | None:
    """Find the actual photo file for an attachment."""
    uuid = attachment.get('uuid')
    md5 = attachment.get('md5')
    filename = attachment.get('filename')

    if not uuid:
        return None

    # Day One stores photos in subdirectories based on UUID
    # Try various path patterns
    photos_dir = Path(photos_path)

    # Pattern 1: UUID.jpeg or UUID.jpg
    for ext in ['.jpeg', '.jpg', '.png', '.heic', '.gif', '.mp4', '.mov']:
        path = photos_dir / f"{uuid}{ext}"
        if path.exists():
            return str(path)

    # Pattern 2: Nested directory structure (first 2 chars of UUID)
    if len(uuid) >= 2:
        subdir = photos_dir / uuid[:2]
        if subdir.exists():
            for ext in ['.jpeg', '.jpg', '.png', '.heic', '.gif', '.mp4', '.mov']:
                path = subdir / f"{uuid}{ext}"
                if path.exists():
                    return str(path)

    # Pattern 3: Check by MD5
    if md5:
        for ext in ['.jpeg', '.jpg', '.png', '.heic', '.gif', '.mp4', '.mov']:
            path = photos_dir / f"{md5}{ext}"
            if path.exists():
                return str(path)

    # Pattern 4: Original filename
    if filename:
        path = photos_dir / filename
        if path.exists():
            return str(path)

    return None


def copy_media(src_path: str, dest_dir: Path, uuid: str) -> str | None:
    """Copy a media file to the output directory."""
    if not src_path:
        return None

    src = Path(src_path)
    if not src.exists():
        return None

    # Preserve original extension
    ext = src.suffix.lower()
    dest_filename = f"{uuid}{ext}"
    dest_path = dest_dir / dest_filename

    try:
        shutil.copy2(src, dest_path)
        return dest_filename
    except Exception as e:
        print(f"Warning: Could not copy {src_path}: {e}")
        return None


def export_journal(
    db_path: str = DEFAULT_DB_PATH,
    photos_path: str = DEFAULT_PHOTOS_PATH,
    output_dir: str = DEFAULT_OUTPUT_DIR,
    journal_name: str = None
):
    """Export journal entries to JSON and copy media files."""

    output_path = Path(output_dir)
    media_path = output_path / "media"

    # Create output directories
    output_path.mkdir(parents=True, exist_ok=True)
    media_path.mkdir(parents=True, exist_ok=True)

    print(f"Connecting to Day One database: {db_path}")
    conn = get_connection(db_path)

    # Get journals
    journals = get_journals(conn)
    print(f"Found {len(journals)} journals")

    # Filter by journal name if specified
    target_journal_id = None
    if journal_name:
        for j in journals:
            if j['name'] and j['name'].lower() == journal_name.lower():
                target_journal_id = j['id']
                break
        if not target_journal_id:
            print(f"Warning: Journal '{journal_name}' not found. Exporting all journals.")

    # Get entries
    entries = get_entries(conn, target_journal_id)
    print(f"Found {len(entries)} entries")

    # Process entries
    exported_entries = []
    for i, entry in enumerate(entries):
        if (i + 1) % 100 == 0:
            print(f"Processing entry {i + 1}/{len(entries)}...")

        # Get related data
        location = get_location(conn, entry.get('location_id'))
        weather = get_weather(conn, entry.get('weather_id'))
        tags = get_tags(conn, entry['id'])
        attachments = get_attachments(conn, entry['id'])

        # Process attachments and copy media
        processed_attachments = []
        for att in attachments:
            src_file = find_photo_file(photos_path, att)
            copied_filename = copy_media(src_file, media_path, att['uuid'])

            processed_attachments.append({
                'uuid': att['uuid'],
                'type': att['type'],
                'filename': copied_filename,
                'width': att['width'],
                'height': att['height'],
                'original_filename': att['filename']
            })

        # Build entry object
        exported_entry = {
            'uuid': entry['uuid'],
            'text': entry['text'] or entry['markdown_text'] or '',
            'creationDate': convert_apple_timestamp(entry['creation_date']),
            'modifiedDate': convert_apple_timestamp(entry['modified_date']),
            'starred': bool(entry['starred']),
            'journalName': entry['journal_name'],
            'journalUuid': entry['journal_uuid'],
            'tags': tags,
            'attachments': processed_attachments,
            'location': location,
            'weather': weather
        }

        exported_entries.append(exported_entry)

    # Write JSON output
    output_file = output_path / "journal.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'exportDate': datetime.utcnow().isoformat() + "Z",
            'journals': journals,
            'entries': exported_entries
        }, f, indent=2, ensure_ascii=False)

    print(f"\nExport complete!")
    print(f"  Entries: {len(exported_entries)}")
    print(f"  Output: {output_file}")
    print(f"  Media: {media_path}")

    conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Export Day One journal entries to JSON and media files"
    )
    parser.add_argument(
        '--db',
        default=DEFAULT_DB_PATH,
        help=f"Path to Day One SQLite database (default: {DEFAULT_DB_PATH})"
    )
    parser.add_argument(
        '--photos',
        default=DEFAULT_PHOTOS_PATH,
        help=f"Path to Day One photos directory (default: {DEFAULT_PHOTOS_PATH})"
    )
    parser.add_argument(
        '--output', '-o',
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})"
    )
    parser.add_argument(
        '--journal', '-j',
        help="Export only entries from this journal (by name)"
    )

    args = parser.parse_args()

    # Check if database exists
    if not os.path.exists(args.db):
        print(f"Error: Day One database not found at {args.db}")
        print("\nMake sure Day One is installed and you have entries synced.")
        print("The database should be at:")
        print(f"  {DEFAULT_DB_PATH}")
        return 1

    export_journal(
        db_path=args.db,
        photos_path=args.photos,
        output_dir=args.output,
        journal_name=args.journal
    )

    return 0


if __name__ == '__main__':
    exit(main())
