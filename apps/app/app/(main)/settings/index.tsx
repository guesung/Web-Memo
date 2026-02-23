import { useAuth } from "@/lib/auth/AuthProvider";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ChevronRight, LogIn, LogOut, MessageCircle, User } from "lucide-react-native";
import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut, isLoggedIn} = useAuth();

  const handleSignOut = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: signOut },
    ]);
  };

  const handleLogin = () => {
    router.navigate("/(auth)/login");
  };

  const appVersion = Constants.expoConfig?.version;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-4">
        <Text className="text-[22px] font-extrabold text-foreground tracking-tight">설정</Text>
      </View>

      <View className="flex-1 px-5">
        {/* Account Section */}
        <View className="mb-7">
          <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">계정</Text>
          <View className="bg-card rounded-[14px] p-4 border border-muted">
            {isLoggedIn && session ? (
              <>
                <View className="flex-row items-center gap-3 mb-4">
                  <View className="w-10 h-10 rounded-full bg-foreground justify-center items-center">
                    <User size={20} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-foreground">{session.user.email}</Text>
                    <Text className="text-[13px] text-muted-foreground mt-0.5">로그인됨</Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2 py-2.5 rounded-[10px] border border-red-100 bg-red-50"
                  onPress={handleSignOut}
                >
                  <LogOut size={16} color="#ef4444" />
                  <Text className="text-sm font-semibold text-destructive">로그아웃</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 py-3 rounded-[10px] bg-foreground"
                onPress={handleLogin}
              >
                <LogIn size={18} color="#fff" />
                <Text className="text-[15px] font-semibold text-white">로그인</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* App Info Section */}
        <View className="mb-7">
          <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">앱 정보</Text>
          <View className="bg-card rounded-[14px] p-4 border border-muted">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-[15px] text-secondary-foreground">앱 이름</Text>
              <Text className="text-[15px] text-foreground font-medium">웹 메모</Text>
            </View>
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-[15px] text-secondary-foreground">버전</Text>
              <Text className="text-[15px] text-foreground font-medium">{appVersion}</Text>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View className="mb-7">
          <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">지원</Text>
          <View className="bg-card rounded-[14px] p-4 border border-muted">
            <TouchableOpacity
              className="flex-row justify-between items-center py-2"
              onPress={() => Linking.openURL("https://open.kakao.com/o/sido56Pg")}
              activeOpacity={0.6}
            >
              <View className="flex-row items-center gap-2">
                <MessageCircle size={16} color="#555" />
                <Text className="text-[15px] text-secondary-foreground">문의하기</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <ChevronRight size={14} color="#999" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
