import React, { useState, useEffect } from 'react';
import { Bell, Info, MapPin, X } from 'lucide-react';

const NotificationTray = ({ notifications = [], onClear }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!isVisible || notifications.length === 0) return null;

  const current = notifications[notifications.length - 1];

  return (
    <div className="notification-tray-wrapper">
      <style>{`
        .notification-tray-wrapper {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10001;
          width: 90%;
          max-width: 450px;
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideDown {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .notification-item {
          background: white;
          border-left: 6px solid #3b82f6;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          display: flex;
          gap: 16px;
          position: relative;
          border: 1px solid #e2e8f0;
        }
        .notif-icon-box {
          background: #eff6ff;
          color: #3b82f6;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notif-content {
          flex: 1;
        }
        .notif-title {
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          font-size: 0.95rem;
        }
        .notif-msg {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }
        .notif-close {
          position: absolute;
          top: 12px;
          right: 12px;
          color: #94a3b8;
          cursor: pointer;
          border: none;
          background: none;
        }
      `}</style>
      
      <div className="notification-item">
        <button className="notif-close" onClick={() => setIsVisible(false)}>
          <X size={18} />
        </button>
        <div className="notif-icon-box">
          {current.type === 'proximity' ? <MapPin size={24} /> : <Bell size={24} />}
        </div>
        <div className="notif-content">
          <h4 className="notif-title">{current.title || 'Proximity Alert'}</h4>
          <p className="notif-msg">{current.message}</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationTray;
