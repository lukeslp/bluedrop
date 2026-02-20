import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProfilePreviewModal from './ProfilePreviewModal';
import SettingsModal from './SettingsModal';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import {
  MessageSquare,
  Send,
  Plus,
  LogOut,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  ArrowLeft,
  Moon,
  Sun,
  Smile,
  Trash2,
  BellOff,
  Bell,
  Check,
  XCircle,
  MoreVertical,
  User,
  ExternalLink,
  Users,
  Calendar,
  Settings
} from 'lucide-react';

/**
 * CONSTANTS & CONFIGURATION
 */
// Firefox compatibility - use browser API if available, fallback to chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_PDS = 'https://bsky.social';
const PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const CHAT_PROXY_HEADER = { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' };

// Common emoji reactions
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

/**
 * DARK MODE HOOK
 */
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    browserAPI.storage.local.get(['darkMode'], (result) => {
      setDarkMode(result.darkMode ?? false);
    });
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    browserAPI.storage.local.set({ darkMode: newMode });
  };

  return [darkMode, toggleDarkMode];
};

/**
 * ERROR BOUNDARY
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    browserAPI.storage.local.remove('bsky_session');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-[#0F1419] p-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error</h1>
          <p className="text-slate-600 dark:text-[#8B98A5] mb-4 text-xs">
            Something went wrong
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-[#228DFF] text-white text-sm rounded-lg hover:bg-[#1A6FCC] transition flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HELPER: UTILS
 */
const formatRelativeTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const Linkify = ({ text }) => {
  if (!text) return null;

  // Check for code blocks (```code```)
  const codeBlockRegex = /```([\s\S]*?)```/g;
  if (codeBlockRegex.test(text)) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const code = part.slice(3, -3).trim();
            return (
              <code
                key={i}
                className="block my-1 px-2 py-1 bg-slate-800 dark:bg-black text-green-400 rounded text-xs font-mono overflow-x-auto"
              >
                {code}
              </code>
            );
          }
          return <Linkify key={i} text={part} />;
        })}
      </span>
    );
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const mentionRegex = /(@[\w.-]+)/g;

  // Split by both URLs and mentions
  const parts = text.split(/((https?:\/\/[^\s]+)|(@[\w.-]+))/g).filter(Boolean);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#AFD4FF] hover:text-white underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        if (part.match(mentionRegex)) {
          const handle = part.substring(1); // Remove @ symbol
          return (
            <a
              key={i}
              href={`https://bsky.app/profile/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#AFD4FF] hover:text-white font-medium hover:underline cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

/**
 * HELPER: API WRAPPER
 */
const apiCall = async (endpoint, session, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    skipProxy = false,
    useAppView = false
  } = options;

  let baseUrl;
  if (useAppView) {
    baseUrl = PUBLIC_APPVIEW;
  } else {
    baseUrl = (options.serviceUrl || session?.serviceUrl || DEFAULT_PDS).replace(/\/$/, '');
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

    throw new Error(errorMessage || `API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * COMPONENT: LOGIN (Compact with Dark Mode)
 */
const Login = ({ onLogin, loading, error }) => {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    browserAPI.storage.local.get(['bsky_credentials'], (result) => {
      if (result.bsky_credentials?.handle) {
        setHandle(result.bsky_credentials.handle);
      }
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(handle, password, DEFAULT_PDS);
  };

  return (
    <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-[#0F1419] p-4">
      <div className="w-full">
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-[280px]">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0085ff] to-[#0060ff]">
                Bluedrop
              </h1>
              <p className="text-slate-500 dark:text-[#8B98A5] text-xs mt-1">
                Bluesky Messenger
              </p>
              <a
                href="https://bsky.app/settings/app-passwords"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#228DFF] hover:underline block mt-2"
              >
                Generate App Password →
              </a>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#16202A] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-[#2D3A45]">
              {error && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#8B98A5] mb-1">
                    Handle
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="username.bsky.social"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1E2732] border border-slate-200 dark:border-[#2D3A45] rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#228DFF] placeholder:text-slate-400 dark:placeholder:text-[#5B6B7A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#8B98A5] mb-1">
                    App Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1E2732] border border-slate-200 dark:border-[#2D3A45] rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#228DFF] placeholder:text-slate-400 dark:placeholder:text-[#5B6B7A]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#228DFF] hover:bg-[#1A6FCC] text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </button>
            </form>

            <div className="text-center mt-6 flex flex-col gap-1">
              <a href="https://dr.eamer.dev/bluesky" target="_blank" rel="noreferrer" className="text-slate-400 dark:text-[#5B6B7A] hover:text-[#228DFF] text-xs hover:underline">
                About Bluedrop
              </a>
              <a href="https://dr.eamer.dev/skymarshal" target="_blank" rel="noreferrer" className="text-slate-400 dark:text-[#5B6B7A] hover:text-[#228DFF] text-xs hover:underline">
                More Tools
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * COMPONENT: AVATAR (Compact)
 */
const Avatar = ({ url, size = "sm", fallback }) => {
  const [error, setError] = useState(false);

  useEffect(() => { setError(false); }, [url]);

  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm"
  };

  if (url && !error) {
    return (
      <img
        src={url}
        alt={fallback || "Avatar"}
        className={`${sizeClasses[size]} rounded-full object-cover bg-slate-200 dark:bg-[#2D3A45] flex-shrink-0`}
        onError={() => setError(true)}
      />
    );
  }

  const initials = fallback ? fallback.substring(0, 2).toUpperCase() : '?';
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-[#228DFF] text-white flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
};

/**
 * COMPONENT: REACTION PICKER
 */
const ReactionPicker = ({ onSelect, onClose }) => {
  return (
    <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-[#16202A] border border-slate-200 dark:border-[#2D3A45] rounded-lg shadow-lg p-2 flex gap-1 z-30">
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="text-lg hover:bg-slate-100 dark:hover:bg-[#1E2732] rounded p-1 transition"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

/**
 * COMPONENT: MESSAGE ACTIONS MENU
 */
const MessageActionsMenu = ({ message, isMe, onReact, onDelete, onClose }) => {
  return (
    <div className="absolute top-full mt-1 right-0 bg-white dark:bg-[#16202A] border border-slate-200 dark:border-[#2D3A45] rounded-lg shadow-lg py-1 z-40 min-w-[120px]">
      <button
        onClick={() => {
          onReact();
          onClose();
        }}
        className="w-full px-3 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-[#1E2732] flex items-center gap-2 text-slate-700 dark:text-[#8B98A5]"
      >
        <Smile className="w-3 h-3" />
        React
      </button>
      {isMe && (
        <button
          onClick={() => {
            onDelete(message.id);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      )}
    </div>
  );
};

/**
 * COMPONENT: NEW CHAT MODAL (Compact with Dark Mode)
 */
const NewChatModal = ({ isOpen, onClose, session, onStartChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Typeahead search with debouncing
  const handleSearchTypeahead = useCallback(async (query) => {
    if (!query.trim() || !session) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await apiCall('app.bsky.actor.searchActorsTypeahead', session, {
        method: 'GET',
        body: { q: query, limit: 10 },
        useAppView: true
      });
      setSearchResults(res.actors || []);
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [session]);

  // Debounced search on input change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchTypeahead(searchQuery);
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearchTypeahead]);

  // Legacy manual search function (for Enter key)
  const handleSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    handleSearchTypeahead(searchQuery);
  };

  const handleSelectUser = async (actor) => {
    try {
      const res = await apiCall('chat.bsky.convo.getConvoForMembers', session, {
        method: 'GET',
        body: { members: [actor.did] }
      });

      if (res && res.convo) {
        onStartChat(res.convo.id);
        onClose();
      }
    } catch (e) {
      console.error('Start chat error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#16202A] rounded-lg w-full max-w-sm shadow-xl border border-slate-200 dark:border-[#2D3A45]">
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2D3A45]">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">New Chat</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-[#8B98A5] hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-[#2D3A45] rounded-lg bg-white dark:bg-[#0F1419] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#5B6B7A] focus:ring-2 focus:ring-[#228DFF] outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searching && (
              <div className="flex items-center justify-center mt-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#228DFF]" />
              </div>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#5B6B7A] text-xs py-4">Search for someone to chat with</p>
            ) : (
              searchResults.map(actor => (
                <button
                  key={actor.did}
                  onClick={() => handleSelectUser(actor)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-[#1E2732] rounded text-left"
                >
                  <Avatar url={actor.avatar} fallback={actor.handle} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">{actor.displayName || actor.handle}</p>
                    <p className="text-xs text-slate-500 dark:text-[#8B98A5] truncate">@{actor.handle}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * COMPONENT: CONVERSATION REQUESTS MODAL
 */
const ConvoRequestsModal = ({ isOpen, onClose, session, onAccept, onDecline }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && session) {
      loadRequests();
    }
  }, [isOpen, session]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await apiCall('chat.bsky.convo.listConvos', session, {
        method: 'GET'
      });
      // Filter for conversations that need acceptance (unread and no messages sent by you)
      const pendingRequests = (res.convos || []).filter(c =>
        c.unreadCount > 0 && !c.lastMessage?.sender?.did === session.did
      );
      setRequests(pendingRequests);
    } catch (e) {
      console.error('Load requests error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (convoId) => {
    try {
      await apiCall('chat.bsky.convo.acceptConvo', session, {
        method: 'POST',
        body: { convoId }
      });
      onAccept(convoId);
      loadRequests();
    } catch (e) {
      console.error('Accept error:', e);
    }
  };

  const handleDecline = async (convoId) => {
    try {
      await apiCall('chat.bsky.convo.leaveConvo', session, {
        method: 'POST',
        body: { convoId }
      });
      onDecline(convoId);
      loadRequests();
    } catch (e) {
      console.error('Decline error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#16202A] rounded-lg w-full max-w-sm shadow-xl border border-slate-200 dark:border-[#2D3A45]">
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2D3A45]">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Message Requests</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-[#8B98A5] hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-[#228DFF]" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-[#5B6B7A] text-xs py-4">No pending requests</p>
          ) : (
            requests.map(convo => {
              const other = convo.members?.find(m => m.did !== session.did) || {};
              return (
                <div key={convo.id} className="flex items-center gap-2 p-2 border-b border-slate-100 dark:border-[#2D3A45] last:border-0">
                  <Avatar url={other.avatar} fallback={other.handle} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                      {other.displayName || other.handle}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#8B98A5] truncate">
                      {convo.lastMessage?.text || 'New message request'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAccept(convo.id)}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                      title="Accept"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDecline(convo.id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      title="Decline"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MAIN APP CONTENT (V5 with all features)
 */
const AppContent = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [convos, setConvos] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState('list');

  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [profilePreviewDid, setProfilePreviewDid] = useState(null);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [convoSearchQuery, setConvoSearchQuery] = useState('');

  const [darkMode, toggleDarkMode] = useDarkMode();
  const [zenMode, setZenMode] = useState({
    hideReactions: false,
    hideProfileStats: false,
    hideRecentPosts: false,
  });

  useEffect(() => {
    browserAPI.storage.local.get(['zenMode'], (result) => {
      if (result.zenMode) {
        setZenMode(result.zenMode);
      }
    });
  }, []);

  const handleSetZenMode = (newSettings) => {
    setZenMode(newSettings);
    browserAPI.storage.local.set({ zenMode: newSettings });
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    browserAPI.storage.local.get(['bsky_session'], (result) => {
      if (result.bsky_session) {
        setSession(result.bsky_session);
        browserAPI.runtime.sendMessage({ type: 'SESSION_UPDATE', session: result.bsky_session });
      }
    });
  }, []);

  useEffect(() => {
    const listener = (message) => {
      if (message.type === 'CONVOS_UPDATE') {
        setConvos(message.convos);
      }
    };
    browserAPI.runtime.onMessage.addListener(listener);
    return () => browserAPI.runtime.onMessage.removeListener(listener);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K: Open new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (session && !isNewChatOpen && !isRequestsOpen && !isProfilePreviewOpen) {
          setIsNewChatOpen(true);
        }
      }

      // Ctrl/Cmd + /: Show shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsHelpOpen(true);
      }

      // Esc: Close modals or go back
      if (e.key === 'Escape') {
        if (isShortcutsHelpOpen) {
          setIsShortcutsHelpOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isProfilePreviewOpen) {
          setIsProfilePreviewOpen(false);
        } else if (isRequestsOpen) {
          setIsRequestsOpen(false);
        } else if (isNewChatOpen) {
          setIsNewChatOpen(false);
        } else if (view === 'chat') {
          setView('list');
          setActiveConvoId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, isNewChatOpen, isRequestsOpen, isProfilePreviewOpen, isShortcutsHelpOpen, view]);

  const fetchConvos = useCallback(async () => {
    if (!session) return;
    try {
      const response = await browserAPI.runtime.sendMessage({ type: 'FETCH_CONVOS' });
      if (response.success) {
        setConvos(response.convos);

        setProfiles(prev => {
          const updated = { ...prev };
          response.convos.forEach(c => {
            if (c.members && Array.isArray(c.members)) {
              c.members.forEach(m => {
                updated[m.did] = { ...(updated[m.did] || {}), ...m };
              });
            }
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("Fetch Convos Error:", e);
    }
  }, [session]);

  const fetchMessages = useCallback(async () => {
    if (!session || !activeConvoId) return;
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: 'FETCH_MESSAGES',
        convoId: activeConvoId
      });
      if (response.success) {
        setMessages(response.messages);
      }
    } catch (e) {
      console.error("Fetch Messages Error:", e);
    }
  }, [session, activeConvoId]);

  useEffect(() => {
    if (session) {
      fetchConvos();
      const interval = setInterval(fetchConvos, 5000);
      return () => clearInterval(interval);
    }
  }, [session, fetchConvos]);

  useEffect(() => {
    if (session && activeConvoId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [session, activeConvoId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getOtherMember = useCallback((convo) => {
    if (!session || !convo || !convo.members) return { did: 'unknown', handle: 'Unknown', displayName: 'Unknown' };
    const otherMemberObj = convo.members.find(m => m.did !== session.did) || convo.members[0];
    if (otherMemberObj) {
      return profiles[otherMemberObj.did] || otherMemberObj;
    }
    return { did: 'unknown', handle: 'Unknown' };
  }, [session, profiles]);

  const handleLogin = async (handle, password, service) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('com.atproto.server.createSession', null, {
        method: 'POST',
        body: { identifier: handle, password },
        skipProxy: true,
        serviceUrl: service
      });

      const newSession = {
        did: res.did,
        handle: res.handle,
        accessJwt: res.accessJwt,
        refreshJwt: res.refreshJwt,
        serviceUrl: service
      };

      setSession(newSession);
      browserAPI.storage.local.set({
        bsky_session: newSession,
        bsky_credentials: { handle, service }
      });
      browserAPI.runtime.sendMessage({ type: 'SESSION_UPDATE', session: newSession });
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setConvos([]);
    setActiveConvoId(null);
    setMessages([]);
    browserAPI.storage.local.remove(['bsky_session', 'bsky_credentials']);
    browserAPI.runtime.sendMessage({ type: 'SESSION_UPDATE', session: null });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sending || !activeConvoId) return;

    setSending(true);
    const tempMsg = {
      id: `temp-${Date.now()}`,
      text: messageInput,
      sender: { did: session.did },
      sentAt: new Date().toISOString(),
      sending: true
    };

    setMessages(prev => [...prev, tempMsg]);
    const textToSend = messageInput;
    setMessageInput('');

    try {
      const response = await browserAPI.runtime.sendMessage({
        type: 'SEND_MESSAGE',
        convoId: activeConvoId,
        text: textToSend
      });

      if (response.success) {
        setTimeout(() => fetchMessages(), 500);
      } else {
        throw new Error(response.error);
      }
    } catch (e) {
      console.error('Send error:', e);
      setMessages(prev => prev.map(m =>
        m.id === tempMsg.id ? { ...m, error: true, sending: false } : m
      ));
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await browserAPI.runtime.sendMessage({
        type: 'ADD_REACTION',
        convoId: activeConvoId,
        messageId,
        emoji
      });
      setTimeout(() => fetchMessages(), 500);
    } catch (e) {
      console.error('Reaction error:', e);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await browserAPI.runtime.sendMessage({
        type: 'DELETE_MESSAGE',
        convoId: activeConvoId,
        messageId
      });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleMuteConvo = async (convoId) => {
    try {
      await browserAPI.runtime.sendMessage({
        type: 'MUTE_CONVO',
        convoId
      });
      fetchConvos();
    } catch (e) {
      console.error('Mute error:', e);
    }
  };

  const handleUnmuteConvo = async (convoId) => {
    try {
      await browserAPI.runtime.sendMessage({
        type: 'UNMUTE_CONVO',
        convoId
      });
      fetchConvos();
    } catch (e) {
      console.error('Unmute error:', e);
    }
  };

  const startNewChat = (convoId) => {
    setActiveConvoId(convoId);
    setView('chat');
    fetchMessages();
  };

  if (!session) {
    return <Login onLogin={handleLogin} loading={loading} error={error} />;
  }

  const activeConvo = convos.find(c => c.id === activeConvoId);
  const otherMember = activeConvo ? getOtherMember(activeConvo) : null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0F1419] relative">
      {view === 'list' ? (
        <>
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2D3A45] bg-white dark:bg-[#0F1419]">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-900 dark:text-white">Messages</h1>
              <button
                onClick={() => browserAPI.tabs.create({ url: browserAPI.runtime.getURL('index.html') })}
                className="p-1 hover:bg-slate-100 dark:hover:bg-[#1E2732] text-slate-400 dark:text-[#8B98A5] rounded"
                title="Open in full page"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsRequestsOpen(true)}
                className="p-1.5 hover:bg-blue-50 dark:hover:bg-[#228DFF]/20 text-[#228DFF] rounded-full"
                title="Message Requests"
              >
                <Bell className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="p-1.5 hover:bg-blue-50 dark:hover:bg-[#228DFF]/20 text-[#228DFF] rounded-full"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1E2732] text-slate-500 dark:text-[#8B98A5] rounded-full"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Search */}
          {convos.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-200 dark:border-[#2D3A45]">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-[#2D3A45] rounded-lg bg-white dark:bg-[#0F1419] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#5B6B7A] focus:ring-2 focus:ring-[#228DFF] outline-none"
                value={convoSearchQuery}
                onChange={(e) => setConvoSearchQuery(e.target.value)}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 ? (
              <div className="p-4 text-center text-slate-400 dark:text-[#5B6B7A] text-xs">
                No conversations yet
              </div>
            ) : (
              convos
                .filter(convo => {
                  if (!convoSearchQuery.trim()) return true;
                  const other = getOtherMember(convo);
                  const searchLower = convoSearchQuery.toLowerCase();
                  return (
                    other.displayName?.toLowerCase().includes(searchLower) ||
                    other.handle?.toLowerCase().includes(searchLower) ||
                    convo.lastMessage?.text?.toLowerCase().includes(searchLower)
                  );
                })
                .map(convo => {
                  const other = getOtherMember(convo);
                  const isMuted = convo.muted;

                  return (
                    <div key={convo.id} className="relative group">
                      <button
                        onClick={() => {
                          setActiveConvoId(convo.id);
                          setView('chat');
                          browserAPI.runtime.sendMessage({ type: 'SET_ACTIVE_CONVO', convoId: convo.id });
                        }}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-slate-50 dark:hover:bg-[#1E2732] border-b border-slate-100 dark:border-[#2D3A45]"
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfilePreviewDid(other.did);
                            setIsProfilePreviewOpen(true);
                          }}
                          className="cursor-pointer hover:opacity-80 transition"
                          title="View profile"
                        >
                          <Avatar url={other.avatar} fallback={other.handle} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="font-semibold text-sm truncate text-slate-900 dark:text-white flex items-center gap-1">
                              {other.displayName || other.handle}
                              {isMuted && <BellOff className="w-3 h-3 text-slate-400 dark:text-[#5B6B7A]" />}
                            </span>
                            {convo.lastMessage && (
                              <span className="text-xs text-slate-400 dark:text-[#5B6B7A] ml-1">
                                {formatRelativeTime(convo.lastMessage.sentAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate pr-2 ${convo.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-[#8B98A5]'}`}>
                              {convo.lastMessage ? convo.lastMessage.text : 'No messages'}
                            </p>
                            {convo.unreadCount > 0 && (
                              <span className="w-2 h-2 bg-[#228DFF] rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => isMuted ? handleUnmuteConvo(convo.id) : handleMuteConvo(convo.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-[#2D3A45] rounded transition"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-[#2D3A45] bg-white dark:bg-[#0F1419]">
            <button
              onClick={() => setView('list')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1E2732] rounded-full text-slate-700 dark:text-[#8B98A5]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Avatar url={otherMember?.avatar} fallback={otherMember?.handle} size="sm" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate text-slate-900 dark:text-white">{otherMember?.displayName || otherMember?.handle}</h2>
              <p className="text-xs text-slate-500 dark:text-[#8B98A5] truncate">@{otherMember?.handle}</p>
            </div>
            <button
              onClick={() => activeConvo?.muted ? handleUnmuteConvo(activeConvoId) : handleMuteConvo(activeConvoId)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1E2732] rounded-full text-slate-500 dark:text-[#8B98A5]"
              title={activeConvo?.muted ? "Unmute" : "Mute"}
            >
              {activeConvo?.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50 dark:bg-[#0F1419]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-[#5B6B7A]">
                <MessageSquare className="w-8 h-8 mb-1" />
                <p className="text-xs">Start chatting!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender.did === session.did;

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div className="relative">
                      <div className={`
                        max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words
                        ${isMe
                          ? 'bg-[#228DFF] text-white rounded-tr-sm'
                          : 'bg-white dark:bg-[#16202A] text-slate-800 dark:text-white rounded-tl-sm'
                        }
                        ${msg.error ? 'border-red-500 border' : ''}
                        ${msg.sending ? 'opacity-70' : ''}
                      `}>
                        <Linkify text={msg.text} />
                        {!zenMode.hideReactions && msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {msg.reactions.map((r, i) => (
                              <span key={i} className="text-sm">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id)}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 bg-slate-200 dark:bg-[#2D3A45] rounded-full hover:bg-slate-300 dark:hover:bg-[#3D4A55] transition"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      {showMessageMenu === msg.id && (
                        <MessageActionsMenu
                          message={msg}
                          isMe={isMe}
                          onReact={() => setShowReactionPicker(msg.id)}
                          onDelete={handleDeleteMessage}
                          onClose={() => setShowMessageMenu(null)}
                        />
                      )}
                      {showReactionPicker === msg.id && (
                        <ReactionPicker
                          onSelect={(emoji) => handleReaction(msg.id, emoji)}
                          onClose={() => setShowReactionPicker(null)}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 bg-white dark:bg-[#0F1419] border-t border-slate-200 dark:border-[#2D3A45]">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Message..."
                className="flex-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-[#16202A] border-transparent focus:bg-white dark:focus:bg-[#1E2732] border border-slate-200 dark:border-[#2D3A45] focus:border-[#228DFF] rounded-full outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#5B6B7A]"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sending}
                className="p-2 bg-[#228DFF] text-white rounded-full hover:bg-[#1A6FCC] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        session={session}
        onStartChat={startNewChat}
      />

      <ConvoRequestsModal
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        session={session}
        onAccept={(convoId) => {
          setActiveConvoId(convoId);
          setView('chat');
          setIsRequestsOpen(false);
        }}
        onDecline={() => fetchConvos()}
      />

      <ProfilePreviewModal
        isOpen={isProfilePreviewOpen}
        onClose={() => setIsProfilePreviewOpen(false)}
        did={profilePreviewDid}
        session={session}
        Avatar={Avatar}
        zenMode={zenMode}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        zenMode={zenMode}
        setZenMode={handleSetZenMode}
        openShortcuts={() => setIsShortcutsHelpOpen(true)}
      />

      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
