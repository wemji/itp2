import { useEffect } from 'react';

function fieldName(field) {
  const labelledBy = field.getAttribute('aria-labelledby');
  if (labelledBy) return document.getElementById(labelledBy)?.textContent?.trim() || 'this field';
  const label = field.labels?.[0];
  const textNode = label && [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  return (textNode?.textContent || field.getAttribute('aria-label') || field.name || 'this field').trim().toLowerCase();
}

function validationMessage(field) {
  const name = fieldName(field);
  const displayName = `${name[0]?.toUpperCase() || ''}${name.slice(1)}`;
  if (field.validity.valueMissing) return field.tagName === 'SELECT' ? `Select ${name}.` : `Enter ${name}.`;
  if (field.validity.typeMismatch && field.type === 'email') return 'Enter an email address in the format name@example.com.';
  if (field.validity.tooShort) return `${displayName} must contain at least ${field.minLength} characters.`;
  if (field.validity.tooLong) return `${displayName} must contain no more than ${field.maxLength} characters.`;
  if (field.validity.rangeUnderflow) return `${displayName} must be at least ${field.min}.`;
  if (field.validity.rangeOverflow) return `${displayName} must be no more than ${field.max}.`;
  if (field.validity.patternMismatch && field.inputMode === 'numeric') return 'Enter the complete 6-digit authenticator code.';
  if (field.validity.patternMismatch && field.type === 'password') return 'Use 8–128 characters with at least one letter and one number.';
  if (field.validity.patternMismatch) return `Enter a valid ${name}.`;
  return `Check ${name} and try again.`;
}

function clearFieldError(field) {
  field.setCustomValidity('');
  field.removeAttribute('aria-invalid');
  field.labels?.[0]?.removeAttribute('data-field-error');
}

export default function FormValidationEnhancer() {
  useEffect(() => {
    function handleInput(event) {
      if (event.target?.matches?.('input, textarea, select')) clearFieldError(event.target);
    }

    function handleInvalid(event) {
      const field = event.target;
      if (!field?.matches?.('input, textarea, select')) return;
      field.setCustomValidity('');
      const message = validationMessage(field);
      field.setCustomValidity(message);
      field.setAttribute('aria-invalid', 'true');
      field.labels?.[0]?.setAttribute('data-field-error', message);
    }

    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleInput, true);
    document.addEventListener('invalid', handleInvalid, true);
    return () => {
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('change', handleInput, true);
      document.removeEventListener('invalid', handleInvalid, true);
    };
  }, []);

  return null;
}
