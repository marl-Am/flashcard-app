use rusqlite::{params, Connection, Result};

use crate::models::{Card, DayActivity, FolderNode};
use crate::srs;

pub fn initialize(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS folders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            parent_id   INTEGER REFERENCES folders(id) ON DELETE CASCADE,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(name, parent_id)
        );

        CREATE TABLE IF NOT EXISTS cards (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id       INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
            front           TEXT    NOT NULL,
            back            TEXT    NOT NULL,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            due_date        TEXT    NOT NULL DEFAULT (datetime('now')),
            interval_days   REAL    NOT NULL DEFAULT 1.0,
            ease_factor     REAL    NOT NULL DEFAULT 2.5,
            review_count    INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            reviewed_at TEXT    NOT NULL DEFAULT (datetime('now')),
            rating      INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cards_due    ON cards(due_date);
        CREATE INDEX IF NOT EXISTS idx_cards_folder ON cards(folder_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(reviewed_at);
        ",
    )
}

// ── Folder Operations ────────────────────────────────────────────────────────

pub fn get_folder_tree(conn: &Connection) -> Result<Vec<FolderNode>> {
    let mut stmt = conn.prepare("SELECT id, name, parent_id FROM folders ORDER BY id")?;

    let rows: Vec<(i64, String, Option<i64>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>>>()?;

    Ok(build_tree(&rows, None))
}

/// Recursively assembles a flat list of (id, name, parent_id) into a tree.
fn build_tree(all: &[(i64, String, Option<i64>)], parent_id: Option<i64>) -> Vec<FolderNode> {
    all.iter()
        .filter(|(_, _, pid)| *pid == parent_id)
        .map(|(id, name, _)| FolderNode {
            id: *id,
            name: name.clone(),
            parent_id,
            children: build_tree(all, Some(*id)),
        })
        .collect()
}

pub fn create_folder(conn: &Connection, name: &str, parent_id: Option<i64>) -> Result<i64> {
    conn.execute(
        "INSERT INTO folders (name, parent_id) VALUES (?1, ?2)",
        params![name, parent_id],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_folder(conn: &Connection, id: i64) -> Result<()> {
    // Cascades to child folders and cards via FK ON DELETE CASCADE
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
    Ok(())
}

// ── Card Operations ──────────────────────────────────────────────────────────

pub fn create_card(conn: &Connection, folder_id: i64, front: &str, back: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO cards (folder_id, front, back) VALUES (?1, ?2, ?3)",
        params![folder_id, front, back],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_due_cards(conn: &Connection, folder_id: i64) -> Result<Vec<Card>> {
    let mut stmt = conn.prepare(
        "SELECT id, folder_id, front, back, due_date,
                interval_days, ease_factor, review_count
         FROM   cards
         WHERE  folder_id = ?1
           AND  due_date <= datetime('now')
         ORDER  BY due_date ASC",
    )?;

    let cards = stmt
        .query_map(params![folder_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                front: row.get(2)?,
                back: row.get(3)?,
                due_date: row.get(4)?,
                interval_days: row.get(5)?,
                ease_factor: row.get(6)?,
                review_count: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>();

    cards
}

// ── Review Operations ────────────────────────────────────────────────────────

pub fn submit_review(conn: &Connection, card_id: i64, rating: i64) -> Result<()> {
    // 1. Fetch the card's current SRS state
    let (interval, ease, review_count): (f64, f64, i64) = conn.query_row(
        "SELECT interval_days, ease_factor, review_count FROM cards WHERE id = ?1",
        params![card_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    // 2. Compute next schedule
    let schedule = srs::calculate_next(interval, ease, review_count, rating);

    // 3. Build the SQLite modifier string, e.g. "+5 days"
    let offset = format!("+{} days", schedule.due_date_offset_days as i64);

    // 4. Update the card — parameterized to prevent injection
    conn.execute(
        "UPDATE cards
         SET interval_days = ?1,
             ease_factor   = ?2,
             review_count  = review_count + 1,
             due_date      = datetime('now', ?3)
         WHERE id = ?4",
        params![
            schedule.interval_days,
            schedule.ease_factor,
            offset,
            card_id
        ],
    )?;

    // 5. Append to review history
    conn.execute(
        "INSERT INTO reviews (card_id, rating) VALUES (?1, ?2)",
        params![card_id, rating],
    )?;

    Ok(())
}

// ── Heatmap Operations ───────────────────────────────────────────────────────

pub fn get_heatmap_data(conn: &Connection) -> Result<Vec<DayActivity>> {
    let mut stmt = conn.prepare(
        "SELECT date(reviewed_at, 'localtime') AS day, COUNT(*) AS cnt
            FROM   reviews
            WHERE  reviewed_at >= datetime('now', '-365 days')
            GROUP  BY day
            ORDER  BY day ASC",
    )?;

    let rows: Vec<(String, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>>>()?;

    Ok(rows
        .into_iter()
        .map(|(date, count)| {
            let level: u8 = match count {
                1..=2 => 1,
                3..=5 => 2,
                6..=10 => 3,
                c if c > 10 => 4,
                _ => 0,
            };
            DayActivity { date, count, level }
        })
        .collect())
}

pub fn get_all_cards(conn: &Connection, folder_id: i64) -> Result<Vec<Card>> {
    let mut stmt = conn.prepare(
        "SELECT id, folder_id, front, back, due_date,
                interval_days, ease_factor, review_count
         FROM   cards
         WHERE  folder_id = ?1
         ORDER  BY created_at DESC",
    )?;

    let cards = stmt
        .query_map(params![folder_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                front: row.get(2)?,
                back: row.get(3)?,
                due_date: row.get(4)?,
                interval_days: row.get(5)?,
                ease_factor: row.get(6)?,
                review_count: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>();

    cards
}

pub fn update_card(conn: &Connection, id: i64, front: &str, back: &str) -> Result<()> {
    conn.execute(
        "UPDATE cards SET front = ?1, back = ?2 WHERE id = ?3",
        params![front, back, id],
    )?;
    Ok(())
}

pub fn delete_card(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM cards WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn rename_folder(conn: &Connection, id: i64, name: &str) -> Result<()> {
    conn.execute(
        "UPDATE folders SET name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

pub fn get_due_counts(conn: &Connection) -> Result<Vec<(i64, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT folder_id, COUNT(*) as cnt
         FROM   cards
         WHERE  due_date <= datetime('now')
         GROUP  BY folder_id",
    )?;

    let rows = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>>>();

    rows
}

pub fn get_streak(conn: &Connection) -> Result<i64> {
    // Fetch all distinct review dates descending
    let mut stmt = conn.prepare(
        "SELECT DISTINCT date(reviewed_at, 'localtime')
        FROM   reviews
        ORDER  BY date(reviewed_at, 'localtime') DESC",
    )?;

    let dates: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>>>()?;

    if dates.is_empty() {
        return Ok(0);
    }

    // Check if the most recent review was today or yesterday.
    // If not, streak is broken.
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let yesterday = (chrono::Local::now() - chrono::Duration::days(1))
        .format("%Y-%m-%d")
        .to_string();

    if dates[0] != today && dates[0] != yesterday {
        return Ok(0);
    }

    // Count consecutive days
    let mut streak: i64 = 1;
    for i in 1..dates.len() {
        let prev = chrono::NaiveDate::parse_from_str(&dates[i - 1], "%Y-%m-%d")
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        let curr = chrono::NaiveDate::parse_from_str(&dates[i], "%Y-%m-%d")
            .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        if (prev - curr).num_days() == 1 {
            streak += 1;
        } else {
            break;
        }
    }

    Ok(streak)
}

pub fn get_total_counts(conn: &Connection) -> Result<Vec<(i64, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT folder_id, COUNT(*) FROM cards GROUP BY folder_id",
    )?;

    let rows = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>>>();

    rows
}