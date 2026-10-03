use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Clone, Serialize, Deserialize)]
pub struct TrayActivity {
    pub id: i64,
    pub name: String,
    pub running: bool,
    #[serde(default)]
    pub paused: bool,
}

fn format_minutes(total_minutes: i64) -> String {
    let h = total_minutes / 60;
    let m = total_minutes % 60;
    if h == 0 {
        format!("{}m", m)
    } else {
        format!("{}h{:02}", h, m)
    }
}

#[tauri::command]
fn rebuild_tray_menu(
    app: AppHandle,
    activities: Vec<TrayActivity>,
    today_minutes: i64,
) -> Result<(), String> {
    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();

    for activity in activities.into_iter().take(8) {
        let play_pause_label = match (activity.running, activity.paused) {
            (false, _) => format!("▶ Démarrer — {}", activity.name),
            (true, false) => format!("⏸ Pause — {}", activity.name),
            (true, true) => format!("▶ Reprendre — {}", activity.name),
        };
        let item_id = format!("playpause-{}", activity.id);
        let item = MenuItem::with_id(&app, item_id, play_pause_label, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        items.push(item);

        if activity.running {
            let stop_id = format!("stop-{}", activity.id);
            let stop_label = format!("⏹ Arrêter — {}", activity.name);
            let stop_item = MenuItem::with_id(&app, stop_id, stop_label, true, None::<&str>)
                .map_err(|e| e.to_string())?;
            items.push(stop_item);
        }
    }

    let show_item = MenuItem::with_id(&app, "show", "Afficher TempoTask", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit_item = PredefinedMenuItem::quit(&app, Some("Quitter")).map_err(|e| e.to_string())?;
    let separator = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;

    let mut menu_items: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = Vec::new();
    for item in &items {
        menu_items.push(item);
    }
    if !items.is_empty() {
        menu_items.push(&separator);
    }
    menu_items.push(&show_item);
    menu_items.push(&quit_item);

    let menu = Menu::with_items(&app, &menu_items).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
        // macOS-only: shows today's tracked time next to the tray icon, ignored elsewhere.
        let title = if today_minutes > 0 {
            format!(" {}", format_minutes(today_minutes))
        } else {
            String::new()
        };
        let _ = tray.set_title(Some(title));
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Migrations are checksummed: never edit a migration file once applied, only add new ones.
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_core_tables",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "pin_and_pause_support",
            sql: include_str!("../migrations/002_pin_pause.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tempotask.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![rebuild_tray_menu])
        .setup(|app| {
            let show_item =
                MenuItem::with_id(app, "show", "Afficher TempoTask", true, None::<&str>)?;
            let quit_item = PredefinedMenuItem::quit(app, Some("Quitter"))?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    let id = event.id().0.as_str();
                    if id == "show" {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        return;
                    }
                    let (event, activity_id) = if let Some(rest) = id.strip_prefix("playpause-") {
                        ("tray://play-pause-timer", rest)
                    } else if let Some(rest) = id.strip_prefix("stop-") {
                        ("tray://stop-timer", rest)
                    } else {
                        return;
                    };
                    if let Ok(activity_id) = activity_id.parse::<i64>() {
                        let _ = app.emit(event, activity_id);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
