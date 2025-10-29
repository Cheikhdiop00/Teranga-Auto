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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserType, MECHANIC_SPECIALTIES } from '@/types/database';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function RegisterScreen() {
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

  useEffect(() => {
    if (userType !== 'mechanic') {
      setMechanicSpecialty(null);
      setIdCardNumber('');
      setShowSpecialtyPicker(false);
    }
  }, [userType]);

  const handleRegister = async () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
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
    if (!password) { setPasswordError('Le mot de passe est requis'); valid = false; }
    else if (password.length < 6) { setPasswordError('Au moins 6 caractères'); valid = false; }
    if (!confirmPassword) { setConfirmPasswordError('La confirmation est requise'); valid = false; }
    else if (password !== confirmPassword) { setConfirmPasswordError('Les mots de passe ne correspondent pas'); valid = false; }
    if (userType === 'mechanic') {
      if (!mechanicSpecialty) { setIdCardError('Sélectionnez une spécialité et un numéro'); valid = false; }
      if (!idCardNumber.trim()) { setIdCardError('Le numéro d\'identité est requis'); valid = false; }
    }

    if (!valid) return;

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <ArrowLeft color="#FFFFFF" size={16} />
          </TouchableOpacity>
          <Text style={styles.logo}>TerangaAuto</Text>
          <Text style={styles.subtitle}>Créer un compte</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.userTypeContainer}>
            <Text style={styles.inputLabel}>Type d'utilisateur</Text>
            <TouchableOpacity
              style={[styles.input, styles.userTypeInput]}
              onPress={() => setShowUserTypePicker((prev) => !prev)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.userTypeValue}>
                {userType === 'client' ? 'Client' : 'Mécanicien'}
              </Text>
              <Text style={styles.userTypeArrow}>{showUserTypePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showUserTypePicker && (
              <View style={styles.userTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.userTypeOption,
                    userType === 'client' && styles.userTypeOptionActive,
                  ]}
                  onPress={() => {
                    setUserType('client');
                    setShowUserTypePicker(false);
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.userTypeOptionText,
                      userType === 'client' && styles.userTypeOptionTextActive,
                    ]}
                  >
                    Client
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeOption,
                    userType === 'mechanic' && styles.userTypeOptionActive,
                  ]}
                  onPress={() => {
                    setUserType('mechanic');
                    setShowUserTypePicker(false);
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.userTypeOptionText,
                      userType === 'mechanic' && styles.userTypeOptionTextActive,
                    ]}
                  >
                    Mécanicien
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {userType === 'mechanic' && (
            <View style={styles.specialtyContainer}>
              <Text style={styles.inputLabel}>Spécialité</Text>
              <TouchableOpacity
                style={[styles.input, styles.userTypeInput]}
                onPress={() => setShowSpecialtyPicker((prev) => !prev)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.userTypeValue,
                    !mechanicSpecialty && styles.placeholderText,
                  ]}
                >
                  {mechanicSpecialty ?? 'Sélectionner une spécialité'}
                </Text>
                <Text style={styles.userTypeArrow}>{showSpecialtyPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showSpecialtyPicker && (
                <View style={styles.userTypeOptions}>
                  {MECHANIC_SPECIALTIES.map((specialty) => (
                    <TouchableOpacity
                      key={specialty}
                      style={[
                        styles.userTypeOption,
                        mechanicSpecialty === specialty && styles.userTypeOptionActive,
                      ]}
                      onPress={() => {
                        setMechanicSpecialty(specialty);
                        setShowSpecialtyPicker(false);
                      }}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.userTypeOptionText,
                          mechanicSpecialty === specialty && styles.userTypeOptionTextActive,
                        ]}
                      >
                        {specialty}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={styles.inputLabel}>Prénom</Text>
          <TextInput
            style={[styles.input, firstNameError && styles.inputError]}
            placeholder="Saisissez votre prénom"
            value={firstName}
            onChangeText={setFirstName}
            editable={!loading}
          />
          {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}

          <Text style={styles.inputLabel}>Nom</Text>
          <TextInput
            style={[styles.input, lastNameError && styles.inputError]}
            placeholder="Saisissez votre nom"
            value={lastName}
            onChangeText={setLastName}
            editable={!loading}
          />
          {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}

          <Text style={styles.inputLabel}>Téléphone</Text>
          <TextInput
            style={[styles.input, phoneError && styles.inputError]}
            placeholder="Indiquez votre numéro de téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

          <Text style={styles.inputLabel}>Adresse</Text>
          <TextInput
            style={[styles.input, addressError && styles.inputError]}
            placeholder="Renseignez votre adresse"
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />
          {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}

          {userType === 'mechanic' && (
            <>
              <Text style={styles.inputLabel}>Numéro d'identité</Text>
              <TextInput
                style={[styles.input, idCardError && styles.inputError]}
                placeholder="Saisissez votre numéro d'identité"
                value={idCardNumber}
                onChangeText={setIdCardNumber}
                editable={!loading}
                keyboardType="default"
              />
              {idCardError ? <Text style={styles.errorText}>{idCardError}</Text> : null}
            </>
          )}

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={[styles.input, emailError && styles.inputError]}
            placeholder="Entrez votre adresse email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <Text style={styles.inputLabel}>Mot de passe</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
              placeholder="Créez un mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword((p) => !p)}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} color="#666666" /> : <Eye size={20} color="#666666" />}
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput, confirmPasswordError && styles.inputError]}
              placeholder="Confirmez votre mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword((p) => !p)}
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff size={20} color="#666666" /> : <Eye size={20} color="#666666" />}
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Inscription...' : "S'inscrire"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.link}>
              Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#BBD4FF',
  },
  form: {
    width: '100%',
  },
  userTypeContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
    marginLeft: 4,
  },
  userTypeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    height: 48,
    marginBottom: 16,
  },
  userTypeValue: {
    fontSize: 14,
    color: '#333333',
  },
  userTypeArrow: {
    fontSize: 14,
    color: '#6B7C9C',
  },
  userTypeOptions: {
    marginTop: 8,
    backgroundColor: '#E8F1FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBD4FF',
    overflow: 'hidden',
  },
  userTypeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userTypeOptionActive: {
    backgroundColor: '#D4E5FF',
  },
  userTypeOptionText: {
    fontSize: 16,
    color: '#0A1F44',
  },
  userTypeOptionTextActive: {
    color: '#0A1F44',
    fontWeight: '600',
  },
  specialtyContainer: {
    marginBottom: 16,
  },
  placeholderText: {
    color: '#999999',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#333333',
    height: 48,
    width: '100%',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  passwordInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  button: {
    backgroundColor: '#0A1F44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#666666',
  },
  linkBold: {
    color: '#0A1F44',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
