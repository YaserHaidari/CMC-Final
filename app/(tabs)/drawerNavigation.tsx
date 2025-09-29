import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text } from "react-native";
import _layout from "@/app/_layout";
import home from "@/app/(tabs)/home";
import findmentors from "@/app/findmentors";
import WriteTestimonialScreen from '../writetestimonial';
import TestimonialsScreen from '../testimonials';
import settings from "@/app/settings";
import CyberMatchScreen from '../cybermatch';

const Drawer = createDrawerNavigator();

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer.Navigator
                screenOptions={{
                    headerShown: false,
                    drawerStyle: {
                        backgroundColor: "#f9fafb",
                        borderTopRightRadius: 24,
                        borderBottomRightRadius: 24,
                        width: 260,
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 4,
                    },
                    drawerActiveTintColor: "#2563eb",
                    drawerInactiveTintColor: "#222",
                    drawerActiveBackgroundColor: "#e0e7ff",
                    drawerLabelStyle: {
                        fontSize: 18,
                        fontWeight: "600",
                        marginLeft: -8,
                    },
                    drawerItemStyle: {
                        borderRadius: 12,
                        marginVertical: 4,
                    },
                }}
            >
                <Drawer.Screen name="Home Page" component={home} />
                <Drawer.Screen name="Cyber Match" component={CyberMatchScreen} />
                <Drawer.Screen name="Settings" component={settings} />
                <Drawer.Screen name="Write Testimonials" component={WriteTestimonialScreen} />
                <Drawer.Screen name="Testimonials" component={TestimonialsScreen} />
            </Drawer.Navigator>
        </GestureHandlerRootView>
    );
}