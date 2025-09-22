
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import drawerNavigation from './drawerNavigation';
import Notifications from '../notifications';
import Cybermatch from '../cybermatch';
import Profile from './profile';
import Friends from './friends';

const Tab = createBottomTabNavigator();

export default function tabsNavigation() {
    return (
        <Tab.Navigator screenOptions={{ tabBarActiveTintColor: 'blue', headerShown: false }}>
            <Tab.Screen
                name="Home"
                component={drawerNavigation}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={Notifications}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="bell" color={color} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="cog" color={color} />,
                }}
            />
            <Tab.Screen
                name="Friends"
                component={Friends}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="user" color={color} />,
                }}
            />
        </Tab.Navigator>
    );
}
