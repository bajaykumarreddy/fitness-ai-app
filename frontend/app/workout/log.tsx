import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { COLORS, api, getToday, MUSCLE_GROUPS } from '../../src/constants';

const MUSCLE_ICONS: Record<string, string> = {
  Chest: 'body', Back: 'body', Legs: 'walk', Shoulders: 'body', Arms: 'fitness', Core: 'body',
};

export default function WorkoutLog() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [muscleGroup, setMuscleGroup] = useState('');
  const [exercise, setExercise] = useState('');
  const [exercises, setExercises] = useState<Record<string, string[]>>({});
  const [sets, setSets] = useState([{ weight: '', reps: '' }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/exercises').then(setExercises).catch(console.error); }, []);

  const addSet = () => setSets([...sets, { weight: '', reps: '' }]);
  const removeSet = (i: number) => { if (sets.length > 1) setSets(sets.filter((_, idx) => idx !== i)); };
  const updateSet = (i: number, field: string, value: string) => {
    const updated = [...sets];
    (updated[i] as any)[field] = value;
    setSets(updated);
  };

  const saveWorkout = async () => {
    const validSets = sets.filter(s => s.reps);
    if (!validSets.length) { Alert.alert('Error', 'Add at least one set with reps'); return; }
    setSaving(true);
    try {
      await api.post('/workouts', {
        date: getToday(),
        muscle_group: muscleGroup,
        exercise,
        sets: validSets.map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 })),
        notes,
      });
      Alert.alert('Saved!', `${exercise} logged`, [
        { text: 'Log More', onPress: () => { setStep(1); setSets([{ weight: '', reps: '' }]); setNotes(''); } },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) { Alert.alert('Error', 'Failed to save workout'); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()} testID="workout-back-btn">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 0 ? 'Select Muscle Group' : step === 1 ? `${muscleGroup} Exercises` : exercise}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.progressDot, step >= i && styles.progressDotActive]} />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {step === 0 && (
            <View style={styles.grid}>
              {MUSCLE_GROUPS.map(mg => (
                <TouchableOpacity
                  key={mg}
                  style={styles.muscleCard}
                  onPress={() => { setMuscleGroup(mg); setStep(1); }}
                  testID={`muscle-${mg.toLowerCase()}-btn`}
                  activeOpacity={0.7}
                >
                  <Ionicons name={MUSCLE_ICONS[mg] as any} size={28} color={COLORS.primary} />
                  <Text style={styles.muscleText}>{mg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 1 && (
            <View style={{ paddingHorizontal: 20 }}>
              {(exercises[muscleGroup] || []).map(ex => (
                <TouchableOpacity
                  key={ex}
                  style={styles.exerciseCard}
                  onPress={() => { setExercise(ex); setStep(2); setSets([{ weight: '', reps: '' }]); }}
                  testID={`exercise-${ex.replace(/\s+/g, '-').toLowerCase()}-btn`}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exerciseText}>{ex}</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 2 && (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={styles.sectionLabel}>LOG YOUR SETS</Text>
              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, { width: 32 }]}>Set</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Weight (kg)</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
                <View style={{ width: 32 }} />
              </View>

              {sets.map((set, i) => (
                <View key={i} style={styles.setRow}>
                  <View style={styles.setNumberWrap}>
                    <Text style={styles.setNumber}>{i + 1}</Text>
                  </View>
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    keyboardType="numeric"
                    value={set.weight}
                    onChangeText={v => updateSet(i, 'weight', v)}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                    testID={`set-${i}-weight`}
                  />
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={v => updateSet(i, 'reps', v)}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                    testID={`set-${i}-reps`}
                  />
                  <TouchableOpacity onPress={() => removeSet(i)} style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close-circle" size={20} color={sets.length > 1 ? COLORS.error : COLORS.elevated} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addSetBtn} onPress={addSet} testID="add-set-btn">
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did it feel? Any PRs?"
                placeholderTextColor={COLORS.textSecondary}
                multiline
                testID="workout-notes-input"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveWorkout} disabled={saving} testID="save-workout-btn">
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Workout'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 16 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: COLORS.elevated },
  progressDotActive: { backgroundColor: COLORS.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  muscleCard: { width: '48%', paddingVertical: 28, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  muscleText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  exerciseCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  exerciseText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 12 },
  setHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8, gap: 8 },
  setHeaderText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  setNumberWrap: { width: 32, height: 36, borderRadius: 8, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  setNumber: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  setInput: { backgroundColor: COLORS.elevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 16, textAlign: 'center', fontWeight: '600', borderWidth: 1, borderColor: COLORS.border },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  addSetText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  notesInput: { backgroundColor: COLORS.elevated, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.text, fontSize: 14, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
  saveBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
