import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { COLORS, api, getToday } from '../../src/constants';

const GOALS = [
  { key: 'build_muscle', label: 'Build Muscle', icon: 'barbell' },
  { key: 'lose_fat', label: 'Lose Fat', icon: 'flame' },
  { key: 'maintain', label: 'Maintain', icon: 'shield-checkmark' },
];

export default function Profile() {
  const [profile, setProfile] = useState<any>({ name: 'User', age: 25, gender: 'male', height: 170, weight: 70, goal: 'build_muscle', activity_level: 'moderate' });
  const [measurements, setMeasurements] = useState<any>({ weight: '', body_fat: '', chest: '', waist: '', hips: '', left_arm: '', right_arm: '', left_thigh: '', right_thigh: '' });
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [prof, meas] = await Promise.all([api.get('/profile'), api.get('/measurements/latest')]);
      setProfile(prof);
      if (meas && Object.keys(meas).length > 0) setLatestMeasurement(meas);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/profile', profile);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated!');
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  const saveMeasurements = async () => {
    setSaving(true);
    try {
      const data: any = { date: getToday() };
      Object.keys(measurements).forEach(k => { data[k] = parseFloat(measurements[k]) || 0; });
      await api.post('/measurements', data);
      setShowMeasurements(false);
      fetchData();
      Alert.alert('Saved', 'Measurements recorded!');
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={32} color={COLORS.primary} />
              </View>
              <TouchableOpacity onPress={() => setEditing(!editing)} testID="edit-profile-btn">
                <Ionicons name={editing ? 'close' : 'create-outline'} size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {editing ? (
              <View>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput style={styles.input} value={profile.name} onChangeText={v => setProfile({ ...profile, name: v })} placeholderTextColor={COLORS.textSecondary} testID="profile-name-input" />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={String(profile.age)} onChangeText={v => setProfile({ ...profile, age: parseInt(v) || 0 })} testID="profile-age-input" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Gender</Text>
                    <View style={styles.genderRow}>
                      {['male', 'female'].map(g => (
                        <TouchableOpacity key={g} style={[styles.genderBtn, profile.gender === g && styles.genderBtnActive]} onPress={() => setProfile({ ...profile, gender: g })} testID={`gender-${g}-btn`}>
                          <Text style={[styles.genderBtnText, profile.gender === g && { color: '#FFF' }]}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Height (cm)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={String(profile.height)} onChangeText={v => setProfile({ ...profile, height: parseFloat(v) || 0 })} testID="profile-height-input" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Weight (kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={String(profile.weight)} onChangeText={v => setProfile({ ...profile, weight: parseFloat(v) || 0 })} testID="profile-weight-input" />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>Goal</Text>
                <View style={styles.goalRow}>
                  {GOALS.map(g => (
                    <TouchableOpacity key={g.key} style={[styles.goalBtn, profile.goal === g.key && styles.goalBtnActive]} onPress={() => setProfile({ ...profile, goal: g.key })} testID={`goal-${g.key}-btn`}>
                      <Ionicons name={g.icon as any} size={16} color={profile.goal === g.key ? '#FFF' : COLORS.textSecondary} />
                      <Text style={[styles.goalBtnText, profile.goal === g.key && { color: '#FFF' }]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} testID="save-profile-btn">
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.profileName} testID="profile-name">{profile.name}</Text>
                <Text style={styles.profileSub}>{profile.age}y • {profile.gender} • {profile.height}cm • {profile.weight}kg</Text>
                <View style={styles.goalChip}>
                  <Ionicons name={(GOALS.find(g => g.key === profile.goal)?.icon || 'barbell') as any} size={14} color={COLORS.primary} />
                  <Text style={styles.goalChipText}>{GOALS.find(g => g.key === profile.goal)?.label || profile.goal}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>BODY MEASUREMENTS</Text>
              <TouchableOpacity onPress={() => setShowMeasurements(!showMeasurements)} testID="add-measurements-btn">
                <Ionicons name={showMeasurements ? 'close' : 'add-circle'} size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {showMeasurements ? (
              <View>
                {[
                  ['Weight (kg)', 'weight'], ['Body Fat (%)', 'body_fat'],
                  ['Chest (cm)', 'chest'], ['Waist (cm)', 'waist'], ['Hips (cm)', 'hips'],
                  ['Left Arm (cm)', 'left_arm'], ['Right Arm (cm)', 'right_arm'],
                  ['Left Thigh (cm)', 'left_thigh'], ['Right Thigh (cm)', 'right_thigh'],
                ].map(([label, field]) => (
                  <View key={field} style={styles.measField}>
                    <Text style={styles.measLabel}>{label}</Text>
                    <TextInput
                      style={styles.measInput}
                      keyboardType="numeric"
                      value={(measurements as any)[field]}
                      onChangeText={v => setMeasurements((prev: any) => ({ ...prev, [field]: v }))}
                      placeholder="0"
                      placeholderTextColor={COLORS.textSecondary}
                      testID={`meas-${field}-input`}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.saveBtn} onPress={saveMeasurements} testID="save-measurements-btn">
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Measurements'}</Text>
                </TouchableOpacity>
              </View>
            ) : latestMeasurement ? (
              <View>
                <Text style={styles.measDate}>Last recorded: {latestMeasurement.date}</Text>
                <View style={styles.measGrid}>
                  {[
                    ['Weight', latestMeasurement.weight, 'kg'], ['Body Fat', latestMeasurement.body_fat, '%'],
                    ['Chest', latestMeasurement.chest, 'cm'], ['Waist', latestMeasurement.waist, 'cm'],
                    ['Hips', latestMeasurement.hips, 'cm'], ['L.Arm', latestMeasurement.left_arm, 'cm'],
                    ['R.Arm', latestMeasurement.right_arm, 'cm'], ['L.Thigh', latestMeasurement.left_thigh, 'cm'],
                    ['R.Thigh', latestMeasurement.right_thigh, 'cm'],
                  ].filter(([_, val]) => (val as number) > 0).map(([label, val, unit]) => (
                    <View key={label as string} style={styles.measItem}>
                      <Text style={styles.measItemVal}>{val}{unit}</Text>
                      <Text style={styles.measItemLabel}>{label as string}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.noData}>No measurements recorded yet</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>CONNECTED DEVICES</Text>
            </View>
            <View style={styles.fitCard}>
              <Ionicons name="watch-outline" size={24} color={COLORS.textSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.fitTitle}>Google Fit / Smartwatch</Text>
                <Text style={styles.fitSub}>Sync calories, steps, heart rate</Text>
              </View>
              <View style={styles.comingSoon}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  card: { marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  profileSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  goalChip: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  goalChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: 12, fontWeight: '600' },
  input: { backgroundColor: COLORS.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', gap: 12 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.elevated, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  genderBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderBtnText: { color: COLORS.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  goalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  goalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.elevated, borderWidth: 1, borderColor: COLORS.border },
  goalBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  goalBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  measField: { marginBottom: 8 },
  measLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '600' },
  measInput: { backgroundColor: COLORS.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  measDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  measGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measItem: { backgroundColor: COLORS.elevated, borderRadius: 10, padding: 10, minWidth: 80, alignItems: 'center' },
  measItemVal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  measItemLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  noData: { fontSize: 14, color: COLORS.textSecondary },
  fitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.elevated, borderRadius: 12, padding: 16 },
  fitTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  fitSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  comingSoon: { backgroundColor: COLORS.warning + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  comingSoonText: { color: COLORS.warning, fontSize: 11, fontWeight: '700' },
});
