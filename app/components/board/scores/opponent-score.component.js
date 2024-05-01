import { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SocketContext } from "../../../contexts/socket.context";

export const OpponentScore = () => {
    const socket = useContext(SocketContext);
    const [score, setScore] = useState(0);

    useEffect(() => {
        socket.on("game.score.view-state", (data) => {
            setScore(data["player2Score"]);
        });
    }, []);

    return (
        <View style={styles.playerScoreContainer}>
            <Text>Score: {score}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    playerScoreContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "lightgrey"
    }
})