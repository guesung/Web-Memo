import { useAuth } from "@/lib/auth/AuthProvider";
import { LogIn, LogOut, User } from "lucide-react-native";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const isLoggedIn = !!session;

  const handleSignOut = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: signOut },
    ]);
  };

  const handleLogin = () => {
    router.navigate("/(auth)/login");
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      <View style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <View style={styles.card}>
            {isLoggedIn ? (
              <>
                <View style={styles.accountRow}>
                  <View style={styles.avatar}>
                    <User size={20} color="#fff" />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.email}>{session.user.email}</Text>
                    <Text style={styles.accountLabel}>로그인됨</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                  <LogOut size={16} color="#ef4444" />
                  <Text style={styles.logoutText}>로그아웃</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <LogIn size={18} color="#fff" />
                <Text style={styles.loginText}>로그인</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>버전</Text>
              <Text style={styles.infoValue}>{appVersion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>앱 이름</Text>
              <Text style={styles.infoValue}>Web Memo</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: { flex: 1 },
  email: { fontSize: 15, fontWeight: "600", color: "#111" },
  accountLabel: { fontSize: 13, color: "#999", marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fee2e2",
    backgroundColor: "#fef2f2",
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  loginText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 15, color: "#555" },
  infoValue: { fontSize: 15, color: "#111", fontWeight: "500" },
});
