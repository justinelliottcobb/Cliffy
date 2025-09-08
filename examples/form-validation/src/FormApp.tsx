/**
 * Form Validation Example - Advanced Cliffy Patterns
 * 
 * Demonstrates:
 * - Complex state management with multiple behaviors
 * - Form validation using geometric algebra
 * - Combining behaviors for derived state
 * - Error handling with When combinators
 */

import {
  jsx, jsxs,
  When, Map,
  createGeometricBehavior,
  GeometricBehavior,
  AlgebraicElement,
  Cliffy
} from '../../../cliffy-typescript/src/index';

const cliffy = new Cliffy('Cl(3,0)');

// Helper function for creating state behaviors
function createState<T>(initialValue: T) {
  let currentValue = initialValue;
  const subscribers: ((value: T) => void)[] = [];

  return {
    sample(): T { return currentValue; },
    
    map<U>(fn: (value: T) => U) {
      const mappedBehavior = createState(fn(currentValue));
      const updateMapped = (newValue: T) => {
        mappedBehavior.setValue(fn(newValue));
      };
      subscribers.push(updateMapped);
      return mappedBehavior;
    },
    
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>) {
      return fn(currentValue);
    },
    
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V) {
      const combinedBehavior = createState(fn(currentValue, other.sample()));
      const updateCombined = (newValue: T) => {
        combinedBehavior.setValue(fn(newValue, other.sample()));
      };
      subscribers.push(updateCombined);
      return combinedBehavior;
    },
    
    isActive(): boolean { return subscribers.length > 0; },
    
    setValue(newValue: T | ((prev: T) => T)): void {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(currentValue) : newValue;
      
      if (nextValue !== currentValue) {
        currentValue = nextValue;
        subscribers.forEach(subscriber => subscriber(nextValue));
      }
    }
  };
}

// FORM STATE - Each field is a geometric behavior
const emailState = createState<string>('');
const passwordState = createState<string>('');
const confirmPasswordState = createState<string>('');
const nameState = createState<string>('');
const ageState = createState<string>('');
const termsState = createState<boolean>(false);

// VALIDATION FUNCTIONS using Geometric Algebra concepts
const validateEmail = (email: string): { isValid: boolean; message: string } => {
  // Use geometric vector magnitude concept for validation strength
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email) && email.length > 0;
  
  return {
    isValid,
    message: isValid ? '' : 'Please enter a valid email address'
  };
};

const validatePassword = (password: string): { isValid: boolean; message: string; strength: number } => {
  // Calculate "geometric magnitude" of password strength
  let strength = 0;
  
  if (password.length >= 8) strength += 25;           // Length component
  if (/[A-Z]/.test(password)) strength += 25;        // Uppercase component  
  if (/[0-9]/.test(password)) strength += 25;        // Number component
  if (/[^A-Za-z0-9]/.test(password)) strength += 25; // Special character component
  
  return {
    isValid: strength >= 75,
    message: strength < 75 ? 'Password must be at least 8 characters with uppercase, number, and special character' : '',
    strength
  };
};

const validateAge = (age: string): { isValid: boolean; message: string } => {
  const ageNum = parseInt(age);
  const isValid = !isNaN(ageNum) && ageNum >= 13 && ageNum <= 120;
  
  return {
    isValid,
    message: isValid ? '' : 'Age must be between 13 and 120'
  };
};

// DERIVED VALIDATION BEHAVIORS
const emailValidation = emailState.map(validateEmail);
const passwordValidation = passwordState.map(validatePassword);
const ageValidation = ageState.map(validateAge);

// Password confirmation validation (combines two behaviors)
const passwordsMatch = passwordState.combine(
  confirmPasswordState,
  (password, confirm) => ({
    isValid: password === confirm && password.length > 0,
    message: password === confirm || confirm === '' ? '' : 'Passwords do not match'
  })
);

// Name validation
const nameValidation = nameState.map(name => ({
  isValid: name.trim().length >= 2,
  message: name.trim().length >= 2 ? '' : 'Name must be at least 2 characters'
}));

