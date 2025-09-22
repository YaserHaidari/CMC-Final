import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import Feather from '@expo/vector-icons/Feather';

export default function DrawerLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
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
                    overlayColor: "rgba(211, 211, 211, 0.35)",
                    drawerActiveTintColor: "#f07e74",
                    drawerInactiveTintColor: "#222",
                    drawerActiveBackgroundColor: "#fbeaea",
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
                <Drawer.Screen 
                    name="(tabs)" 
                    options={{
                        drawerLabel: "Home Page",
                        title: "Home",
                        drawerIcon: ({ color, size }) => (
                            <Feather name="home" size={size} color={color} />
                        ),
                    }}
                />
                <Drawer.Screen 
                    name="findmentors" 
                    options={{
                        drawerLabel: "Explore",
                        title: "Find Mentors",
                        drawerIcon: ({ color, size }) => (
                            <Feather name="search" size={24} color={color} />
                        ),
                    }}
                />
                <Drawer.Screen 
                    name="cybermatch" 
                    options={{
                        drawerLabel: "Cyber Match",
                        title: "Cyber Match",
                        drawerIcon: ({ color, size }) => (
                            <Feather name="shield" size={24} color={color} />
                        ),
                    }}
                />
                <Drawer.Screen 
                    name="settings" 
                    options={{
                        drawerLabel: "Settings",
                        title: "Settings",
                        drawerIcon: ({ color, size }) => (
                            <Feather name="settings" size={24} color={color} />
                        ),
                    }}
                />
            </Drawer>
        </GestureHandlerRootView>
    );
}