use std::fs;
use std::path::Path;

fn main() {
    let out_dir = std::env::var("OUT_DIR").unwrap();
    let target_dir = Path::new(&out_dir).join("../../../");
    let config_src = Path::new("../config");
    
    let config_dst = target_dir.join("config");

    if config_src.exists() {
        if config_dst.exists() {
            fs::remove_dir_all(&config_dst).unwrap();
        }
        fs::create_dir_all(&config_dst).unwrap();
        copy_dir(config_src, config_dst.as_path()).unwrap();
    }
    tauri_build::build()
}

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let entry_name = entry.file_name();
        let dst_path = dst.join(entry_name);

        if entry_path.is_dir() {
            fs::create_dir_all(&dst_path)?;
            copy_dir(&entry_path, &dst_path)?;
        } else {
            fs::copy(&entry_path, &dst_path)?;
        }
    }
    Ok(())
}