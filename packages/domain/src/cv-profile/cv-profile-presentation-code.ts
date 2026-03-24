const cvProfilePresentationCodeLength = 6;
const cvProfilePresentationCodePattern = /^[A-Z0-9]{6}$/;

const normalizeCvProfilePresentationCodeInput = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export const encodeCvProfilePresentationCode = (cvProfileId: string): string =>
  cvProfileId
    .replace(/-/g, "")
    .slice(-cvProfilePresentationCodeLength)
    .toUpperCase();

export const decodeCvProfilePresentationCode = (value: string): string | null => {
  const normalizedValue = normalizeCvProfilePresentationCodeInput(value);

  if (!cvProfilePresentationCodePattern.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
};

export const CvProfilePresentationCodeLength = cvProfilePresentationCodeLength;
