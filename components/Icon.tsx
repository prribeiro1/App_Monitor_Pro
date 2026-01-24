import React from 'react';

export type IconName = 'bus' | 'map-pin' | 'users' | 'user' | 'clipboard' | 'alert-triangle' | 'bar-chart' | 'plus' | 'trash' | 'edit' | 'edit-3' | 'check' | 'x' | 'log-out' | 'menu' | 'google' | 'save' | 'cloud-upload' | 'road' | 'pencil' | 'face' | 'phone' | 'download' | 'map' | 'chevron-up' | 'chevron-down' | 'dollar-sign' | 'lock' | 'message-circle' | 'settings' | 'tool' | 'check-circle' | 'file-text' | 'arrow-left' | 'smartphone' | 'share-2' | 'info' | 'refresh-cw' | 'book' | 'file-minus' | 'shield-off' | 'home' | 'search' | 'bell' | 'upload-cloud' | 'download-cloud' | 'alert-circle' | 'cloud' | 'chevron-right' | 'loader' | 'wifi-off' | 'cloud-off' | 'zap' | 'arrow-right';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const icons: Record<IconName, React.ReactNode> = {
  bus: <path d="M19 17h2l.64-2.54a6 6 0 0 0-1.8-6.22l-1.6-1.33A12.04 12.04 0 0 0 12 5c-2.5 0-4.8 1.14-6.24 2.9L4.16 9.24a6 6 0 0 0-1.8 6.22L3 17h2m14 0v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2m-8 0v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2m16-12h-2M7 5H5m7 6v-2" />,
  'map-pin': <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  users: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />,
  clipboard: <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z M12 11h4 M12 16h4" />,
  'alert-triangle': <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01" />,
  'bar-chart': <path d="M12 20V10 M18 20V4 M6 20v-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  edit: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
  check: <path d="M20 6L9 17l-5-5" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  'log-out': <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />,
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  google: <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.333 21.934 10.666 21.81 10H12V14H17.83C17.5 16.11 15.73 17.72 12.55 17.72C9.37 17.72 6.6 15.52 5.63 12.5C5.63 12.5 5.63 12.5 5.63 12.5C4.66 9.48 6.96 6.28 10.13 6.28C11.7 6.28 13.1 6.84 14.2 7.8L17.08 4.92C15.3 3.24 12.87 2.28 10.13 2.28C4.6 2.28 0.13 6.75 0.13 12.28C0.13 12.28 0.13 12.28 0.13 12.28C0.13 17.81 4.6 22.28 10.13 22.28H12Z" />,
  save: <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8" />,
  'cloud-upload': <path d="M16 16l-4-4-4 4 M12 12v9 M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />,
  road: (<><path d="M4 15c0-3.3 2.7-6 6-6s6-2.7 6-6" transform="rotate(90, 12, 12)" /><path d="M15 15l3 3l-3 3" /></>),
  pencil: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  face: <circle cx="12" cy="12" r="10"></circle>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />,
  map: <path d="M1 6v14l6-2 6 2 6-2v-14l-6 2-6-2-6 2z M7 4v14 M17 4v14" />,
  'chevron-up': <path d="M18 15l-6-6-6 6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'dollar-sign': <path d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  lock: <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-7 0V7a5 5 0 0 1 10 0v4" />,
  'message-circle': <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  settings: <path d="M12.22 2h-.44a2 2 0 0 1-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73v.18a2 2 0 0 1 2 2h.44a2 2 0 0 1 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 1-2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  'check-circle': <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />,
  'file-text': <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
  'arrow-left': <path d="M19 12H5 M12 19l-7-7 7-7" />,
  'edit-3': <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
  smartphone: <><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><path d="M12 18h.01" /></>,
  'share-2': <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4 M12 8h.01" /></>,
  'refresh-cw': <path d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  'file-minus': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></>,
  'shield-off': <><path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18" /><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38" /><line x1="1" y1="1" x2="23" y2="23" /></>,
  home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
  bell: <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />,
  'upload-cloud': <path d="M16 16l-4-4-4 4 M12 12v9 M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />,
  'download-cloud': <path d="M8 17l4 4 4-4 M12 12v9 M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />,
  'alert-circle': <><circle cx="12" cy="12" r="10" /><path d="M12 8v4 M12 16h.01" /></>,
  cloud: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  'wifi-off': <><path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><path d="M12 20h.01" /></>,
  'cloud-off': <><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" /><path d="M1 1l22 22" /></>,
  zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" />
};

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', strokeWidth = 2 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name]}
    </svg>
  );
};