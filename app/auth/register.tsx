import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserType, MECHANIC_SPECIALTIES } from '@/types/database';
import { ArrowLeft, Eye, EyeOff, Camera, Image as ImageIcon, ChevronLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen() {
  // Flow step: 1 => Infos de base; 2 => Mot de passe + Photo
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [userType, setUserType] = useState<UserType>('client');
  const [mechanicSpecialty, setMechanicSpecialty] = useState<(typeof MECHANIC_SPECIALTIES)[number] | null>(null);
  const [idCardNumber, setIdCardNumber] = useState('');
  const [showUserTypePicker, setShowUserTypePicker] = useState(false);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [idCardError, setIdCardError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (userType !== 'mechanic') {
      setMechanicSpecialty(null);
      setIdCardNumber('');
      setShowSpecialtyPicker(false);
    }
  }, [userType]);

  const validateStep1 = () => {
    setEmailError('');
    setFirstNameError('');
    setLastNameError('');
    setPhoneError('');
    setAddressError('');
    setIdCardError('');

    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!firstName.trim()) { setFirstNameError('Le prénom est requis'); valid = false; }
    if (!lastName.trim()) { setLastNameError('Le nom est requis'); valid = false; }
    if (!phone.trim()) { setPhoneError('Le téléphone est requis'); valid = false; }
    if (!address.trim()) { setAddressError('L\'adresse est requise'); valid = false; }
    if (!email.trim()) { setEmailError('L\'email est requis'); valid = false; }
    else if (!emailRegex.test(email)) { setEmailError('Format d\'email invalide'); valid = false; }
    if (userType === 'mechanic') {
      if (!mechanicSpecialty) { setIdCardError('Sélectionnez une spécialité'); valid = false; }
      if (!idCardNumber.trim()) { setIdCardError('Le numéro d\'identité est requis'); valid = false; }
    }
    return valid;
  };

  const validateStep2 = () => {
    setPasswordError('');
    setConfirmPasswordError('');
    let valid = true;
    if (!password) { setPasswordError('Le mot de passe est requis'); valid = false; }
    else if (password.length < 6) { setPasswordError('Au moins 6 caractères'); valid = false; }
    if (!confirmPassword) { setConfirmPasswordError('La confirmation est requise'); valid = false; }
    else if (password !== confirmPassword) { setConfirmPasswordError('Les mots de passe ne correspondent pas'); valid = false; }
    return valid;
  };

  const goNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepHeader}>
      {step === 2 && (
        <TouchableOpacity onPress={goBack} disabled={loading} style={styles.backBtn}>
          <ChevronLeft size={22} color="#0A1F44" />
        </TouchableOpacity>
      )}
      <Text style={styles.stepTitle}>Inscription</Text>
      <Text style={styles.stepSubtitle}>{step === 1 ? 'Étape 1/2 — Informations' : 'Étape 2/2 — Sécurité & Photo'}</Text>
    </View>
  );

  const goBack = () => {
    if (step === 2 && !loading) setStep(1);
  };

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1], mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {}
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {}
  };

  const handleRegister = async () => {
    if (step === 1) {
      goNext();
      return;
    }

    if (!validateStep2()) return;

    setLoading(true);
    try {
      await signUp(email, password, {
        firstName,
        lastName,
        phone,
        address,
        userType,
        idCardNumber: userType === 'mechanic' ? idCardNumber : undefined,
        specialties:
          userType === 'mechanic' && mechanicSpecialty
            ? [mechanicSpecialty]
            : undefined,
      });

      // TODO: Upload photoUri to server if endpoint available.

      Alert.alert('Succès', 'Compte créé avec succès !', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StepIndicator />

        {step === 1 ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, firstNameError && styles.inputError]}
                placeholder="Prénom"
                value={firstName}
                onChangeText={setFirstName}
              />
              {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, lastNameError && styles.inputError]}
                placeholder="Nom"
                value={lastName}
                onChangeText={setLastName}
              />
              {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, phoneError && styles.inputError]}
                placeholder="Téléphone"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, addressError && styles.inputError]}
                placeholder="Adresse"
                value={address}
                onChangeText={setAddress}
              />
              {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.pickerRow}>
              <TouchableOpacity style={[styles.typePill, userType === 'client' && styles.typePillActive]} onPress={() => setUserType('client')}>
                <Text style={[styles.typePillText, userType === 'client' && styles.typePillTextActive]}>Client</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typePill, userType === 'mechanic' && styles.typePillActive]} onPress={() => setUserType('mechanic')}>
                <Text style={[styles.typePillText, userType === 'mechanic' && styles.typePillTextActive]}>Mécanicien</Text>
              </TouchableOpacity>
            </View>

            {userType === 'mechanic' && (
              <View>
                <View style={styles.inputContainer}>
                  <Text style={styles.specialtyLabel}>Spécialité</Text>
                  <View style={styles.chipsContainer}>
                    {MECHANIC_SPECIALTIES.map((spec) => (
                      <TouchableOpacity
                        key={spec}
                        style={[styles.chip, mechanicSpecialty === spec && styles.chipActive]}
                        onPress={() => setMechanicSpecialty(spec)}
                        disabled={loading}
                      >
                        <Text style={[styles.chipText, mechanicSpecialty === spec && styles.chipTextActive]}>
                          {spec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, idCardError && styles.inputError]}
                    placeholder="N° d'identité (mécanicien)"
                    value={idCardNumber}
                    onChangeText={setIdCardNumber}
                  />
                  {idCardError ? <Text style={styles.errorText}>{idCardError}</Text> : null}
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={goNext} disabled={loading}>
              <Text style={styles.buttonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Passwords (dernière étape) */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
                  placeholder="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#666666" />
                  ) : (
                    <Eye size={20} color="#666666" />
                  )}
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, confirmPasswordError && styles.inputError]}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#666666" />
                  ) : (
                    <Eye size={20} color="#666666" />
                  )}
                </TouchableOpacity>
              </View>
              {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            </View>

            {/* Photo de profil */}
            <View style={styles.photoSection}>
              <Text style={styles.photoLabel}>Photo de profil (optionnel)</Text>
              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoButton} onPress={pickImageFromLibrary}>
                  <ImageIcon size={18} color="#0A1F44" />
                  <Text style={styles.photoButtonText}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Camera size={18} color="#0A1F44" />
                  <Text style={styles.photoButtonText}>Caméra</Text>
                </TouchableOpacity>
              </View>
              {photoUri ? (
                <View style={styles.photoPreviewWrapper}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                    <Text style={styles.removePhotoText}>Retirer</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Création...' : "Créer mon compte"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 2,
    padding: 6,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A1F44',
  },
  stepSubtitle: {
    marginTop: 4,
    color: '#666',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E6E8EC',
    fontSize: 15,
    color: '#0A1F44',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0A1F44',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  typePillActive: {
    backgroundColor: '#0A1F44',
  },
  typePillText: {
    color: '#0A1F44',
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
    padding: 6,
  },
  button: {
    backgroundColor: '#0A1F44',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  specialtyLabel: {
    color: '#0A1F44',
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0A1F44',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#0A1F44',
  },
  chipText: {
    color: '#0A1F44',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  photoSection: {
    marginTop: 6,
  },
  photoLabel: {
    color: '#0A1F44',
    fontWeight: '600',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E6E8EC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F7F8FA',
  },
  photoButtonText: {
    color: '#0A1F44',
    fontWeight: '600',
  },
  photoPreviewWrapper: {
    marginTop: 12,
    alignItems: 'center',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removePhotoBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  removePhotoText: {
    color: '#333',
  },
  linkBold: {
    color: '#0A1F44',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
