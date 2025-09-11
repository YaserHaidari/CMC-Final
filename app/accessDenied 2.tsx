import { View, Text, Button, ScrollView, Image } from "react-native";

function AccessDenied() {
    return(
        <View className=" flex-1 justify-center bg-neutral-500">
            <Text className="text-4xl font-semibold font-Menu text-neutral-300 text-center pt-5">
                 App Features Unavailable
            </Text>
            <Text className="text-base font-normal font-Text text-neutral-300 text-center pt-2 px-4">
                We currently support users located only in Australia.
            </Text>
            <Text className="text-base font-normal font-Text text-neutral-300 text-center px-12">
                If you are outside Australia, access to this app is not available.
            </Text>
        </View>
    );
}

export default AccessDenied;


