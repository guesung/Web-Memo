import { BrowserScrollProvider } from "@/lib/context/BrowserScrollContext";
import { Tabs } from "expo-router";
import { CustomTabBar } from "./_components/CustomTabBar";

export default function MainLayout() {
  return (
    <BrowserScrollProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="browser/index" />
        <Tabs.Screen name="settings/index" />
      </Tabs>
    </BrowserScrollProvider>
  );
}
