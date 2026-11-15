import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Switch,
} from 'react-native';
import {
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Building,
  GraduationCap,
  BookOpen,
  Users,
  Settings,
  ChevronDown,
} from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { SITE_CONFIG } from '@/constants/siteConfig';
import { getApiBaseUrl } from '@/utils/backendUrl';
import {
  getExploredDemoModules,
  saveFeedbackDraft,
  getFeedbackDraft,
  clearFeedbackDraft,
  markFeedbackSubmitted,
  isFeedbackSubmitted,
} from '@/utils/demoEngagement';

const MODULE_OPTIONS = [
  { id: 'student', label: 'Student Portal', icon: GraduationCap, color: '#FF6B00' },
  { id: 'teacher', label: 'Teacher Portal', icon: BookOpen, color: '#10B981' },
  { id: 'parent', label: 'Parent Portal', icon: Users, color: '#3B82F6' },
  { id: 'admin', label: 'Admin Portal', icon: Settings, color: '#8B5CF6' },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Needs significant work',
  2: 'Fair, has rough edges',
  3: 'Good foundation',
  4: 'Very good & useful',
  5: 'Exceptional experience',
};

interface DemoFeedbackSectionProps {
  onSubmitted?: () => void;
  onSkip?: () => void;
}

export const DemoFeedbackSection: React.FC<DemoFeedbackSectionProps> = ({
  onSubmitted,
  onSkip,
}) => {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  // Form State
  const [rating, setRating] = useState<number | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [liked, setLiked] = useState('');
  const [improve, setImprove] = useState('');
  const [role, setRole] = useState(SITE_CONFIG.feedbackRoles[0].value);
  const [contactRequested, setContactRequested] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [consent, setConsent] = useState(false);

  // Honeypot spam trap
  const [honeypot, setHoneypot] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Restore draft or mark already submitted on mount
  useEffect(() => {
    if (isFeedbackSubmitted()) {
      setSubmitted(true);
      return;
    }

    // Pre-populate explored modules from engagement tracker
    const explored = getExploredDemoModules();
    if (explored.length > 0) {
      setSelectedModules(explored);
    }

    // Restore draft
    const draft = getFeedbackDraft();
    if (draft) {
      if (typeof draft.rating === 'number') setRating(draft.rating);
      if (Array.isArray(draft.selectedModules)) setSelectedModules(draft.selectedModules);
      if (draft.liked) setLiked(draft.liked);
      if (draft.improve) setImprove(draft.improve);
      if (draft.role) setRole(draft.role);
      if (typeof draft.contactRequested === 'boolean') setContactRequested(draft.contactRequested);
      if (draft.contactName) setContactName(draft.contactName);
      if (draft.contactEmail) setContactEmail(draft.contactEmail);
      if (draft.contactPhone) setContactPhone(draft.contactPhone);
      if (typeof draft.consent === 'boolean') setConsent(draft.consent);
    }
  }, []);

  // Save session draft on user edits
  const updateDraft = (updates: any) => {
    saveFeedbackDraft({
      rating,
      selectedModules,
      liked,
      improve,
      role,
      contactRequested,
      contactName,
      contactEmail,
      contactPhone,
      consent,
      ...updates,
    });
  };

  const toggleModule = (modId: string) => {
    const next = selectedModules.includes(modId)
      ? selectedModules.filter((id) => id !== modId)
      : [...selectedModules, modId];
    setSelectedModules(next);
    updateDraft({ selectedModules: next });
  };

  const handleRatingChange = (val: number) => {
    setRating(val);
    updateDraft({ rating: val });
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Validation if contact requested
    if (contactRequested) {
      if (!contactEmail.trim() || !contactEmail.includes('@')) {
        setErrorMessage('Please enter a valid email address so we can reach you.');
        return;
      }
      if (!consent) {
        setErrorMessage('Please check the consent box to allow us to follow up with you.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        rating,
        engaged_modules: selectedModules,
        liked: liked.trim(),
        improve: improve.trim(),
        role,
        contact_requested: contactRequested,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        consent,
        // Honeypot field
        website: honeypot,
      };

      const res = await fetch(`${getApiBaseUrl()}/demo/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to submit feedback');
      }

      clearFeedbackDraft();
      markFeedbackSubmitted();
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to submit feedback. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS STATE
  if (submitted) {
    return (
      <View id="feedback-section" style={{ width: '100%', marginTop: 40, marginBottom: 40 }}>
        <GlassCard
          variant="elevated"
          accentColor="#10B981"
          glowColor="rgba(16, 185, 129, 0.3)"
          borderRadius={24}
          style={{ width: '100%', maxWidth: 840, alignSelf: 'center' }}
          contentStyle={{ padding: 36, alignItems: 'center' }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={32} color="#10B981" />
          </View>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            Thank You for Your Feedback!
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: 14.5,
              textAlign: 'center',
              maxWidth: 500,
              lineHeight: 22,
              marginBottom: 20,
            }}
          >
            Your thoughts have been logged. We review every submission to refine Cloudora LMS for teachers, students, and administrators.
          </Text>
          {contactRequested && (
            <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '700' }}>
              ✓ Our education team will follow up at {contactEmail}.
            </Text>
          )}
        </GlassCard>
      </View>
    );
  }

  const selectedRoleObj = SITE_CONFIG.feedbackRoles.find((r) => r.value === role);

  return (
    <View id="feedback-section" style={{ width: '100%', marginTop: 48, marginBottom: 40 }}>
      <GlassCard
        variant="elevated"
        accentColor="#FF6B00"
        glowColor="rgba(255, 107, 0, 0.28)"
        borderRadius={28}
        style={{
          width: '100%',
          maxWidth: 880,
          alignSelf: 'center',
          borderColor: 'rgba(255, 107, 0, 0.35)',
        }}
        contentStyle={{
          padding: isDesktop ? 36 : 24,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: 'rgba(255, 107, 0, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(255, 107, 0, 0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <MessageSquare size={24} color="#FF6B00" />
          </View>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: isDesktop ? 26 : 21,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: -0.4,
              marginBottom: 8,
            }}
          >
            Tried the demo? Tell us what you think.
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.62)',
              fontSize: 14.5,
              textAlign: 'center',
              maxWidth: 580,
              lineHeight: 22,
            }}
          >
            Your feedback directly shapes our platform. All fields are completely optional.
          </Text>
        </View>

        {/* 1. Overall Rating (1 to 5 Stars) */}
        <View style={{ marginBottom: 28, alignItems: 'center' }}>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 14,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Overall Demo Experience
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((val) => {
              const isFilled = rating !== null && val <= rating;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => handleRatingChange(val)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${val} out of 5 stars`}
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: isFilled
                      ? 'rgba(255, 107, 0, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    borderColor: isFilled
                      ? 'rgba(255, 107, 0, 0.5)'
                      : 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Star
                    size={28}
                    color={isFilled ? '#FF6B00' : 'rgba(255, 255, 255, 0.35)'}
                    fill={isFilled ? '#FF6B00' : 'transparent'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          {rating !== null && (
            <Text
              style={{
                color: '#FFA35C',
                fontSize: 13,
                fontWeight: '700',
                marginTop: 8,
              }}
            >
              {RATING_LABELS[rating]}
            </Text>
          )}
        </View>

        {/* 2. Modules Explored (Chips) */}
        <View style={{ marginBottom: 26 }}>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 13.5,
              fontWeight: '700',
              marginBottom: 10,
            }}
          >
            Which modules did you explore? (Optional)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {MODULE_OPTIONS.map((mod) => {
              const isSelected = selectedModules.includes(mod.id);
              const Icon = mod.icon;
              return (
                <TouchableOpacity
                  key={mod.id}
                  onPress={() => toggleModule(mod.id)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isSelected
                      ? `${mod.color}25`
                      : 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    borderColor: isSelected
                      ? `${mod.color}80`
                      : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Icon size={16} color={isSelected ? mod.color : 'rgba(255, 255, 255, 0.5)'} />
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: 13,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {mod.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Your Role Selector */}
        <View style={{ marginBottom: 26 }}>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 13.5,
              fontWeight: '700',
              marginBottom: 8,
            }}
          >
            Your Role in Education
          </Text>
          <TouchableOpacity
            onPress={() => setRoleDropdownOpen(!roleDropdownOpen)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {selectedRoleObj?.label || 'Select your role'}
            </Text>
            <ChevronDown size={18} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>

          {roleDropdownOpen && (
            <View
              style={{
                marginTop: 6,
                backgroundColor: '#120C28',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                overflow: 'hidden',
              }}
            >
              {SITE_CONFIG.feedbackRoles.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => {
                    setRole(r.value);
                    setRoleDropdownOpen(false);
                    updateDraft({ role: r.value });
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
                    backgroundColor: r.value === role ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: r.value === role ? '#FF8C40' : 'rgba(255, 255, 255, 0.85)',
                      fontSize: 13.5,
                      fontWeight: r.value === role ? '700' : '500',
                    }}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 4. What did you like? */}
        <View style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13.5, fontWeight: '700' }}>
              What did you like?
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>
              {liked.length}/1000
            </Text>
          </View>
          <TextInput
            multiline
            numberOfLines={3}
            maxLength={1000}
            value={liked}
            onChangeText={(txt) => {
              setLiked(txt);
              updateDraft({ liked: txt });
            }}
            placeholder="e.g. Clean interface, fast grading, easy student enrollment..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 14,
              padding: 14,
              color: '#FFFFFF',
              fontSize: 14,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* 5. What could be better? */}
        <View style={{ marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13.5, fontWeight: '700' }}>
              What could be better?
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>
              {improve.length}/1000
            </Text>
          </View>
          <TextInput
            multiline
            numberOfLines={3}
            maxLength={1000}
            value={improve}
            onChangeText={(txt) => {
              setImprove(txt);
              updateDraft({ improve: txt });
            }}
            placeholder="e.g. Add M-Pesa fee reconciliation, export report cards to Excel..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 14,
              padding: 14,
              color: '#FFFFFF',
              fontSize: 14,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* 6. Contact Me Toggle */}
        <View
          style={{
            padding: 18,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            marginBottom: 26,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 2 }}>
                Would you like our team to contact you?
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>
                If you would like a guided walkthrough or custom pricing for your school.
              </Text>
            </View>
            <Switch
              value={contactRequested}
              onValueChange={(val) => {
                setContactRequested(val);
                updateDraft({ contactRequested: val });
              }}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#FF6B00' }}
              thumbColor={contactRequested ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>

          {/* Conditional Contact Fields */}
          {contactRequested && (
            <View style={{ marginTop: 18, gap: 14 }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginBottom: 5 }}>
                  Your Name (Optional)
                </Text>
                <TextInput
                  value={contactName}
                  onChangeText={(txt) => {
                    setContactName(txt);
                    updateDraft({ contactName: txt });
                  }}
                  placeholder="e.g. Principal Jane Mwangi"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: 12,
                    color: '#FFFFFF',
                    fontSize: 14,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginBottom: 5 }}>
                  Contact Email <Text style={{ color: '#FF6B00' }}>*</Text>
                </Text>
                <TextInput
                  value={contactEmail}
                  onChangeText={(txt) => {
                    setContactEmail(txt);
                    updateDraft({ contactEmail: txt });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="e.g. j.mwangi@school.ac.ke"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: 12,
                    color: '#FFFFFF',
                    fontSize: 14,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginBottom: 5 }}>
                  Phone / WhatsApp (Optional)
                </Text>
                <TextInput
                  value={contactPhone}
                  onChangeText={(txt) => {
                    setContactPhone(txt);
                    updateDraft({ contactPhone: txt });
                  }}
                  keyboardType="phone-pad"
                  placeholder="+254 700 000 000"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: 12,
                    color: '#FFFFFF',
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Consent Line */}
              <TouchableOpacity
                onPress={() => {
                  const nextConsent = !consent;
                  setConsent(nextConsent);
                  updateDraft({ consent: nextConsent });
                }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: consent ? '#FF6B00' : 'rgba(255,255,255,0.3)',
                    backgroundColor: consent ? '#FF6B00' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {consent && <CheckCircle2 size={14} color="#FFFFFF" />}
                </View>
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: 12,
                    lineHeight: 18,
                    flex: 1,
                  }}
                >
                  I consent to Cloudora storing my contact details to follow up regarding my demo feedback, pursuant to the platform privacy policy.
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Hidden Honeypot Field for Spam Bots */}
        <TextInput
          value={honeypot}
          onChangeText={setHoneypot}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
          aria-hidden={true}
          tabIndex={-1}
        />

        {/* Error message */}
        {errorMessage && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.35)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 18,
            }}
          >
            <AlertCircle size={18} color="#EF4444" />
            <Text style={{ color: '#FCA5A5', fontSize: 13, flex: 1 }}>{errorMessage}</Text>
          </View>
        )}

        {/* Submit & Skip Actions */}
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              {
                backgroundColor: '#FF6B00',
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                minWidth: 180,
                opacity: loading ? 0.7 : 1,
              },
              isWeb ? ({ cursor: 'pointer' } as any) : {},
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  Submit Feedback
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.7}
            style={{ paddingVertical: 12, paddingHorizontal: 16 }}
          >
            <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 13, fontWeight: '600' }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
};

export default DemoFeedbackSection;
