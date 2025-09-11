import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createDrawerNavigator } from '@react-navigation/drawer';
import _layout from "@/app/_layout";
import tabsNavigation from "@/app/(tabs)/tabsNavigation";
import home from "@/app/(tabs)/home";
import findmentors from "@/app/findmentors";
import settings from "@/app/settings";

const Drawer = createDrawerNavigator();

export default function RootLayout() {
    return (
        <GestureHandlerRootView>
            <Drawer.Navigator screenOptions={{ headerShown: false }}>
                {/* Tabs inside drawer */}
                <Drawer.Screen name="Home Page" component={home} />
                <Drawer.Screen name="Find Mentors" component={findmentors} />
                <Drawer.Screen name="Settings" component={settings} />
            </Drawer.Navigator>
        </GestureHandlerRootView>
    );
}