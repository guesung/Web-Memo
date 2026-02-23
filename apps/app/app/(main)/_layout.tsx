import { CustomTabBar } from "./_components/CustomTabBar";
import { BrowserScrollProvider } from "@/lib/context/BrowserScrollContext";
import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <BrowserScrollProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="browser" />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="settings" />
      </Tabs>
    </BrowserScrollProvider>
  );
}
