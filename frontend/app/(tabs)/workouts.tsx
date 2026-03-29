import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { COLORS, api, getToday } from '../../src/constants';

export default function Workouts() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    try {
      const result = await api.get(`/workouts?date=${getToday()}`);
      setWorkouts(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchWorkouts(); }, []));

  const deleteWorkout = (id: string) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.del(`/workouts/${id}`);
        fetchWorkouts();
      }},
    ]);
  };

  const totalCalories = workouts.reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);
  const muscleGroups = [...new Set(workouts.map((w: any) => w.muscle_group))];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{workouts.length}</Text>
          <Text style={styles.summaryLabel}>Exercises</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>{Math.round(totalCalories)}</Text>
          <Text style={styles.summaryLabel}>Cal Burned</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{muscleGroups.length}</Text>
          <Text style={styles.summaryLabel}>Muscles</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWorkouts(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : workouts.length === 0 ? (
          <View style={styles.emptyState} testID="workouts-empty">
            <Ionicons name="barbell-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No workouts logged today</Text>
            <Text style={styles.emptySubText}>Tap + to start training</Text>
          </View>
        ) : (
          workouts.map((workout: any) => (
            <TouchableOpacity
              key={workout.id}
              style={styles.workoutCard}
              onLongPress={() => deleteWorkout(workout.id)}
              testID={`workout-${workout.id}`}
            >
              <View style={styles.workoutHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{workout.exercise}</Text>
                  <Text style={styles.muscleGroup}>{workout.muscle_group}</Text>
                </View>
                <View style={styles.calBadge}>
                  <Text style={styles.calBadgeText}>{Math.round(workout.calories_burned)} cal</Text>
                </View>
              </View>
              <View style={styles.setsRow}>
                {workout.sets?.map((set: any, i: number) => (
                  <View key={i} style={styles.setBadge}>
                    <Text style={styles.setText}>{set.weight}kg x {set.reps}</Text>
                  </View>
                ))}
              </View>
              {workout.notes ? <Text style={styles.notesText}>{workout.notes}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/workout/log')}
        testID="add-workout-btn"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  date: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  summaryItem: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  summaryNumber: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  workoutCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exerciseName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  muscleGroup: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  calBadge: { backgroundColor: COLORS.warning + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  calBadgeText: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  setsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  setBadge: { backgroundColor: COLORS.elevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  setText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  notesText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
