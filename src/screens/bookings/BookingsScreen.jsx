import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { BACKEND } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const STEPS = ['Service', 'Barber', 'Date', 'Time', 'Confirm'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function StepBar({ step }) {
  const { T } = useTheme();
  const sb = useMemo(() => makeSbStyles(T), [T]);
  return (
    <View style={sb.wrap}>
      {STEPS.map((label, i) => (
        <View key={label} style={sb.item}>
          <View style={[sb.circle, i < step && sb.done, i === step && sb.active]}>
            <Text style={[sb.num, (i <= step) && sb.numActive]}>{i + 1}</Text>
          </View>
          <Text style={[sb.label, i === step && sb.labelActive]}>{label}</Text>
          {i < STEPS.length - 1 && <View style={[sb.line, i < step && sb.lineDone]} />}
        </View>
      ))}
    </View>
  );
}

function makeSbStyles(T) { return StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  item:       { alignItems: 'center', flex: 1, position: 'relative' },
  circle:     { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: T.border, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  done:       { backgroundColor: T.red, borderColor: T.red },
  active:     { borderColor: T.red },
  num:        { fontFamily: 'Montserrat_700Bold', fontSize: 10, color: T.textDim },
  numActive:  { color: T.text },
  label:      { fontFamily: 'Montserrat_400Regular', fontSize: 9, letterSpacing: 1, color: T.textFaint, textTransform: 'uppercase' },
  labelActive:{ color: T.red },
  line:       { position: 'absolute', top: 13, left: '50%', right: '-50%', height: 1, backgroundColor: T.border, zIndex: -1 },
  lineDone:   { backgroundColor: T.red },
}); }

