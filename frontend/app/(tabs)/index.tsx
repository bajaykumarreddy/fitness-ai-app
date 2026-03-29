import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { COLORS, api, getToday, PERSONAS } from '../../src/constants';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await api.get(`/dashboard?date=${getToday()}`);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const caloriesIn = data?.calories_consumed || 0;
  const caloriesOut = data?.calories_burned || 0;
  const netCalories = caloriesIn - caloriesOut;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appName} testID="app-title">FORGE</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} testID="profile-btn">
            <View style={styles.profileCircle}>
              <Ionicons name="person" size={20} color={COLORS.text} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.calorieCard} testID="calorie-card">
          <Text style={styles.cardTitle}>TODAY'S ENERGY</Text>
          <View style={styles.calorieRow}>
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieNumber, { color: COLORS.success }]}>{Math.round(caloriesIn)}</Text>
              <Text style={styles.calorieLabel}>Consumed</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieNumber, { color: COLORS.primary }]}>{Math.round(caloriesOut)}</Text>
              <Text style={styles.calorieLabel}>Burned</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieNumber, { color: netCalories >= 0 ? COLORS.warning : COLORS.success }]}>
                {Math.round(netCalories)}
              </Text>
              <Text style={styles.calorieLabel}>Net</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="barbell" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{data?.workout_count || 0}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="restaurant" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{data?.meals_count || 0}</Text>
            <Text style={styles.statLabel}>Meals</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="body" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>{data?.muscle_groups_worked?.length || 0}</Text>
            <Text style={styles.statLabel}>Muscles</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/workout/log')}
            testID="log-workout-btn"
          >
            <Ionicons name="barbell" size={22} color="#FFF" />
            <Text style={styles.actionBtnText}>Log Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => router.push('/(tabs)/nutrition')}
            testID="log-meal-btn"
          >
            <Ionicons name="nutrition" size={22} color="#FFF" />
            <Text style={styles.actionBtnText}>Log Meal</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>AI COACHES</Text>
        {Object.entries(PERSONAS).map(([key, persona]) => (
          <TouchableOpacity
            key={key}
            style={styles.personaCard}
            onPress={() => router.push(`/chat/${key}`)}
            testID={`persona-${key}-btn`}
            activeOpacity={0.7}
          >
            <View style={[styles.personaIcon, { backgroundColor: persona.color + '20' }]}>
              <Ionicons name={persona.icon as any} size={24} color={persona.color} />
            </View>
            <View style={styles.personaInfo}>
              <Text style={styles.personaName}>{persona.name}</Text>
              <Text style={styles.personaRole}>{persona.role}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}

        {(data?.muscle_groups_worked?.length || 0) > 0 && (
          <>
            <Text style={styles.sectionTitle}>MUSCLES WORKED</Text>
            <View style={styles.muscleRow}>
              {data.muscle_groups_worked.map((mg: string) => (
                <View key={mg} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{mg}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  appName: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  dateText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  profileCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  calorieCard: { marginHorizontal: 20, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 16 },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  calorieStat: { alignItems: 'center' },
  calorieNumber: { fontSize: 32, fontWeight: '900' },
  calorieLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  calorieDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNumber: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  personaCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  personaIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  personaInfo: { flex: 1, marginLeft: 12 },
  personaName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  personaRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  muscleChip: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  muscleChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
});
