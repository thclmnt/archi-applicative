import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './app/screens/home.screen';
import OnlineGameScreen from './app/screens/online-game.screen';
import VsBotGameScreen from './app/screens/vs-bot-game.screen';
import Toast from 'react-native-toast-message';

import { SocketContext, socket } from './app/contexts/socket.context';

const Stack = createStackNavigator();
LogBox.ignoreAllLogs(true);

function App() {
  return (
    <>
      <SocketContext.Provider value={socket}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="HomeScreen">
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="OnlineGameScreen" component={OnlineGameScreen} />
            <Stack.Screen name="VsBotGameScreen" component={VsBotGameScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SocketContext.Provider>
      <Toast />
    </>
  );
}

export default App;