export default function BookingsScreen() {
  const { user } = useAuth();
  const { T } = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const scrollRef = useRef(null);
  const [step,     setStep]    = useState(0);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Step 0 – services
  const [services,         setServices]         = useState([]);
  const [loadingServices,  setLoadingServices]  = useState(true);
  const [selectedService,  setSelectedService]  = useState(null);

  // Step 1 – barbers
  const [barbers,          setBarbers]          = useState([]);
  const [loadingBarbers,   setLoadingBarbers]   = useState(false);
  const [selectedBarber,   setSelectedBarber]   = useState(null);

  // Step 2 – dates
  const [availDates,       setAvailDates]       = useState([]);
  const [loadingDates,     setLoadingDates]     = useState(false);
  const [selectedDate,     setSelectedDate]     = useState(null);

  // Step 3 – time slots
  const [slots,            setSlots]            = useState([]);
  const [loadingSlots,     setLoadingSlots]     = useState(false);
  const [selectedSlot,     setSelectedSlot]     = useState(null);

  // Step 4 – contact / confirm
  const [guestName,        setGuestName]        = useState(user?.name || '');
  const [guestEmail,       setGuestEmail]       = useState(user?.email || '');
  const [guestPhone,       setGuestPhone]       = useState('');
  const [notes,            setNotes]            = useState('');
  const [submitting,       setSubmitting]       = useState(false);
  const [booked,           setBooked]           = useState(false);

  // Load services on mount
  useEffect(() => {
    api.get('/services/public-services')
      .then(r => setServices(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, []);

  // Load barbers when service selected
  const loadBarbers = useCallback(async () => {
    setLoadingBarbers(true);
    setBarbers([]);
    try {
      const r = await api.get('/barber-profiles');
      setBarbers((r.data || []).filter(b => b.isBookable));
    } catch {
      // ignore
    } finally {
      setLoadingBarbers(false);
    }
  }, []);

  // Load available dates when barber selected
  const loadDates = useCallback(async (barberId, serviceId) => {
    setLoadingDates(true);
    setAvailDates([]);
    try {
      const r = await api.get('/bookings/available-dates', {
        params: { barberId, serviceId },
      });
      setAvailDates(r.data.dates || r.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingDates(false);
    }
  }, []);

  // Load time slots when date selected
  const loadSlots = useCallback(async (barberId, serviceId, date) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const r = await api.get('/bookings/available-slots', {
        params: { barberId, serviceId, date },
      });
      setSlots(r.data.slots || r.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const handleSelectService = (svc) => {
    setSelectedService(svc);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(1);
    loadBarbers();
  };

  const handleSelectBarber = (barber) => {
    setSelectedBarber(barber);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(2);
    loadDates(barber.id, selectedService.id);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(3);
    loadSlots(selectedBarber.id, selectedService.id, date);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(4);
  };

  const handleConfirm = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      Alert.alert('Missing info', 'Please enter your name and email.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        serviceId:  selectedService.id,
        barberId:   selectedBarber.id,
        date:       selectedDate,
        timeSlot:   selectedSlot,
        guestName:  guestName.trim(),
        guestEmail: guestEmail.trim().toLowerCase(),
        guestPhone: guestPhone.trim() || undefined,
        notes:      notes.trim() || undefined,
      });
      setBooked(true);
    } catch (err) {
      Alert.alert('Booking failed', err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setStep(0);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBooked(false);
    setNotes('');
    setGuestPhone('');
  };

  if (booked) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successWrap}>
          <Ionicons name="checkmark-circle" size={64} color={T.red} style={{ marginBottom: 8 }} />
          <Text style={s.successTitle}>Booking Confirmed!</Text>
          <Text style={s.successBody}>
            Your appointment with {selectedBarber?.displayName || selectedBarber?.name} has been requested.
            You'll receive an email confirmation shortly.
          </Text>
          <View style={s.summaryBox}>
            <Text style={s.summaryLine}>{selectedService?.name}</Text>
            <Text style={s.summaryMeta}>
              {formatDate(selectedDate)} at {selectedSlot}
            </Text>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={resetAll} activeOpacity={0.8}>
            <Text style={s.primaryBtnText}>BOOK ANOTHER</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StepBar step={step} />

      <ScrollView ref={scrollRef} style={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Step 0: Pick Service ── */}
        {step === 0 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Choose a Service</Text>
            {loadingServices ? (
              <ActivityIndicator color={T.red} style={{ marginTop: 24 }} />
            ) : services.length === 0 ? (
              <Text style={s.empty}>No services available right now.</Text>
            ) : (
              services.map(svc => (
                <TouchableOpacity
                  key={svc.id}
                  style={s.card}
                  onPress={() => handleSelectService(svc)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{svc.name}</Text>
                    {!!svc.description && (
                      <Text style={s.cardDesc} numberOfLines={2}>{svc.description}</Text>
                    )}
                    <View style={s.cardMeta}>
                      {svc.price != null && (
                        <Text style={s.metaPrice}>£{Number(svc.price).toFixed(2)}</Text>
                      )}
                      {svc.duration != null && (
                        <Text style={s.metaDur}>{svc.duration} min</Text>
                      )}
                    </View>
                  </View>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ── Step 1: Pick Barber ── */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Choose a Barber</Text>
            <Text style={s.stepSub}>for {selectedService?.name}</Text>
            {loadingBarbers ? (
              <ActivityIndicator color={T.red} style={{ marginTop: 24 }} />
            ) : barbers.length === 0 ? (
              <Text style={s.empty}>No barbers available.</Text>
            ) : (
              barbers.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={s.card}
                  onPress={() => handleSelectBarber(b)}
                  activeOpacity={0.75}
                >
                  {b.imageUrl ? (
                    <Image
                      source={{ uri: `${BACKEND}${b.imageUrl}` }}
                      style={s.barberThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[s.barberThumb, s.barberThumbPlaceholder]}>
                      <Text style={s.barberInitial}>
                        {(b.displayName || b.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{b.displayName || b.name}</Text>
                    {!!b.bio && (
                      <Text style={s.cardDesc} numberOfLines={2}>{b.bio}</Text>
                    )}
                  </View>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(0)} activeOpacity={0.7}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Pick Date ── */}
        {step === 2 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Choose a Date</Text>
            <Text style={s.stepSub}>{selectedBarber?.displayName || selectedBarber?.name}</Text>
            {loadingDates ? (
              <ActivityIndicator color={T.red} style={{ marginTop: 24 }} />
            ) : availDates.length === 0 ? (
              <View>
                <Text style={s.empty}>No dates available. Try a different barber.</Text>
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {availDates.map(date => (
                  <TouchableOpacity
                    key={date}
                    style={s.dateCard}
                    onPress={() => handleSelectDate(date)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.dateText}>{formatDate(date)}</Text>
                    <Text style={s.arrow}>›</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Step 3: Pick Time ── */}
        {step === 3 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Choose a Time</Text>
            <Text style={s.stepSub}>{formatDate(selectedDate)}</Text>
            {loadingSlots ? (
              <ActivityIndicator color={T.red} style={{ marginTop: 24 }} />
            ) : slots.length === 0 ? (
              <View>
                <Text style={s.empty}>No slots available on this date.</Text>
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)} activeOpacity={0.7}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.slotGrid}>
                  {slots.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={s.slotChip}
                      onPress={() => handleSelectSlot(slot)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.slotText}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)} activeOpacity={0.7}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Confirm Booking</Text>

            {/* Summary */}
            <View style={s.summaryCard}>
              <SummaryRow label="Service"  value={selectedService?.name} />
              <SummaryRow label="Barber"   value={selectedBarber?.displayName || selectedBarber?.name} />
              <SummaryRow label="Date"     value={formatDate(selectedDate)} />
              <SummaryRow label="Time"     value={selectedSlot} />
              {selectedService?.price != null && (
                <SummaryRow label="Price" value={`£${Number(selectedService.price).toFixed(2)}`} />
              )}
            </View>

            {/* Contact details */}
            <Text style={s.label}>YOUR NAME</Text>
            <TextInput
              style={s.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Full name"
              placeholderTextColor={T.textFaint}
            />
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={guestEmail}
              onChangeText={setGuestEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={s.label}>PHONE <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={s.input}
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="07xxx xxxxxx"
              placeholderTextColor={T.textFaint}
              keyboardType="phone-pad"
            />
            <Text style={s.label}>NOTES <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything we should know…"
              placeholderTextColor={T.textFaint}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[s.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>CONFIRM BOOKING</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.backBtn} onPress={() => setStep(3)} activeOpacity={0.7}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }) {
  const { T } = useTheme();
  const sr = useMemo(() => makeSrStyles(T), [T]);
  return (
    <View style={sr.row}>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
    </View>
  );
}

function makeSrStyles(T) { return StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontFamily: 'Montserrat_700Bold', fontSize: 10, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase' },
  value: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: T.text, textAlign: 'right', flex: 1, marginLeft: 12 },
}); }

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function makeStyles(T) { return StyleSheet.create({
  safe:       { flex: 1, backgroundColor: T.bg },
  scroll:     { flex: 1 },
  stepWrap:   { padding: 20 },
  stepTitle:  { fontFamily: 'BebasNeue_400Regular', fontSize: 32, letterSpacing: 2, color: T.text, marginBottom: 4 },
  stepSub:    { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: T.textDim, marginBottom: 18 },
  empty:      { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: T.textDim, textAlign: 'center', marginTop: 30 },

  // Cards
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 10 },
  cardTitle:  { fontFamily: 'BebasNeue_400Regular', fontSize: 20, letterSpacing: 1, color: T.text, marginBottom: 2 },
  cardDesc:   { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: T.textDim, lineHeight: 18 },
  cardMeta:   { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaPrice:  { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: T.gold },
  metaDur:    { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: T.textDim },
  arrow:      { fontFamily: 'Montserrat_400Regular', fontSize: 22, color: T.red, marginLeft: 10 },

  barberThumb:           { width: 56, height: 56, borderRadius: 28, marginRight: 14, backgroundColor: T.card },
  barberThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  barberInitial:          { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: T.textDim },

  dateCard:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 10 },
  dateText:   { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: T.text },

  slotGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  slotChip:   { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 12 },
  slotText:   { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: T.text },

  summaryCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.red, padding: 16, marginBottom: 20 },

  label:      { fontFamily: 'Montserrat_700Bold', fontSize: 10, letterSpacing: 2, color: T.textDim, textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  optional:   { fontFamily: 'Montserrat_400Regular', color: T.textFaint, textTransform: 'none' },
  input:      { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, color: T.text, fontFamily: 'Montserrat_400Regular', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  textArea:   { height: 80, textAlignVertical: 'top' },

  primaryBtn:     { backgroundColor: T.red, paddingVertical: 16, alignItems: 'center', marginTop: 22, minHeight: 52, justifyContent: 'center' },
  primaryBtnText: { fontFamily: 'BebasNeue_400Regular', fontSize: 17, letterSpacing: 3, color: '#fff' },

  backBtn:     { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  backBtnText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, color: T.textDim },

  // Success
  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, letterSpacing: 2, color: T.text, marginBottom: 12, textAlign: 'center' },
  successBody:  { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: T.textDim, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  summaryBox:   { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, padding: 16, width: '100%', marginBottom: 24 },
  summaryLine:  { fontFamily: 'BebasNeue_400Regular', fontSize: 20, letterSpacing: 1, color: T.text },
  summaryMeta:  { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: T.textDim, marginTop: 4 },
}); }
