import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Users, Calendar, Loader2 } from 'lucide-react';

/**
 * COMPONENT: PROFILE PREVIEW MODAL
 */
const ProfilePreviewModal = ({ isOpen, onClose, did, session, Avatar, zenMode }) => {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && did && session) {
      loadProfile();
    }
  }, [isOpen, did, session]);

  const apiCall = async (endpoint, session, options = {}) => {
    const {
      method = 'GET',
      body,
      headers = {},
      useAppView = false
    } = options;

    const baseUrl = useAppView ? 'https://public.api.bsky.app' : (session?.serviceUrl || 'https://bsky.social');
    const urlPath = `/xrpc/${endpoint}`;
    let finalUrl = `${baseUrl}${urlPath}`;

    const authHeader = useAppView ? {} : { 'Authorization': `Bearer ${session?.accessJwt}` };

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
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
      throw new Error(errorData.message || errorData.error || 'API Error');
    }

    return response.json();
  };

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      // Get profile
      const profileRes = await apiCall('app.bsky.actor.getProfile', session, {
        method: 'GET',
        body: { actor: did },
        useAppView: true
      });
      setProfile(profileRes);

      // Get recent posts
      const feedRes = await apiCall('app.bsky.feed.getAuthorFeed', session, {
        method: 'GET',
        body: { actor: did, limit: 5 },
        useAppView: true
      });
      setPosts(feedRes.feed || []);
    } catch (e) {
      console.error('Load profile error:', e);
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#16202A] rounded-lg w-full max-w-sm shadow-xl border border-slate-200 dark:border-[#2D3A45] max-h-[500px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2D3A45]">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Profile</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-[#8B98A5] hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#228DFF]" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 dark:text-red-400 text-xs">
              {error}
            </div>
          ) : profile ? (
            <div className="p-4">
              {/* Profile Header */}
              <div className="flex items-start gap-3 mb-3">
                <Avatar url={profile.avatar} fallback={profile.handle} size="md" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                    {profile.displayName || profile.handle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#8B98A5] truncate">
                    @{profile.handle}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {profile.description && (
                <p className="text-xs text-slate-700 dark:text-[#8B98A5] mb-3 line-clamp-3">
                  {profile.description}
                </p>
              )}

              {/* Stats - Conditional Rendering */}
              {!zenMode?.hideProfileStats && (
                <div className="flex gap-4 mb-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-600 dark:text-[#8B98A5]">
                    <Users className="w-3 h-3" />
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCount(profile.followersCount || 0)}</span>
                    <span>followers</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 dark:text-[#8B98A5]">
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCount(profile.followsCount || 0)}</span>
                    <span>following</span>
                  </div>
                </div>
              )}

              {/* Joined Date */}
              {profile.createdAt && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-[#5B6B7A] mb-3">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {formatDate(profile.createdAt)}</span>
                </div>
              )}

              {/* Recent Posts - Conditional Rendering */}
              {!zenMode?.hideRecentPosts && posts.length > 0 && (
                <div className="border-t border-slate-200 dark:border-[#2D3A45] pt-3">
                  <h5 className="text-xs font-semibold text-slate-700 dark:text-[#8B98A5] mb-2">Recent Posts</h5>
                  <div className="space-y-2">
                    {posts.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-600 dark:text-[#8B98A5] line-clamp-2 p-2 bg-slate-50 dark:bg-[#0F1419] rounded">
                        {item.post.record.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View Full Profile Button */}
              <a
                href={`https://bsky.app/profile/${profile.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#228DFF] text-white text-xs font-semibold rounded-lg hover:bg-[#1A6FCC] transition"
              >
                View Full Profile
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfilePreviewModal;
