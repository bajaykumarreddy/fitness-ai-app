import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, PERSONAS } from '../../src/constants';

export default function ChatSelector() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Coaches</Text>
        <Text style={styles.subtitle}>Powered by GPT-5.2 • Reads your daily data</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {Object.entries(PERSONAS).map(([key, persona]) => (
          <TouchableOpacity
            key={key}
            style={styles.card}
            onPress={() => router.push(`/chat/${key}`)}
            testID={`chat-${key}-btn`}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: persona.color }]}>
              <Ionicons name={persona.icon as any} size={32} color="#FFF" />
            </View>
            <Text style={styles.personaName}>{persona.name}</Text>
            <Text style={styles.personaRole}>{persona.role}</Text>
            <Text style={styles.personaDesc}>{persona.description}</Text>
            <View style={styles.chatNow}>
              <Text style={[styles.chatNowText, { color: persona.color }]}>Chat Now</Text>
              <Ionicons name="arrow-forward" size={16} color={persona.color} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            Each AI coach reads your daily workout logs, meals, and body measurements to give personalized advice tailored to your progress.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  card: { marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  personaName: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  personaRole: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  personaDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  chatNow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  chatNowText: { fontSize: 14, fontWeight: '700' },
  infoCard: { flexDirection: 'row', marginHorizontal: 20, padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, gap: 10, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