// Overall form validity (combines multiple behaviors)
const isFormValid = emailValidation.combine(
  passwordValidation.combine(
    passwordsMatch.combine(
      nameValidation.combine(
        ageValidation.combine(
          termsState,
          (age, terms) => age.isValid && terms
        ),
        (name, ageTerms) => name.isValid && ageTerms
      ),
      (passwords, nameAge) => passwords.isValid && nameAge
    ),
    (password, passwordsName) => password.isValid && passwordsName
  ),
  (email, rest) => email.isValid && rest
);

// FORM SUBMISSION BEHAVIOR
const isSubmitting = createState<boolean>(false);
const submitMessage = createState<string>('');

const handleSubmit = async () => {
  if (!isFormValid.sample()) {
    submitMessage.setValue('Please fix validation errors before submitting');
    return;
  }
  
  isSubmitting.setValue(true);
  submitMessage.setValue('');
  
  try {
    // Simulate API call with geometric transformation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    submitMessage.setValue('✅ Form submitted successfully!');
    
    // Reset form using identity transformations
    emailState.setValue('');
    passwordState.setValue('');
    confirmPasswordState.setValue('');
    nameState.setValue('');
    ageState.setValue('');
    termsState.setValue(false);
    
  } catch (error) {
    submitMessage.setValue('❌ Submission failed. Please try again.');
  } finally {
    isSubmitting.setValue(false);
  }
};

// UI COMPONENTS

const FormField = (props: {
  label: string;
  type: string;
  value: GeometricBehavior<string>;
  onChange: (value: string) => void;
  validation: GeometricBehavior<{ isValid: boolean; message: string }>;
  placeholder?: string;
}): AlgebraicElement => {
  const { label, type, value, onChange, validation, placeholder } = props;
  
  const hasError = validation.map(v => !v.isValid && v.message !== '');
  
  return jsx('div', {
    style: { marginBottom: '20px' },
    children: [
      jsx('label', {
        style: {
          display: 'block',
          marginBottom: '5px',
          fontWeight: 'bold',
          color: '#333'
        },
        children: label
      }),
      
      jsx('input', {
        type,
        placeholder: placeholder || `Enter ${label.toLowerCase()}`,
        value: value,
        onChange: (e: Event) => {
          const target = e.target as HTMLInputElement;
          onChange(target.value);
        },
        style: {
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          border: hasError.map(error => error ? '2px solid #f44336' : '1px solid #ddd'),
          borderRadius: '6px',
          backgroundColor: hasError.map(error => error ? '#ffebee' : 'white'),
          transition: 'all 0.2s ease'
        }
      }),
      
      When({
        condition: hasError,
        children: jsx('div', {
          style: {
            color: '#f44336',
            fontSize: '14px',
            marginTop: '5px',
            // Geometric shake animation for errors
            transform: hasError.map(error => {
              if (error) {
                const shake = Math.sin(Date.now() * 0.01) * 2;
                return cliffy.translator(shake, 0, 0);
              }
              return cliffy.scalar(1);
            })
          },
          children: validation.map(v => v.message)
        })
      })
    ]
  });
};

const PasswordStrengthIndicator = (): AlgebraicElement => {
  const strength = passwordValidation.map(v => v.strength);
  
  return jsx('div', {
    style: { margin: '10px 0' },
    children: [
      jsx('div', {
        style: {
          fontSize: '14px',
          marginBottom: '5px',
          color: strength.map(s => {
            if (s >= 75) return '#4CAF50';
            if (s >= 50) return '#FF9800';
            return '#f44336';
          })
        },
        children: strength.map(s => {
          if (s >= 75) return '🔒 Strong password';
          if (s >= 50) return '⚠️ Medium password';
          if (s > 0) return '❌ Weak password';
          return '';
        })
      }),
      
      jsx('div', {
        style: {
          width: '100%',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        },
        children: jsx('div', {
          style: {
            height: '100%',
            width: strength.map(s => `${s}%`),
            backgroundColor: strength.map(s => {
              if (s >= 75) return '#4CAF50';
              if (s >= 50) return '#FF9800';
              return '#f44336';
            }),
            transition: 'all 0.3s ease',
            // Geometric scaling based on strength
            transform: strength.map(s => cliffy.scalar(s / 100))
          }
        })
      })
    ]
  });
};

