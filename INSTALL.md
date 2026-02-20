# Bluedrop Extension - Installation Instructions

## Chrome Installation

### Option 1: Load Unpacked (Recommended for Testing)

1. Extract `bluedrop-v8.1.5-chrome.zip` to a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. **If you have an older version loaded:**
   - Click "Remove" on the old Bluedrop extension
   - **Important:** Restart Chrome completely to clear cache
5. Click "Load unpacked"
6. Select the extracted folder containing `manifest.json`
7. The extension should now appear with proper styling

### Option 2: Install from ZIP

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Drag `bluedrop-v8.1.5-chrome.zip` onto the extensions page
4. Chrome will extract and install it

## Firefox Installation

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `bluedrop-v8.1.5-firefox.xpi` file
4. The extension will be loaded temporarily

## Troubleshooting

### CSS/JS Not Loading (Unstyled Popup)

This is usually caused by browser caching of the old extension:

**Solution:**
1. Go to `chrome://extensions/`
2. **Remove** the extension completely
3. **Close Chrome entirely** (not just the window - quit the app)
4. Reopen Chrome
5. Load the extension again

### Still Having Issues?

Try testing in an Incognito window:
1. Go to `chrome://extensions/`
2. Find Bluedrop extension
3. Click "Details"
4. Enable "Allow in incognito"
5. Open an incognito window and test the extension there

## Verifying Extension Files

The extension should contain:
- ✅ `index.html` (with `<script src="./assets/index.js">`)
- ✅ `assets/index.js` (185KB)
- ✅ `assets/index.css` (5KB)
- ✅ `manifest.json`
- ✅ `background.js`
- ✅ `icon16.png`, `icon48.png`, `icon128.png`

## Version: 8.1.5
- Fixed: Popup dimensions (380px × 550px)
- Fixed: Relative asset paths for proper CSS/JS loading
