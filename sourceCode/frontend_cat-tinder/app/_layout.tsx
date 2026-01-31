import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { globalEvents } from "@/utils/eventEmitter";
import "@/global.css";
import { Alert } from "react-native";
import type { Message } from "@/types";

export default function RootLayout() {
  const handleMessageReceived = (message: Message, matchId: string) => {
    console.log('🔔 Global message received handler:', { message, matchId });
    globalEvents.emit('message:received', message, matchId);
  };

  const handleNewMatch = (matchData: any) => {
    console.log('💕 Global new match handler:', matchData);
    globalEvents.emit('match:new', matchData);
    Alert.alert(
      '💕 New Match!',
      'คุณได้ match ใหม่แล้ว!',
      [{ text: 'ดู Match', style: 'default' }]
    );
  };

  const handleTypingUpdate = (userId: string, matchId: string, isTyping: boolean) => {
    console.log('⌨️ Global typing update:', { userId, matchId, isTyping });
    globalEvents.emit('typing:update', userId, matchId, isTyping);
  };


  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider
          onMessageReceived={handleMessageReceived}
          onNewMatch={handleNewMatch}
          onTypingUpdate={handleTypingUpdate}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}