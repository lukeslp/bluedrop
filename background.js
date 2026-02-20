// Background service worker for Bluedrop
// Handles WebSocket connections for real-time updates

// Firefox compatibility - use browser API if available, fallback to chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_PDS = 'https://bsky.social';
const CHAT_PROXY_HEADER = { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' };

let session = null;
let ws = null;
let reconnectTimer = null;
let activeConvoId = null;

// Initialize session from storage
browserAPI.storage.local.get(['bsky_session'], (result) => {
  if (result.bsky_session) {
    session = result.bsky_session;
    connectWebSocket();
  }
});

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SESSION_UPDATE':
      session = message.session;
      if (session) {
        browserAPI.storage.local.set({ bsky_session: session });
        connectWebSocket();
      } else {
        disconnectWebSocket();
        browserAPI.storage.local.remove('bsky_session');
      }
      sendResponse({ success: true });
      break;
      
    case 'SET_ACTIVE_CONVO':
      activeConvoId = message.convoId;
      sendResponse({ success: true });
      break;
      
    case 'GET_SESSION':
      sendResponse({ session });
      break;
      
    case 'SEND_MESSAGE':
      handleSendMessage(message.convoId, message.text)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'FETCH_CONVOS':
      fetchConvos()
        .then(convos => sendResponse({ success: true, convos }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'FETCH_MESSAGES':
      fetchMessages(message.convoId)
        .then(messages => sendResponse({ success: true, messages }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'ADD_REACTION':
      handleAddReaction(message.convoId, message.messageId, message.emoji)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'DELETE_MESSAGE':
      handleDeleteMessage(message.convoId, message.messageId)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'MUTE_CONVO':
      handleMuteConvo(message.convoId)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'UNMUTE_CONVO':
      handleUnmuteConvo(message.convoId)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// WebSocket connection management
function connectWebSocket() {
  if (!session || ws) return;
  
  // Note: Bluesky uses a firehose/jetstream for real-time updates
  // For chat specifically, we'll use periodic fetching in background
  // but keep connection alive for potential future WebSocket support
  
  console.log('Background worker ready for real-time updates');
  
  // Set up periodic check (less frequent than polling in UI)
  if (reconnectTimer) clearInterval(reconnectTimer);
  reconnectTimer = setInterval(() => {
    if (session) {
      checkForUpdates();
    }
  }, 10000); // Check every 10 seconds in background
}

function disconnectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
}

// Store previous unread count to detect new messages
let previousUnreadCount = 0;
let previousConvos = [];

// Check for updates and notify popup
async function checkForUpdates() {
  try {
    const convos = await fetchConvos();
    
    // Check for unread messages
    const unreadCount = convos.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    
    // Update badge
    if (unreadCount > 0) {
      browserAPI.action.setBadgeText({ text: String(unreadCount) });
      browserAPI.action.setBadgeBackgroundColor({ color: '#2563eb' });
    } else {
      browserAPI.action.setBadgeText({ text: '' });
    }
    
    // Check for new messages and send notifications
    if (unreadCount > previousUnreadCount) {
      // Find conversations with new messages
      convos.forEach((convo, idx) => {
        const prevConvo = previousConvos[idx];
        if (convo.unreadCount > 0 && (!prevConvo || convo.unreadCount > (prevConvo.unreadCount || 0))) {
          // New message detected
          const otherMember = convo.members?.find(m => m.did !== session?.did);
          if (otherMember && convo.lastMessage) {
            // Send desktop notification
            browserAPI.notifications.create({
              type: 'basic',
              iconUrl: otherMember.avatar || 'icon128.png',
              title: `${otherMember.displayName || otherMember.handle}`,
              message: convo.lastMessage.text || 'New message',
              priority: 2,
              requireInteraction: false
            });
          }
        }
      });
    }
    
    // Update stored values
    previousUnreadCount = unreadCount;
    previousConvos = convos;
    
    // Notify popup if open
    browserAPI.runtime.sendMessage({ 
      type: 'CONVOS_UPDATE', 
      convos 
    }).catch(() => {}); // Ignore if popup not open
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// API Helper
async function apiCall(endpoint, options = {}) {
  const { 
    method = 'GET', 
    body, 
    headers = {}, 
    skipProxy = false,
    useAppView = false 
  } = options;
  
  let baseUrl;
  if (useAppView) {
    baseUrl = 'https://public.api.bsky.app';
  } else {
    baseUrl = (session?.serviceUrl || DEFAULT_PDS).replace(/\/$/, '');
  }
  
  const urlPath = `/xrpc/${endpoint}`;
  let finalUrl = `${baseUrl}${urlPath}`;
  
  const authHeader = (useAppView) ? {} : { 'Authorization': `Bearer ${session?.accessJwt}` };
  const proxyHeader = (skipProxy || useAppView) ? {} : CHAT_PROXY_HEADER;

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...proxyHeader,
      ...headers
    }
  };

  if (method === 'GET' && body) {
    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}${params.toString()}`;
  } else if (method !== 'GET' && body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(finalUrl, fetchOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Unknown Error';
    
    // Fallback to direct chat endpoint if proxy fails
    if (endpoint.startsWith('chat.bsky.') && (errorMessage === 'XRPCNotSupported' || response.status === 404)) {
      const chatUrlBase = 'https://api.bsky.chat';
      let fallbackUrl = `${chatUrlBase}${urlPath}`;
      if (finalUrl.includes('?')) fallbackUrl += finalUrl.substring(finalUrl.indexOf('?'));
      
      const fallbackOptions = { ...fetchOptions };
      const fallbackHeaders = { ...fallbackOptions.headers };
      delete fallbackHeaders['Atproto-Proxy'];
      fallbackOptions.headers = fallbackHeaders;

      const fallbackRes = await fetch(fallbackUrl, fallbackOptions);
      if (fallbackRes.ok) return fallbackRes.json();
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

// API Methods
async function fetchConvos() {
  if (!session) throw new Error('No session');
  const res = await apiCall('chat.bsky.convo.listConvos', { method: 'GET' });
  return (res && Array.isArray(res.convos)) ? res.convos : [];
}

async function fetchMessages(convoId) {
  if (!session || !convoId) throw new Error('No session or convoId');
  const res = await apiCall('chat.bsky.convo.getMessages', {
    method: 'GET',
    body: { convoId, limit: 50 }
  });
  return (res && Array.isArray(res.messages)) ? res.messages.reverse() : [];
}

async function handleSendMessage(convoId, text) {
  if (!session || !convoId || !text) throw new Error('Missing parameters');
  const res = await apiCall('chat.bsky.convo.sendMessage', {
    method: 'POST',
    body: { convoId, message: { text } }
  });
  
  // Trigger update check after sending
  setTimeout(() => checkForUpdates(), 500);
  
  return res;
}

async function handleAddReaction(convoId, messageId, emoji) {
  if (!session || !convoId || !messageId || !emoji) throw new Error('Missing parameters');
  const res = await apiCall('chat.bsky.convo.addReaction', {
    method: 'POST',
    body: { convoId, messageId, reaction: emoji }
  });
  return res;
}

async function handleDeleteMessage(convoId, messageId) {
  if (!session || !convoId || !messageId) throw new Error('Missing parameters');
  const res = await apiCall('chat.bsky.convo.deleteMessageForSelf', {
    method: 'POST',
    body: { convoId, messageId }
  });
  return res;
}

async function handleMuteConvo(convoId) {
  if (!session || !convoId) throw new Error('Missing parameters');
  const res = await apiCall('chat.bsky.convo.muteConvo', {
    method: 'POST',
    body: { convoId }
  });
  return res;
}

async function handleUnmuteConvo(convoId) {
  if (!session || !convoId) throw new Error('Missing parameters');
  const res = await apiCall('chat.bsky.convo.unmuteConvo', {
    method: 'POST',
    body: { convoId }
  });
  return res;
}

// Keep service worker alive
browserAPI.runtime.onStartup.addListener(() => {
  console.log('Service worker started');
});

browserAPI.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});

// Handle notification clicks - open extension popup
browserAPI.notifications.onClicked.addListener((notificationId) => {
  // Open the extension popup by opening the extension's action
  browserAPI.action.openPopup().catch(() => {
    // If popup fails to open, we can't do much in MV3
    console.log('Could not open popup from notification');
  });
});
