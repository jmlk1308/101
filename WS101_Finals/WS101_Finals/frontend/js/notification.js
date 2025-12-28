// notification.js - To be included in all role dashboards

const NOTIFICATION_API = "http://localhost:8080/api/admin/notifications";

class NotificationManager {
    constructor() {
        this.userId = this.getUserId();
        this.pollingInterval = null;
        this.notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/219/219-preview.mp3');
    }

    getUserId() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.id || null;
    }

    async fetchNotifications() {
        if (!this.userId) return [];

        try {
            const response = await fetch(`${NOTIFICATION_API}/user/${this.userId}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
        return [];
    }

    async getUnreadCount() {
        if (!this.userId) return 0;

        try {
            const response = await fetch(`${NOTIFICATION_API}/user/${this.userId}/unread/count`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
        return 0;
    }

    async markAllAsRead() {
        if (!this.userId) return;

        try {
            await fetch(`${NOTIFICATION_API}/user/${this.userId}/mark-read`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    createNotificationUI() {
        // Create notification bell in navbar
        const navbar = document.querySelector('nav .nav-content') || document.querySelector('.main-content .brand-title').parentElement;

        if (!navbar) return;

        const notificationWrapper = document.createElement('div');
        notificationWrapper.className = 'notification-wrapper';
        notificationWrapper.innerHTML = `
            <div class="notification-bell" onclick="notificationManager.toggleDropdown()">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="notificationBadge">0</span>
            </div>
            <div class="notification-dropdown" id="notificationDropdown">
                <div class="notification-header">
                    <span>Notifications</span>
                    <button onclick="notificationManager.markAllAsRead()">Mark all as read</button>
                </div>
                <div class="notification-list" id="notificationList">
                    <div class="notification-empty">No notifications</div>
                </div>
            </div>
        `;

        // Insert into navbar (adjust based on your layout)
        if (navbar.querySelector('.flex.items-center')) {
            navbar.querySelector('.flex.items-center').prepend(notificationWrapper);
        } else {
            navbar.appendChild(notificationWrapper);
        }

        // Add styles
        this.addStyles();
    }

    async toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        dropdown.classList.toggle('show');

        if (dropdown.classList.contains('show')) {
            await this.loadNotifications();
        }
    }

    async loadNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        const notifications = await this.fetchNotifications();

        if (notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No notifications</div>';
            return;
        }

        list.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.isRead ? '' : 'unread'}" data-id="${notif.id}" onclick="notificationManager.handleNotificationClick('${notif.type}', '${notif.relatedId || ''}')">
                <div class="notification-icon">
                    ${this.getIconForType(notif.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${notif.createdAt}</div>
                </div>
            </div>
        `).join('');
    }

    getIconForType(type) {
        const icons = {
            'course': '<i class="fas fa-book"></i>',
            'subject': '<i class="fas fa-book-open"></i>',
            'material': '<i class="fas fa-file-alt"></i>',
            'system': '<i class="fas fa-info-circle"></i>',
            'quiz': '<i class="fas fa-question-circle"></i>'
        };
        return icons[type] || '<i class="fas fa-bell"></i>';
    }

    handleNotificationClick(type, relatedId) {
        // Handle navigation based on notification type
        switch(type) {
            case 'course':
                window.location.href = `dashboard.html?course=${relatedId}`;
                break;
            case 'subject':
                window.location.href = `Roadmap.html?id=${relatedId}`;
                break;
            case 'material':
                // Navigate to material view
                break;
        }
    }

    async startPolling(interval = 30000) { // 30 seconds
        this.pollingInterval = setInterval(async () => {
            const oldCount = parseInt(document.getElementById('notificationBadge').innerText);
            const newCount = await this.getUnreadCount();

            if (newCount > oldCount) {
                document.getElementById('notificationBadge').innerText = newCount;
                this.notificationSound.play();
                this.showToast('You have new notifications!');
            }
        }, interval);
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <i class="fas fa-bell"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 5000);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-wrapper {
                position: relative;
                margin-right: 15px;
            }

            .notification-bell {
                position: relative;
                cursor: pointer;
                font-size: 1.2rem;
                color: white;
                padding: 8px;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .notification-bell:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                font-size: 0.65rem;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
                border: 2px solid #2563eb;
            }

            .notification-dropdown {
                display: none;
                position: absolute;
                top: 120%;
                right: 0;
                width: 350px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                z-index: 1000;
                border: 1px solid #e5e7eb;
            }

            .notification-dropdown.show {
                display: block;
                animation: fadeIn 0.2s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .notification-header button {
                background: none;
                border: none;
                color: #2563eb;
                cursor: pointer;
                font-size: 0.8rem;
            }

            .notification-list {
                max-height: 400px;
                overflow-y: auto;
            }

            .notification-item {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                gap: 10px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .notification-item:hover {
                background: #f8fafc;
            }

            .notification-item.unread {
                background: #eff6ff;
            }

            .notification-icon {
                color: #2563eb;
                font-size: 1rem;
                padding-top: 2px;
            }

            .notification-content {
                flex: 1;
            }

            .notification-title {
                font-weight: 600;
                font-size: 0.85rem;
                margin-bottom: 4px;
            }

            .notification-message {
                font-size: 0.8rem;
                color: #4b5563;
                margin-bottom: 4px;
                line-height: 1.3;
            }

            .notification-time {
                font-size: 0.7rem;
                color: #9ca3af;
                text-align: right;
            }

            .notification-empty {
                padding: 20px;
                text-align: center;
                color: #9ca3af;
                font-size: 0.9rem;
            }

            .notification-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2563eb;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            .notification-toast button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    initialize() {
        if (this.userId) {
            this.createNotificationUI();
            this.updateBadge();
            this.startPolling();

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('notificationDropdown');
                const bell = document.querySelector('.notification-bell');
                if (dropdown && bell && !dropdown.contains(e.target) && !bell.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
    }

    async updateBadge() {
        const count = await this.getUnreadCount();
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.innerText = count;
        }
    }
}

// Global instance
const notificationManager = new NotificationManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    notificationManager.initialize();
});