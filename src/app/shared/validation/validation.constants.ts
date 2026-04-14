export const VALIDATION_LIMITS = {
  temperature: { min: -10, max: 80 },
  humidity: { min: 0, max: 100 },
  current: { min: 0, max: 100 },
  appointmentHour: { min: '08:00', max: '17:00' },
  password: { minLength: 8, maxLength: 64 },
  phone: { minDigits: 7, maxDigits: 15 },
  text: { short: 2, medium: 3, long: 120, message: 500 },
  observation: { maxLength: 280 },
  age: { min: 18, max: 100 },
} as const;

export const VALIDATION_PATTERNS = {
  passwordStrong:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]).+$/,
  phone: /^\+?[0-9\s()-]{7,20}$/,
  digitsOnly: /^\d+$/,
  personName: /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$/,
} as const;

export const VALIDATION_MESSAGES = {
  required: 'Este campo es obligatorio.',
  email: 'Ingresa un correo electronico valido.',
  trimmedRequired: 'Este campo no puede quedar vacio.',
  invalidNumber: 'Ingresa un numero valido.',
  invalidPhone: 'Ingresa un telefono valido.',
  passwordStrength:
    'La contrasena debe incluir mayuscula, minuscula, numero y caracter especial.',
  passwordMismatch: 'Las contrasenas no coinciden.',
  futureDate: 'La fecha no puede ser futura.',
  pastDate: 'La fecha no puede ser pasada.',
  invalidTimeRange: 'La hora debe estar entre las 08:00 y las 17:00.',
  invalidPersonName: 'Solo se permiten letras y espacios.',
} as const;
