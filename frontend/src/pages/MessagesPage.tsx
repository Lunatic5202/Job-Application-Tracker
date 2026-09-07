import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageComposer } from '../components/chat/MessageComposer';
import { messageApi } from '../api/messageApi';
import { useAuth } from '../context/AuthContext';
import {
  ChatConversation,
  ChatMessage,
  ChatAttachment,
  chatWebSocket,
  WsConnectionStatus,
} from '../api/chatWebSocket';
import {
  MessageSquare,
  Sparkles,
  Wifi,
} from 'lucide-react';
import {
  emitUnreadStateChange,
  MESSAGES_STORAGE_KEY,
} from '../hooks/useUnreadCounts';

export const MessagesPage: React.FC = () => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CLOSED');

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  // Load conversations on mount
  useEffect(() => {
    let isMounted = true;
    const fetchConversations = async () => {
      try {
        const data = await messageApi.getConversations();
        if (isMounted) {
          setConversations(data);
          if (data.length > 0 && !activeConversationId) {
            setActiveConversationId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations from server:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchConversations();
    return () => { isMounted = false; };
  }, []);

  // Handle deep-link to specific conversation or peer from other modules
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const requestedConvId =
      (location.state as any)?.conversationId ||
      queryParams.get('conversationId') ||
      queryParams.get('convId');
    const requestedUserId =
      (location.state as any)?.targetUserId ||
      queryParams.get('userId') ||
      queryParams.get('user');

    if (requestedConvId) {
      const exists = conversations.some((c) => c.id === requestedConvId);
      if (exists) {
        setActiveConversationId(requestedConvId);
        return;
      }
    }

    if (requestedUserId) {
      const matchedConv = conversations.find(
        (c) => c.peer.id === requestedUserId || c.peer.name.toLowerCase().includes(requestedUserId.toLowerCase())
      );
      if (matchedConv) {
        setActiveConversationId(matchedConv.id);
      }
    }
  }, [location, conversations]);

  // Sync to localStorage
  const syncConversations = (updated: ChatConversation[]) => {
    setConversations(updated);
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updated));
    emitUnreadStateChange();
  };

  // WebSocket Connection Hookup with JWT token
  useEffect(() => {
    if (token) {
      chatWebSocket.connect(token);
    }

    const unsubStatus = chatWebSocket.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubMessage = chatWebSocket.onMessage((envelope) => {
      if (envelope.type === 'message') {
        const incomingMsg: ChatMessage = envelope.payload;
        setConversations((prev) => {
          const updated = prev.map((conversation) => {
            if (conversation.id !== incomingMsg.conversationId) return conversation;
            return {
              ...conversation,
              messages: [...conversation.messages, incomingMsg],
              lastMessage: incomingMsg.content,
              lastMessageTime: incomingMsg.timestamp,
              unreadCount:
                conversation.id === activeConversationId
                  ? 0
                  : (conversation.unreadCount || 0) + 1,
            };
          });
          localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updated));
          emitUnreadStateChange();
          return updated;
        });
      } else if (envelope.type === 'typing') {
        if (envelope.payload?.conversationId === activeConversationId) {
          setIsPeerTyping(Boolean(envelope.payload?.isTyping));
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, [token, activeConversationId]);

  // Active Conversation
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // Fetch full message history if missing
  useEffect(() => {
    if (!activeConversationId) return;
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (conv && conv.messages.length === 0) {
      messageApi.getMessages(activeConversationId).then((msgs) => {
        if (msgs && msgs.length > 0) {
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversationId ? { ...c, messages: msgs } : c))
          );
        }
      }).catch(console.error);
    }
  }, [activeConversationId]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isPeerTyping]);

  // Handle Select Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    messageApi.markAsRead(id).catch(console.error);
    const updated = conversations.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          unreadCount: 0,
          messages: c.messages.map((m) => ({ ...m, status: 'read' as const })),
        };
      }
      return c;
    });
    syncConversations(updated);
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, attachment?: ChatAttachment) => {
    if (!activeConversation) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: user?.id || 'usr_me',
      senderName: user?.name || 'Me',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true,
      status: 'sending',
      attachment,
    };

    // Forward to WebSocket if connected
    chatWebSocket.send({
      type: 'message',
      payload: {
        conversationId: activeConversation.id,
        content: text,
        attachment,
      },
    });

    const updated = conversations.map((c) => {
      if (c.id === activeConversation.id) {
        return {
          ...c,
          lastMessage: text || (attachment ? `Sent attachment: ${attachment.name}` : ''),
          lastMessageTime: newMsg.timestamp,
          messages: [...c.messages, newMsg],
        };
      }
      return c;
    });

    syncConversations(updated);

    try {
      const dispatched = await messageApi.sendMessage(
        activeConversation.id,
        text,
        attachment ? { name: attachment.name, size: attachment.size } : undefined
      );
      if (dispatched) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' } : m)),
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to dispatch message to server:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Candidate & Recruiter Messenger"
        description="Direct real-time communications with technical recruiters, hiring managers, and engineering peers."
        badge={
          <Badge
            variant={wsStatus === 'OPEN' ? 'success' : 'brand'}
            size="sm"
            className="flex items-center gap-1 font-mono text-[10px]"
          >
            {wsStatus === 'OPEN' ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>FastAPI WS Connected</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Realtime Sandbox Ready</span>
              </>
            )}
          </Badge>
        }
      />

      {/* ========================================================================= */}
      {/* DESKTOP TWO-PANEL CHAT CONTAINER (Optimized for 1366px Laptop Screens)    */}
      {/* ========================================================================= */}
      <div className="h-[calc(100vh-175px)] min-h-[440px] max-h-[720px] rounded-2xl bg-white border border-[#D9D9D9] shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* ==================== LEFT PANEL: CONVERSATIONS LIST (280px-320px) ==================== */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 h-full">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* ==================== RIGHT PANEL: ACTIVE CHAT VIEW ==================== */}
        <div className="flex-1 flex flex-col h-full bg-[#F3F2EF] min-w-0 border-t md:border-t-0 md:border-l border-[#D9D9D9]">
          {activeConversation ? (
            <>
              {/* 1. Header: User Information */}
              <ChatHeader conversation={activeConversation} />

              {/* 2. Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F3F2EF]">
                {/* Conversation Start Notice */}
                <div className="text-center py-2">
                  <span className="px-3 py-1 rounded-full bg-white border border-[#D9D9D9] text-[10px] font-mono text-[#788896] shadow-xs">
                    Encrypted channel • Direct hiring communications
                  </span>
                </div>

                {/* Messages List */}
                {activeConversation.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* Peer Typing Indicator */}
                {isPeerTyping && (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-[#D9D9D9] text-xs text-[#56687A] w-fit shadow-xs animate-in fade-in duration-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] font-mono ml-1 text-[#788896]">
                      {activeConversation.peer.name} is typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 3. Bottom: Message Composer */}
              <MessageComposer onSendMessage={handleSendMessage} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#788896] space-y-2">
              <MessageSquare className="w-8 h-8 text-[#788896]" />
              <p className="text-sm font-semibold text-[#1D2226]">No conversation selected</p>
              <p className="text-xs text-[#56687A]">Choose a recruiter or peer from the left panel to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
