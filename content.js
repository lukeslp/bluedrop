// Zen Mode Content Script
// Injects CSS to hide specific elements on bsky.app based on settings

(function () {
  const STYLE_ID = 'bluedrop-zen-mode';

  function getZenCSS(settings) {
    let css = '';

    if (settings.hideLikes) {
      css += `
                [data-testid="likeCount"],
                button[aria-label*="Like"],
                button[aria-label*="like"],
                button[aria-label*="Unlike"],
                [aria-label*="Like ("],
                div[style*="color: rgb(236, 72, 153)"] {
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `;
    }

    if (settings.hideReplies) {
      css += `
                [data-testid="replyCount"],
                button[aria-label*="Reply"],
                button[aria-label*="reply"],
                [aria-label*="Reply ("],
                a[href*="/post/"][aria-label*="replies"] {
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `;
    }

    if (settings.hideReposts) {
      css += `
                [data-testid="repostCount"],
                button[aria-label*="Repost"],
                button[aria-label*="repost"],
                [aria-label*="Repost ("],
                div[style*="color: rgb(0, 186, 124)"] {
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `;
    }

    if (settings.hideQuotes) {
      css += `
                [data-testid="quoteCount"],
                [aria-label*="quote"],
                [aria-label*="Quote"] {
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `;
    }

    if (settings.hideFollowers) {
      css += `
                [data-testid="profileHeaderFollowersCount"],
                [data-testid="profileHeaderFollowsCount"],
                a[href*="/followers"],
                a[href*="/follows"] {
                    visibility: hidden !important;
                }
            `;
    }

    // Keep "Hide Recent Posts" logic if user ever wants it back, but currently unused/removed from UI
    if (settings.hideRecentPosts) {
      css += `
                [data-testid="profilePager"] {
                    display: none !important;
                }
            `;
    }

    return css;
  }

  function updateZenMode(settings) {
    // Remove existing style
    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // If no settings or all false, just return
    if (!settings) return;

    const css = getZenCSS(settings);
    if (!css) return;

    // Inject new style
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Initialize
  if (window.chrome && chrome.storage) {
    // Initial load
    chrome.storage.local.get(['zenMode'], (result) => {
      if (result.zenMode) {
        updateZenMode(result.zenMode);
      }
    });

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.zenMode) {
        updateZenMode(changes.zenMode.newValue);
      }
    });
  } else if (window.browser && browser.storage) {
    // Firefox support
    browser.storage.local.get(['zenMode']).then((result) => {
      if (result.zenMode) {
        updateZenMode(result.zenMode);
      }
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.zenMode) {
        updateZenMode(changes.zenMode.newValue);
      }
    });
  }
})();