export const FormApp = (): AlgebraicElement => {
  return jsx('div', {
    style: {
      maxWidth: '500px',
      margin: '30px auto',
      padding: '30px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily: 'Arial, sans-serif'
    },
    children: [
      jsx('h1', {
        style: {
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          // Geometric transformation for header
          transform: cliffy.scalar(1.1)
        },
        children: 'User Registration Form'
      }),
      
      jsx('form', {
        onSubmit: (e: Event) => {
          e.preventDefault();
          handleSubmit();
        },
        children: [
          FormField({
            label: 'Full Name',
            type: 'text',
            value: nameState,
            onChange: (value) => nameState.setValue(value),
            validation: nameValidation,
            placeholder: 'Enter your full name'
          }),
          
          FormField({
            label: 'Email Address',
            type: 'email',
            value: emailState,
            onChange: (value) => emailState.setValue(value),
            validation: emailValidation,
            placeholder: 'your.email@example.com'
          }),
          
          FormField({
            label: 'Age',
            type: 'number',
            value: ageState,
            onChange: (value) => ageState.setValue(value),
            validation: ageValidation,
            placeholder: 'Enter your age'
          }),
          
          FormField({
            label: 'Password',
            type: 'password',
            value: passwordState,
            onChange: (value) => passwordState.setValue(value),
            validation: passwordValidation,
            placeholder: 'Create a strong password'
          }),
          
          PasswordStrengthIndicator(),
          
          FormField({
            label: 'Confirm Password',
            type: 'password',
            value: confirmPasswordState,
            onChange: (value) => confirmPasswordState.setValue(value),
            validation: passwordsMatch,
            placeholder: 'Confirm your password'
          }),
          
          // Terms checkbox
          jsx('div', {
            style: { margin: '20px 0' },
            children: [
              jsx('label', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                },
                children: [
                  jsx('input', {
                    type: 'checkbox',
                    checked: termsState,
                    onChange: (e: Event) => {
                      const target = e.target as HTMLInputElement;
                      termsState.setValue(target.checked);
                    },
                    style: { marginRight: '10px' }
                  }),
                  jsx('span', {
                    children: 'I agree to the Terms of Service and Privacy Policy'
                  })
                ]
              })
            ]
          }),
          
          // Submit button
          jsx('button', {
            type: 'submit',
            disabled: isFormValid.map(valid => !valid).combine(isSubmitting, (invalid, submitting) => invalid || submitting),
            style: {
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isFormValid.map(valid => valid ? '#4CAF50' : '#ccc'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isFormValid.map(valid => valid ? 'pointer' : 'not-allowed'),
              // Geometric pulsing animation when submitting
              transform: isSubmitting.map(submitting => {
                if (submitting) {
                  const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.05;
                  return cliffy.scalar(pulse);
                }
                return cliffy.scalar(1);
              }),
              transition: 'all 0.3s ease'
            },
            children: isSubmitting.map(submitting => 
              submitting ? '⏳ Submitting...' : 'Create Account'
            )
          }),
          
          // Submit message
          When({
            condition: submitMessage.map(msg => msg !== ''),
            children: jsx('div', {
              style: {
                marginTop: '20px',
                padding: '15px',
                borderRadius: '6px',
                textAlign: 'center',
                backgroundColor: submitMessage.map(msg => 
                  msg.includes('✅') ? '#e8f5e8' : '#ffebee'
                ),
                color: submitMessage.map(msg => 
                  msg.includes('✅') ? '#2e7d32' : '#c62828'
                )
              },
              children: submitMessage
            })
          })
        ]
      }),
      
      // Learning notes
      jsx('div', {
        style: {
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f0f7ff',
          borderRadius: '8px',
          fontSize: '14px'
        },
        children: [
          jsx('h3', {
            style: { margin: '0 0 15px 0', color: '#1565c0' },
            children: '🎓 Form Validation Concepts:'
          }),
          jsx('ul', {
            style: { margin: '0', paddingLeft: '20px', lineHeight: '1.6' },
            children: [
              jsx('li', { children: 'Multiple interconnected geometric behaviors' }),
              jsx('li', { children: 'Combining behaviors for complex validation logic' }),
              jsx('li', { children: 'Real-time validation feedback with visual transforms' }),
              jsx('li', { children: 'Geometric animations for error states and loading' }),
              jsx('li', { children: 'Form submission with async state management' })
            ]
          })
        ]
      })
    ]
  });
};

export default FormApp;