import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Toast.css';

const Toast = ({ message, show, onClose, duration = 3000, navigateState = {} }) => {
    const navigate = useNavigate();
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (show) {
            setIsExiting(false);
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(onClose, 500); // Wait for exit animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show && !isExiting) return null;

    return (
        <div
            className={`toast-container ${isExiting ? 'exit' : 'enter'}`}
            onClick={() => navigate('/cart', { state: navigateState })}
        >
            <div className="toast-content">
                <div className="toast-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div className="toast-body">
                    <p className="toast-message">{message}</p>
                    <span className="toast-link">Click to view cart →</span>
                </div>
            </div>
        </div>
    );
};

export default Toast;
