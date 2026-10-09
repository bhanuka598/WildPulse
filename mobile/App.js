import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { initDB } from './src/db/database';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import PublicReportScreen from './src/screens/PublicReportScreen';
import RangerDashboardScreen from './src/screens/RangerDashboardScreen';
import ActivePatrolScreen from './src/screens/ActivePatrolScreen';
import ReportIncidentScreen from './src/screens/ReportIncidentScreen';
import RangerAssignmentsScreen from './src/screens/RangerAssignmentsScreen';
import WildlifeHomeScreen from './src/screens/wildlife/WildlifeHomeScreen';

const Stack = createNativeStackNavigator();

function NavigationRoot() {
  const { user, loading } = useAuth();

  useEffect(() => {
    try {
      initDB();
    } catch (e) {
      console.warn('SQLite init warning (normal in web preview):', e.message);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#047857" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="RangerDashboard" component={RangerDashboardScreen} />
            <Stack.Screen name="ActivePatrol" component={ActivePatrolScreen} />
            <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
            <Stack.Screen name="Assignments" component={RangerAssignmentsScreen} />
            <Stack.Screen name="WildlifeHome" component={WildlifeHomeScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="PublicReport" component={PublicReportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationRoot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#064e3b',
  },
});
