import React, { useEffect, useState } from 'react';
import { ChevronLeft, Moon, Sun, MessageSquare, Users, EyeOff, Keyboard, ExternalLink, Shield, Check } from 'lucide-react';

const SettingsModal = ({
    isOpen,
    onClose,
    darkMode,
    toggleDarkMode,
    zenMode,
    setZenMode,
    openShortcuts
}) => {
    // Animation state
    const [render, setRender] = useState(isOpen);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            setTimeout(() => setVisible(true), 10);
        } else {
            setVisible(false);
            setTimeout(() => setRender(false), 300);
        }
    }, [isOpen]);

    if (!render) return null;

    const toggleZenSetting = (key) => {
        const newSettings = { ...zenMode, [key]: !zenMode[key] };
        setZenMode(newSettings);
    };

    const Toggle = ({ active }) => (
        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${active ? 'bg-[#0085ff]' : 'bg-slate-200 dark:bg-slate-700'}`}>
            <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    );

    const SectionHeader = ({ title }) => (
        <div className="px-4 py-2 bg-slate-100/50 dark:bg-[#161e27] sticky top-0 backdrop-blur-md z-10 border-y border-slate-200/50 dark:border-slate-800/50">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {title}
            </h4>
        </div>
    );

    const ListItem = ({ icon: Icon, label, sublabel, action, onClick }) => (
        <div
            onClick={onClick}
            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#161e27] active:bg-slate-50 dark:active:bg-[#1c2732] cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
        >
            <div className="flex items-center gap-3.5">
                <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                <div>
                    <div className="text-[15px] font-medium text-slate-900 dark:text-white leading-tight">
                        {label}
                    </div>
                    {sublabel && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {sublabel}
                        </div>
                    )}
                </div>
            </div>
            {action}
        </div>
    );

    return (
        <div
            className={`fixed inset-0 z-50 bg-white dark:bg-[#161e27] transition-transform duration-300 ease-in-out transform ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#161e27]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="p-1 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-[#0085ff]" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
                </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100vh-56px)] overflow-y-auto pb-8">

                {/* Appearance */}
                <SectionHeader title="Appearance" />
                <ListItem
                    icon={darkMode ? Moon : Sun}
                    label="Dark Mode"
                    action={<Toggle active={darkMode} />}
                    onClick={toggleDarkMode}
                />

                {/* Zen Mode */}
                <SectionHeader title="Zen Mode (Web)" />
                <ListItem
                    icon={MessageSquare}
                    label="Hide Reply Counts"
                    action={<Toggle active={zenMode.hideReplies} />}
                    onClick={() => toggleZenSetting('hideReplies')}
                />
                <ListItem
                    icon={Users}
                    label="Hide Repost Counts"
                    action={<Toggle active={zenMode.hideReposts} />}
                    onClick={() => toggleZenSetting('hideReposts')}
                />
                <ListItem
                    icon={EyeOff}
                    label="Hide Like Counts"
                    action={<Toggle active={zenMode.hideLikes} />}
                    onClick={() => toggleZenSetting('hideLikes')}
                />
                <ListItem
                    icon={EyeOff}
                    label="Hide Quote Counts"
                    action={<Toggle active={zenMode.hideQuotes} />}
                    onClick={() => toggleZenSetting('hideQuotes')}
                />
                <ListItem
                    icon={Users}
                    label="Hide Profile Followers"
                    action={<Toggle active={zenMode.hideFollowers} />}
                    onClick={() => toggleZenSetting('hideFollowers')}
                />

                {/* Tools */}
                <SectionHeader title="Tools & Shortcuts" />
                <ListItem
                    icon={Keyboard}
                    label="Keyboard Shortcuts"
                    action={<div className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Cmd /</div>}
                    onClick={() => { onClose(); openShortcuts(); }}
                />
                <a href="https://dr.eamer.dev/skymarshal" target="_blank" rel="noreferrer" className="block">
                    <ListItem
                        icon={Shield}
                        label="SkyMarshal"
                        sublabel="Account tools"
                        action={<ExternalLink className="w-4 h-4 text-slate-300" />}
                    />
                </a>
                <a href="https://dr.eamer.dev/bluesky" target="_blank" rel="noreferrer" className="block">
                    <ListItem
                        icon={ExternalLink}
                        label="More Tools"
                        sublabel="dr.eamer.dev"
                        action={<ExternalLink className="w-4 h-4 text-slate-300" />}
                    />
                </a>
                <div className="px-4 py-6 text-center">
                    <a href="https://lukesteuber.com" target="_blank" rel="noreferrer" className="text-xs text-slate-400 dark:text-slate-600 hover:text-[#0085ff] transition-colors">
                        Created by Luke Steuber
                    </a>
                </div>
            </div>
        </div >
    );
};

export default SettingsModal;
