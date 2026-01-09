import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Tooltip, Box } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notification.store';
import { keyframes } from '@emotion/react';

// Ringing animation
const ring = keyframes`
  0% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(-10deg);
  }
  20% {
    transform: rotate(10deg);
  }
  30% {
    transform: rotate(-10deg);
  }
  40% {
    transform: rotate(10deg);
  }
  50% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(0deg);
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
`;

interface NotificationBellProps {
  userId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { 
    unreadCount, 
    isRinging, 
    checkUnreadMessages,
    initializeNotifications,
    stopRinging,
  } = useNotificationStore();
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioInterval, setAudioInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize notifications
    initializeNotifications(userId);
    
    // Set up real-time checking
    const checkInterval = setInterval(() => {
      checkUnreadMessages(userId);
    }, 3000); // Check every 3 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [userId, initializeNotifications, checkUnreadMessages]);

  // Play ringing sound when isRinging is true
  useEffect(() => {
    if (isRinging && unreadCount > 0) {
      // Create audio context for beep sound
      let context: AudioContext | null = null;
      let interval: NodeJS.Timeout | null = null;
      
      try {
        context = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(context);

        // Play beep sound repeatedly
        const playBeep = () => {
          if (!context) return;
          
          try {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.frequency.value = 800; // Higher pitch for notification
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.2);
          } catch (err) {
            console.warn('Error playing notification sound:', err);
          }
        };

        // Play beep every 2 seconds
        playBeep();
        interval = setInterval(playBeep, 2000);
        setAudioInterval(interval);
      } catch (err) {
        console.warn('Error creating audio context:', err);
      }
    } else {
      // Stop ringing
      if (audioInterval) {
        clearInterval(audioInterval);
        setAudioInterval(null);
      }
      if (audioContext) {
        try {
          audioContext.close();
        } catch (err) {
          console.warn('Error closing audio context:', err);
        }
        setAudioContext(null);
      }
    }

    return () => {
      if (audioInterval) {
        clearInterval(audioInterval);
        setAudioInterval(null);
      }
      if (audioContext) {
        try {
          audioContext.close();
        } catch (err) {
          console.warn('Error closing audio context in cleanup:', err);
        }
        setAudioContext(null);
      }
    };
  }, [isRinging, unreadCount]);

  const handleClick = () => {
    stopRinging();
    navigate('/messages');
  };

  return (
    <Tooltip title={unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'No new messages'}>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
        }}
      >
        <IconButton
          onClick={handleClick}
          sx={{
            color: 'text.primary',
            position: 'relative',
            animation: isRinging && unreadCount > 0 ? `${ring} 0.5s ease-in-out infinite` : 'none',
            '&::before': isRinging && unreadCount > 0 ? {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              animation: `${pulse} 2s ease-in-out infinite`,
            } : {},
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                animation: isRinging && unreadCount > 0 ? `${pulse} 2s ease-in-out infinite` : 'none',
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Box>
    </Tooltip>
  );
};

export default NotificationBell;

