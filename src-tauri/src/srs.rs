#[derive(Debug)]
pub struct CardSchedule {
    pub interval_days: f64,
    pub ease_factor: f64,
    pub due_date_offset_days: f64,
}

/// SM-2 algorithm. rating: 1=Again, 2=Hard, 3=Good, 4=Easy
pub fn calculate_next(
    current_interval: f64,
    current_ease: f64,
    review_count: i64,
    rating: i64,
) -> CardSchedule {
    let ease_delta: f64 = match rating {
        1 => -0.20,
        2 => -0.15,
        3 => 0.0,
        4 => 0.10,
        _ => 0.0,
    };

    let new_ease = (current_ease + ease_delta).clamp(1.3, 4.0);

    let new_interval: f64 = if rating == 1 {
        1.0 // Reset to 1 day on "Again"
    } else if review_count == 0 {
        1.0
    } else if review_count == 1 {
        6.0
    } else {
        (current_interval * new_ease).round()
    };

    CardSchedule {
        interval_days: new_interval,
        ease_factor: new_ease,
        due_date_offset_days: new_interval,
    }
}