import { useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SocketContext } from "../../../contexts/socket.context";

export const PlayerTimer = () => {
    const socket = useContext(SocketContext);
    const [playerTimer, setPlayerTimer] = useState(0);

    useEffect(() => {
        socket.on("game.timer", (data) => {
            setPlayerTimer(data['playerTimer'])
        });
    }, []);

    return (
        <View style={styles.playerTimerContainer}>
            <Text>Timer: {playerTimer}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    playerTimerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "lightgrey"
    },
})