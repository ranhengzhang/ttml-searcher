use serde::{Deserialize, Serialize};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 定义返回类型 - 现在使用元组而不是结构体
#[derive(Serialize, Deserialize)]
struct FetchResponse {
    status_code: u16,
    content: String,
}

#[tauri::command]
async fn fetch_url(
    url: String,
    protocol: Option<String>,
    ip: Option<String>,
    port: Option<u16>,
) -> Result<FetchResponse, String> {
    // 创建HTTP客户端构建器
    let client_builder = reqwest::Client::builder();

    // 配置代理（如果提供了ip和port）
    let client_builder = if let (Some(protocol), Some(ip), Some(port)) = (protocol, ip, port) {
        let proxy_url = format!("{}://{}:{}", protocol, ip, port);
        // log::debug!("{}", proxy_url);
        client_builder.proxy(reqwest::Proxy::all(&proxy_url).map_err(|e| e.to_string())?)
    } else {
        client_builder
    };

    // 构建HTTP客户端
    let client = client_builder.build().map_err(|e| e.to_string())?;

    // 发送GET请求
    let response = match client.get(&url).send().await {
        Ok(resp) => resp,
        Err(e) => {
            // 处理请求错误
            return Ok(FetchResponse {
                status_code: 0,
                content: format!("Request error: {}", e),
            });
        }
    };

    // 获取状态码
    let status_code = response.status().as_u16();

    // 获取响应内容
    let content = match response.text().await {
        Ok(text) => text,
        Err(e) => {
            // 处理内容解析错误
            return Ok(FetchResponse {
                status_code,
                content: format!("Content error: {}", e),
            });
        }
    };

    // 返回结果
    Ok(FetchResponse {
        status_code,
        content,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, fetch_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
