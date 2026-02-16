import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { LogOut, User } from "lucide-react-native";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function SettingsScreen() {
  const { session, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <User size={32} color="#666" />
        </View>
        <Text style={styles.email}>{session?.user?.email ?? "User"}</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color="#ff3b30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  profile: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  email: {
    fontSize: 16,
    color: "#333",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  signOutText: {
    fontSize: 16,
    color: "#ff3b30",
  },
});
