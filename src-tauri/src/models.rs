use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FolderNode {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub children: Vec<FolderNode>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Card {
    pub id: i64,
    pub folder_id: i64,
    pub front: String,
    pub back: String,
    pub due_date: String,
    pub interval_days: f64,
    pub ease_factor: f64,
    pub review_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DayActivity {
    pub date: String,   // "YYYY-MM-DD"
    pub count: i64,
    pub level: u8,      // 0–4 for heatmap intensity
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NewFolder {
    pub name: String,
    pub parent_id: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NewCard {
    pub folder_id: i64,
    pub front: String,
    pub back: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateCard {
    pub id: i64,
    pub front: String,
    pub back: String,
}